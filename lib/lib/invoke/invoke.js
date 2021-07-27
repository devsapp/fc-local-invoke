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
            // await this.showDebugIdeTips();
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
            this.tmpDirMount = yield docker.resolveTmpDirToMount(this.tmpDir);
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
            yield docker.pullImageIfNeed(this.imageName);
            this.inited = true;
        });
    }
    beforeInvoke() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    showDebugIdeTips() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debugPort && this.debugIde) {
                // not show tips if debugIde is null
                if (this.debugIde.toLowerCase() === 'vscode') {
                    yield docker.showDebugIdeTipsForVscode(this.serviceName, this.functionName, this.runtime, this.codeMount.Source, this.debugPort);
                }
                else if (this.debugIde.toLowerCase() === 'pycharm') {
                    yield docker.showDebugIdeTipsForPycharm(this.codeMount.Source, this.debugPort);
                }
            }
        });
    }
    setDebugIdeConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debugPort && this.debugIde) {
                if (this.debugIde.toLowerCase() === 'vscode') {
                    // try to write .vscode/config.json
                    yield docker_1.writeDebugIdeConfigForVscode(this.baseDir, this.serviceName, this.functionName, this.runtime, this.codeMount.Source, this.debugPort);
                }
                else if (this.debugIde.toLowerCase() === 'pycharm') {
                    yield docker.showDebugIdeTipsForPycharm(this.codeMount.Source, this.debugPort);
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
}
exports.default = Invoke;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52b2tlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvaW52b2tlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBTWIsMkNBQTZCO0FBQzdCLDBDQUE0QjtBQUM1Qix5REFBMkM7QUFDM0MsaUVBQXlDO0FBQ3pDLGtFQUFvRDtBQUNwRCw2Q0FBK0I7QUFDL0IsK0JBQW9DO0FBQ3BDLCtDQUFpQztBQUNqQyx1Q0FBd0M7QUFDeEMsaURBQW1DO0FBQ25DLGtDQUFrRDtBQUNsRCxxREFBbUU7QUFDbkUsNkNBQThEO0FBSzlELFNBQVMsWUFBWSxDQUFDLE9BQU87SUFDM0IsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDNUcsQ0FBQztBQUVELFNBQWUseUJBQXlCLENBQUMsT0FBZTs7UUFFdEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUFFLE9BQU8sSUFBSSxDQUFDO1NBQUU7UUFFNUMsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBTSxFQUFFLENBQUMsQ0FBQztRQUV2RCxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFL0IsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsOENBQThDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDdkUsTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDNUMsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUFBO0FBRUQs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