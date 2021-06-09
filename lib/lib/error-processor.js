'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processorTransformFactory = exports.FilterChain = void 0;
const httpx = require('httpx');
const cheerio = require('cheerio');
const detectMocha = require('detect-mocha');
const logger_1 = __importDefault(require("../common/logger"));
const stream_1 = require("stream");
const { unrefTimeout } = require('./utils/unref-timeout');
const _ = require('lodash');
class FilterChain {
    constructor(options = {}) {
        this.processors = [
            new PuppeteerInvalidPlatformProcessor(options),
            new DynamicLinkLibraryMissingProcessor(options),
            new NoSpaceLeftOnDeviceProcessor(options),
            new MissingAptGetProcessor(options),
            new DockerNotStartedOrInstalledErrorProcessor(options),
            new FcServiceNotEnabledProcessor(options),
            new RamInactiveErrorProcessor(options),
            new LogInactiveErrorProcessor(options),
            new ClientTimeoutErrorProcessor(options)
        ];
    }
    process(message, err) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const processor of this.processors) {
                if (!message) {
                    message = '';
                }
                if (processor.match(message, err)) {
                    yield processor.process(message, err);
                    yield processor.postProcess();
                    return true;
                }
            }
        });
    }
}
exports.FilterChain = FilterChain;
class ErrorProcessor {
    constructor(options) {
        this.serviceName = options === null || options === void 0 ? void 0 : options.serviceName;
        this.functionName = options === null || options === void 0 ? void 0 : options.functionName;
    }
    match(message, err) { }
    process(message, err) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    _autoExist() {
        process.nextTick(() => {
            logger_1.default.log('\nFc will auto exit after 3 seconds.\n', 'red');
            if (!detectMocha()) {
                unrefTimeout(() => {
                    // @ts-ignore
                    process.emit('SIGINT');
                }, 3000);
            }
        });
    }
    postProcess() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log();
        });
    }
}
class ClientTimeoutErrorProcessor extends ErrorProcessor {
    match(message, err) {
        return _.includes(message, 'ReadTimeout(');
    }
    process(message) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.log(`The timeout of API request has been detected.`, 'red');
        });
    }
}
class DockerNotStartedOrInstalledErrorProcessor extends ErrorProcessor {
    match(message, err) {
        if (_.includes(message, 'connect ECONNREFUSED /var/run/docker.sock')
            || _.includes(message, 'Error: connect ENOENT //./pipe/docker_engine')) {
            return true;
        }
        return false;
    }
    process(message) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.log('Fc detected that Docker is not installed on your host or not started. Please run \'docker ps\' command to check docker status.');
        });
    }
}
class FcServiceNotEnabledProcessor extends ErrorProcessor {
    match(message, err) {
        if (_.includes(message, 'FC service is not enabled for current user')) {
            return true;
        }
        return false;
    }
    process(message) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.log('FC service is not enabled for current user. Please enable FC service before using fc.\nYou can enable FC service on this page https://www.aliyun.com/product/fc .');
        });
    }
}
class RamInactiveErrorProcessor extends ErrorProcessor {
    match(message, err) {
        return (_.includes(message, 'Account is inactive to this service') && _.includes(message, 'ram.aliyuncs.com'));
    }
    process(message) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.log('Ram service is not enabled for current user. Please enable Ram service before using fc.\nYou can enable Ram service on this page https://www.aliyun.com/product/ram .');
        });
    }
}
class LogInactiveErrorProcessor extends ErrorProcessor {
    match(message, err) {
        return err && err.code === 'InvalidAccessKeyId' && _.includes(message, 'AccessKeyId') && _.includes(message, 'is inactive');
    }
    process(message) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.log('\nPlease go to https://sls.console.aliyun.com/ to open the LogServce.');
        });
    }
}
// 发生在 s build 安装依赖，但是依赖包含解决方案，比如 puppeteer，需要使用 apt-get 安装，如果宿主机没有，那就提示使用 s build -d
class MissingAptGetProcessor extends ErrorProcessor {
    match(message) {
        return _.includes(message, 'touch: /var/cache/apt/pkgcache.bin: No such file or directory');
    }
    process(message) {
        return __awaiter(this, void 0, void 0, function* () {
            process.nextTick(() => {
                logger_1.default.log(`Tips: Fc has detected that there is no apt-get installed on the machine, you need use 's build --use-docker' to reinstall.
Type 's build -h' for more help.`);
            });
        });
    }
}
class NoSpaceLeftOnDeviceProcessor extends ErrorProcessor {
    match(message) {
        return _.includes(message, 'no space left on device');
    }
    process(message) {
        return __awaiter(this, void 0, void 0, function* () {
            process.nextTick(() => {
                logger_1.default.log(`Tips: Fc has detected that docker is no space left. 
if You are using Docker for Windows/Mac, you can select the Docker icon and then Preferences > Resources > Advanced and increase docker image size.
Please refer to https://docs.docker.com/docker-for-mac/space/ for more help.
`);
            });
        });
    }
}
class DynamicLinkLibraryMissingProcessor extends ErrorProcessor {
    constructor(options) {
        super(options);
        this.prefix = 'error while loading shared libraries: ';
        this.suffix = ': cannot open shared object file: No such file or directory';
        this.debianPakcageUrlPrefix = 'https://packages.debian.org/search?lang=en&suite=jessie&arch=amd64&mode=path&searchon=contents&keywords=';
        this.libPrefixWhiteList = ['/usr/lib/x86_64-linux-gnu', '/lib/x86_64-linux-gnu', '/usr/local/lib'];
    }
    match(message) {
        return _.includes(message, this.prefix)
            && _.includes(message, this.suffix);
    }
    _findPackageByDlName(lib) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield httpx.request(`${this.debianPakcageUrlPrefix}${lib}`, { timeout: 10000 });
            const body = yield httpx.read(response, 'utf8');
            const $ = cheerio.load(body);
            const packagesTable = $('#pcontentsres table tbody tr').map((i, element) => ({
                path: $(element).find('td:nth-of-type(1)').text().trim(),
                name: $(element).find('td:nth-of-type(2)').text().trim()
            })).get();
            const packageInfo = _.find(packagesTable, info => _.some(this.libPrefixWhiteList, (prefix) => info.path.startsWith(prefix)));
            if (packageInfo) {
                return packageInfo.name;
            }
            return null;
        });
    }
    _fetchDlName(message) {
        return __awaiter(this, void 0, void 0, function* () {
            // error while loading shared libraries: libnss3.so: cannot open shared object file: No such file or directory
            const prefixIdx = message.indexOf(this.prefix);
            const suffixIdx = message.indexOf(this.suffix);
            return message.substring(prefixIdx + this.prefix.length, suffixIdx);
        });
    }
    process(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const lib = yield this._fetchDlName(message);
            const packageName = yield this._findPackageByDlName(lib);
            if (packageName) {
                process.nextTick(() => {
                    logger_1.default.log(`Tips: Fc has detected that you are missing ${lib} library, you can try to install it like this:

  step1: s build sbox -f ${this.serviceName}/${this.functionName} -i
  step2: fun-install apt-get install ${packageName}
  step3: type 'exit' to exit container and then reRun your function

Also you can install dependencies through one command:

  s build sbox -f ${this.serviceName}/${this.functionName} --cmd 'fun-install apt-get install ${packageName}'
`);
                });
            }
            else {
                logger_1.default.log(`Tips: Fc has detected that you are missing ${lib} library, you can try to install it like this:

  step1: open this page ${this.debianPakcageUrlPrefix}${lib} to find your missing dependency
  step2: s install sbox -f ${this.serviceName}/${this.functionName} -i
  step3: fun-install apt-get install YourPackageName
  step4: type 'exit' to exit container and then reRun your function

Also you can install dependencies through one command:

  s install sbox -f ${this.serviceName}/${this.functionName} --cmd 'fun-install apt-get install YourPackageName'
`);
            }
            this._autoExist();
        });
    }
}
class PuppeteerInvalidPlatformProcessor extends ErrorProcessor {
    match(message) {
        return _.includes(message, 'Error: Chromium revision is not downloaded. Run "npm install" or "yarn install"');
    }
    process(message) {
        return __awaiter(this, void 0, void 0, function* () {
            process.nextTick(() => {
                logger_1.default.log(`Tips: Fc has detected that your puppeteer installation platform is incorrect. 
Please reinstall it like this:

1. s install sbox -f ${this.serviceName}/${this.functionName} -i
2. fun-install npm install puppeteer
3. type 'exit' to exit container and then reRun your function

Also you can install puppeteer through one command: 
s install sbox -f puppeteer/html2png --cmd 'fun-install npm install puppeteer'`);
                this._autoExist();
            });
        });
    }
}
class ChunkSplitTransform extends stream_1.Transform {
    constructor(options) {
        super(options);
        this._buffer = '';
        this._separator = options.separator || '\n';
    }
    _transform(chunk, encoding, done) {
        let sepPos;
        this._buffer += chunk.toString();
        while ((sepPos = this._buffer.indexOf(this._separator)) !== -1) {
            const portion = this._buffer.substr(0, sepPos);
            this.push(portion + this._separator);
            this._buffer = this._buffer.substr(sepPos + this._separator.length);
        }
        done();
    }
    _flush(done) {
        this.push(this._buffer);
        done();
    }
}
class FcErrorTransform extends stream_1.Transform {
    constructor(options) {
        super(options);
        this.filterChain = new FilterChain(options);
    }
    _transform(chunk, encoding, done) {
        const message = chunk.toString();
        this.filterChain.process(message).then(() => {
            this.push(message);
            done();
        });
    }
}
function processorTransformFactory({ serviceName, functionName, errorStream }) {
    const transform = new ChunkSplitTransform({
        separator: '\n'
    });
    transform.pipe(new FcErrorTransform({
        serviceName: serviceName,
        functionName: functionName
    })).pipe(errorStream);
    return transform;
}
exports.processorTransformFactory = processorTransformFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3ItcHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9lcnJvci1wcm9jZXNzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7QUFFYixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUU1Qyw4REFBc0M7QUFDdEMsbUNBQW9DO0FBQ3BDLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUUxRCxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFNUIsTUFBYSxXQUFXO0lBRXRCLFlBQVksT0FBTyxHQUFHLEVBQUU7UUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRztZQUNoQixJQUFJLGlDQUFpQyxDQUFDLE9BQU8sQ0FBQztZQUM5QyxJQUFJLGtDQUFrQyxDQUFDLE9BQU8sQ0FBQztZQUMvQyxJQUFJLDRCQUE0QixDQUFDLE9BQU8sQ0FBQztZQUN6QyxJQUFJLHNCQUFzQixDQUFDLE9BQU8sQ0FBQztZQUNuQyxJQUFJLHlDQUF5QyxDQUFDLE9BQU8sQ0FBQztZQUN0RCxJQUFJLDRCQUE0QixDQUFDLE9BQU8sQ0FBQztZQUN6QyxJQUFJLHlCQUF5QixDQUFDLE9BQU8sQ0FBQztZQUN0QyxJQUFJLHlCQUF5QixDQUFDLE9BQU8sQ0FBQztZQUN0QyxJQUFJLDJCQUEyQixDQUFDLE9BQU8sQ0FBQztTQUN6QyxDQUFDO0lBQ0osQ0FBQztJQUVLLE9BQU8sQ0FBQyxPQUFZLEVBQUUsR0FBUzs7WUFDbkMsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUN2QyxJQUFJLENB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