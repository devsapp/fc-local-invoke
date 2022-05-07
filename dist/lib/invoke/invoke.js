'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const core = __importStar(require("@serverless-devs/core"));
const dockerode_1 = __importDefault(require("dockerode"));
const path = __importStar(require("path"));
const _ = __importStar(require("lodash"));
const docker = __importStar(require("../docker/docker"));
const logger_1 = __importDefault(require("../../common/logger"));
const dockerOpts = __importStar(require("../docker/docker-opts"));
const fs = __importStar(require("fs-extra"));
const uuid_1 = require("uuid");
const rimraf = __importStar(require("rimraf"));
const extract = require("extract-zip");
const temp_dir_1 = __importDefault(require("temp-dir"));
const devs_1 = require("../devs");
const runtime_1 = require("../common/model/runtime");
const docker_1 = require("../docker/docker");
const value_1 = require("../utils/value");
const ignore_1 = require("../ignore");
const fse = __importStar(require("fs-extra"));
const layer_1 = require("../layer");
function isZipArchive(codeUri) {
    return codeUri ? codeUri.endsWith('.zip') || codeUri.endsWith('.jar') || codeUri.endsWith('.war') : false;
}
function processZipCodeIfNecessary(codeUri) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isZipArchive(codeUri)) {
            return null;
        }
        const tmpCodeDir = path.join(temp_dir_1.default, (0, uuid_1.v4)());
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
            this.fcCore = yield core.loadComponent('devsapp/fc-core');
            this.nasConfig = (_a = this.serviceConfig) === null || _a === void 0 ? void 0 : _a.nasConfig;
            this.dockerUser = yield dockerOpts.resolveDockerUser({ nasConfig: this.nasConfig });
            this.nasMounts = yield docker.resolveNasConfigToMounts(this.baseDir, this.serviceName, this.nasConfig, this.nasBaseDir || path.join(this.baseDir, devs_1.DEFAULT_NAS_PATH_SUFFIX));
            this.unzippedCodeDir = yield processZipCodeIfNecessary(this.codeUri);
            this.codeMount = yield docker.resolveCodeUriToMount(this.unzippedCodeDir || this.codeUri);
            // TODO: 支持 nas mapping yaml file
            // this.nasMappingsMount = await docker.resolveNasYmlToMount(this.baseDir, this.serviceName);
            this.tmpDirMount = (!process.env.DISABLE_BIND_MOUNT_TMP_DIR || (0, value_1.isFalseValue)(process.env.DISABLE_BIND_MOUNT_TMP_DIR)) ? yield docker.resolveTmpDirToMount(this.tmpDir) : null;
            this.debuggerMount = yield docker.resolveDebuggerPathToMount(this.debuggerPath);
            this.passwdMount = yield docker.resolvePasswdMount();
            // 支持 layer
            if (!_.isEmpty(this.functionConfig.layers) && (0, layer_1.supportLayer)(this.runtime)) {
                const layerCachePath = (0, layer_1.genLayerCodeCachePath)(this.baseDir, this.serviceName, this.functionName);
                this.layerMount = docker.resolveLayerToMounts(layerCachePath);
            }
            // const allMount = _.compact([this.codeMount, ...this.nasMounts, ...this.nasMappingsMount, this.passwdMount]);
            const allMount = _.compact([this.codeMount, ...this.nasMounts, this.passwdMount]);
            if (!_.isEmpty(this.layerMount)) {
                allMount.push(this.layerMount);
            }
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
            const isCustomContainer = (0, runtime_1.isCustomContainerRuntime)(this.runtime);
            if (isCustomContainer) {
                this.imageName = this.functionConfig.customContainerConfig.image;
            }
            else {
                this.imageName = yield dockerOpts.resolveRuntimeToDockerImage(this.runtime);
            }
            yield this.fcCore.pullImageIfNeed(new dockerode_1.default(), this.imageName);
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
                    yield (0, docker_1.writeDebugIdeConfigForVscode)(this.baseDir, this.serviceName, this.functionName, this.runtime, ((_a = this.functionConfig) === null || _a === void 0 ? void 0 : _a.originalCodeUri) ? path.join(this.baseDir, this.functionConfig.originalCodeUri) : null, this.debugPort);
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
                return yield (0, ignore_1.isIgnoredInCodeUri)(path.resolve(this.baseDir, (_b = this.functionConfig) === null || _b === void 0 ? void 0 : _b.codeUri), this.runtime);
            }
            const ignoreFileInBaseDir = path.join(this.baseDir, '.fcignore');
            if (fse.pathExistsSync(ignoreFileInBaseDir) && fse.lstatSync(ignoreFileInBaseDir).isFile()) {
                logger_1.default.warn('.fcignore file will be placed under codeUri only in the future. Please update it with the relative path and then move it to the codeUri as soon as possible.');
            }
            return yield (0, ignore_1.isIgnored)(this.baseDir, this.runtime, path.resolve(this.baseDir, (_c = this.functionConfig) === null || _c === void 0 ? void 0 : _c.codeUri), path.resolve(this.baseDir, ((_d = this.functionConfig) === null || _d === void 0 ? void 0 : _d.originalCodeUri) || ((_e = this.functionConfig) === null || _e === void 0 ? void 0 : _e.codeUri)));
        });
    }
}
exports.default = Invoke;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52b2tlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvaW52b2tlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUViLDREQUE4QztBQUM5QywwREFBK0I7QUFLL0IsMkNBQTZCO0FBQzdCLDBDQUE0QjtBQUM1Qix5REFBMkM7QUFDM0MsaUVBQXlDO0FBQ3pDLGtFQUFvRDtBQUNwRCw2Q0FBK0I7QUFDL0IsK0JBQW9DO0FBQ3BDLCtDQUFpQztBQUNqQyx1Q0FBd0M7QUFDeEMsd0RBQThCO0FBQzlCLGtDQUFrRDtBQUNsRCxxREFBbUU7QUFDbkUsNkNBQThEO0FBRTlELDBDQUE0QztBQUM1QyxzQ0FBd0Q7QUFDeEQsOENBQWdDO0FBQ2hDLG9DQUErRDtBQUkvRCxTQUFTLFlBQVksQ0FBQyxPQUFPO0lBQzNCLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQzVHLENBQUM7QUFFRCxTQUFlLHlCQUF5QixDQUFDLE9BQWU7O1FBRXRELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFBRSxPQUFPLElBQUksQ0FBQztTQUFFO1FBRTVDLE1BQU0sVUFBVSxHQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQU0sRUFBRSxJQUFBLFNBQU0sR0FBRSxDQUFDLENBQUM7UUFFdkQsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRS9CLGdCQUFNLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sT0FBTyxDQUFD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