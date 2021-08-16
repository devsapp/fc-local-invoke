'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const path = __importStar(require("path"));
const _ = __importStar(require("lodash"));
const docker = __importStar(require("../docker/docker"));
const logger_1 = __importDefault(require("../../common/logger"));
const dockerOpts = __importStar(require("../docker/docker-opts"));
const fs = __importStar(require("fs-extra"));
const uuid_1 = require("uuid");
const rimraf = __importStar(require("rimraf"));
const extract = require("extract-zip");
const tmpDir = __importStar(require("temp-dir"));
const devs_1 = require("../devs");
const runtime_1 = require("../common/model/runtime");
const docker_1 = require("../docker/docker");
const value_1 = require("../utils/value");
const ignore_1 = require("../ignore");
const fse = __importStar(require("fs-extra"));
function isZipArchive(codeUri) {
    return codeUri ? codeUri.endsWith('.zip') || codeUri.endsWith('.jar') || codeUri.endsWith('.war') : false;
}
function processZipCodeIfNecessary(codeUri) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isZipArchive(codeUri)) {
            return null;
        }
        const tmpCodeDir = path.join(tmpDir, uuid_1.v4());
        yield fs.ensureDir(tmpCodeDir);
        logger_1.default.log(`codeUri is a zip format, will unzipping to ${tmpCodeDir}`);
        yield extract(codeUri, { dir: tmpCodeDir });
        return tmpCodeDir;
    });
}
class Invoke {
    constructor(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir) {
        this.creds = creds;
        this.region = region;
        this.serviceName = serviceConfig.name;
        this.serviceConfig = serviceConfig;
        this.functionName = functionConfig.name;
        this.functionConfig = functionConfig;
        this.triggerConfig = triggerConfig;
        this.debugPort = debugPort;
        this.debugIde = debugIde;
        this.nasBaseDir = nasBaseDir;
        this.runtime = this.functionConfig.runtime;
        this.baseDir = baseDir;
        this.codeUri = this.functionConfig.codeUri ? path.resolve(this.baseDir, this.functionConfig.codeUri) : null;
        this.tmpDir = tmpDir;
        this.debuggerPath = debuggerPath;
        this.debugArgs = debugArgs;
    }
    invoke(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.inited) {
                yield this.init();
            }
            yield this.beforeInvoke();
            yield this.setDebugIdeConfig();
            // @ts-ignore
            yield this.doInvoke(req, res);
            yield this.afterInvoke();
        });
    }
    init() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.nasConfig = (_a = this.serviceConfig) === null || _a === void 0 ? void 0 : _a.nasConfig;
            this.dockerUser = yield dockerOpts.resolveDockerUser({ nasConfig: this.nasConfig });
            this.nasMounts = yield docker.resolveNasConfigToMounts(this.baseDir, this.serviceName, this.nasConfig, this.nasBaseDir || path.join(this.baseDir, devs_1.DEFAULT_NAS_PATH_SUFFIX));
            this.unzippedCodeDir = yield processZipCodeIfNecessary(this.codeUri);
            this.codeMount = yield docker.resolveCodeUriToMount(this.unzippedCodeDir || this.codeUri);
            // TODO: 支持 nas mapping yaml file
            // this.nasMappingsMount = await docker.resolveNasYmlToMount(this.baseDir, this.serviceName);
            this.tmpDirMount = (!process.env.DISABLE_BIND_MOUNT_TMP_DIR || value_1.isFalseValue(process.env.DISABLE_BIND_MOUNT_TMP_DIR)) ? yield docker.resolveTmpDirToMount(this.tmpDir) : null;
            this.debuggerMount = yield docker.resolveDebuggerPathToMount(this.debuggerPath);
            this.passwdMount = yield docker.resolvePasswdMount();
            // const allMount = _.compact([this.codeMount, ...this.nasMounts, ...this.nasMappingsMount, this.passwdMount]);
            const allMount = _.compact([this.codeMount, ...this.nasMounts, this.passwdMount]);
            if (!_.isEmpty(this.tmpDirMount)) {
                allMount.push(this.tmpDirMount);
            }
            if (!_.isEmpty(this.debuggerMount)) {
                allMount.push(this.debuggerMount);
            }
            const isDockerToolBox = yield docker.isDockerToolBoxAndEnsureDockerVersion();
            if (isDockerToolBox) {
                this.mounts = dockerOpts.transformMountsForToolbox(allMount);
            }
            else {
                this.mounts = allMount;
            }
            logger_1.default.debug(`docker mounts: ${JSON.stringify(this.mounts, null, 4)}`);
            this.containerName = docker.generateRamdomContainerName();
            const isCustomContainer = runtime_1.isCustomContainerRuntime(this.runtime);
            if (isCustomContainer) {
                this.imageName = this.functionConfig.customContainerConfig.image;
            }
            else {
                this.imageName = yield dockerOpts.resolveRuntimeToDockerImage(this.runtime);
            }
            yield docker.pullImageIfNeed(this.imageName, !isCustomContainer);
            this.inited = true;
        });
    }
    beforeInvoke() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    setDebugIdeConfig() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debugPort && this.debugIde) {
                if (this.debugIde.toLowerCase() === 'vscode') {
                    // try to write .vscode/config.json
                    yield docker_1.writeDebugIdeConfigForVscode(this.baseDir, this.serviceName, this.functionName, this.runtime, ((_a = this.functionConfig) === null || _a === void 0 ? void 0 : _a.originalCodeUri) ? path.join(this.baseDir, this.functionConfig.originalCodeUri) : null, this.debugPort);
                }
                else if (this.debugIde.toLowerCase() === 'pycharm') {
                    yield docker.showDebugIdeTipsForPycharm(((_b = this.functionConfig) === null || _b === void 0 ? void 0 : _b.originalCodeUri) ? path.join(this.baseDir, this.functionConfig.originalCodeUri) : null, this.debugPort);
                }
            }
        });
    }
    cleanUnzippedCodeDir() {
        if (this.unzippedCodeDir) {
            rimraf.sync(this.unzippedCodeDir);
            console.log(`clean tmp code dir ${this.unzippedCodeDir} successfully`);
            this.unzippedCodeDir = null;
        }
    }
    afterInvoke() {
        return __awaiter(this, void 0, void 0, function* () {
            this.cleanUnzippedCodeDir();
        });
    }
    getCodeIgnore() {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const ignoreFileInCodeUri = path.join(path.resolve(this.baseDir, (_a = this.functionConfig) === null || _a === void 0 ? void 0 : _a.codeUri), '.fcignore');
            if (fse.pathExistsSync(ignoreFileInCodeUri) && fse.lstatSync(ignoreFileInCodeUri).isFile()) {
                return yield ignore_1.isIgnoredInCodeUri(path.resolve(this.baseDir, (_b = this.functionConfig) === null || _b === void 0 ? void 0 : _b.codeUri), this.runtime);
            }
            const ignoreFileInBaseDir = path.join(this.baseDir, '.fcignore');
            if (fse.pathExistsSync(ignoreFileInBaseDir) && fse.lstatSync(ignoreFileInBaseDir).isFile()) {
                logger_1.default.warning('.fcignore file will be placed under codeUri only in the future. Please update it with the relative path and then move it to the codeUri as soon as possible.');
            }
            return yield ignore_1.isIgnored(this.baseDir, this.runtime, path.resolve(this.baseDir, (_c = this.functionConfig) === null || _c === void 0 ? void 0 : _c.codeUri), path.resolve(this.baseDir, ((_d = this.functionConfig) === null || _d === void 0 ? void 0 : _d.originalCodeUri) || ((_e = this.functionConfig) === null || _e === void 0 ? void 0 : _e.codeUri)));
        });
    }
}
exports.default = Invoke;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52b2tlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvaW52b2tlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBTWIsMkNBQTZCO0FBQzdCLDBDQUE0QjtBQUM1Qix5REFBMkM7QUFDM0MsaUVBQXlDO0FBQ3pDLGtFQUFvRDtBQUNwRCw2Q0FBK0I7QUFDL0IsK0JBQW9DO0FBQ3BDLCtDQUFpQztBQUNqQyx1Q0FBd0M7QUFDeEMsaURBQW1DO0FBQ25DLGtDQUFrRDtBQUNsRCxxREFBbUU7QUFDbkUsNkNBQThEO0FBRTlELDBDQUE0QztBQUM1QyxzQ0FBd0Q7QUFDeEQsOENBQWdDO0FBSWhDLFNBQVMsWUFBWSxDQUFDLE9BQU87SUFDM0IsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDNUcsQ0FBQztBQUVELFNBQWUseUJBQXlCLENBQUMsT0FBZTs7UUFFdEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUFFLE9BQU8sSUFBSSxDQUFDO1NBQUU7UUFFNUMsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBTSxFQUFFLENBQUMsQ0FBQztRQUV2RCxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFL0IsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsOENBQThDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDdkUsTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFD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