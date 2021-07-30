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
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            this.nasConfig = (_a = this.serviceConfig) === null || _a === void 0 ? void 0 : _a.nasConfig;
            this.dockerUser = yield dockerOpts.resolveDockerUser({ nasConfig: this.nasConfig });
            this.nasMounts = yield docker.resolveNasConfigToMounts(this.baseDir, this.serviceName, this.nasConfig, this.nasBaseDir || path.join(this.baseDir, devs_1.DEFAULT_NAS_PATH_SUFFIX));
            this.unzippedCodeDir = yield processZipCodeIfNecessary(this.codeUri);
            this.codeMount = yield docker.resolveCodeUriToMount(this.unzippedCodeDir || ((_b = this.functionConfig) === null || _b === void 0 ? void 0 : _b.originalCodeUri) ? path.join(this.baseDir, this.functionConfig.originalCodeUri) : null);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52b2tlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvaW52b2tlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBTWIsMkNBQTZCO0FBQzdCLDBDQUE0QjtBQUM1Qix5REFBMkM7QUFDM0MsaUVBQXlDO0FBQ3pDLGtFQUFvRDtBQUNwRCw2Q0FBK0I7QUFDL0IsK0JBQW9DO0FBQ3BDLCtDQUFpQztBQUNqQyx1Q0FBd0M7QUFDeEMsaURBQW1DO0FBQ25DLGtDQUFrRDtBQUNsRCxxREFBbUU7QUFDbkUsNkNBQThEO0FBRTlELDBDQUE0QztBQUk1QyxTQUFTLFlBQVksQ0FBQyxPQUFPO0lBQzNCLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQzVHLENBQUM7QUFFRCxTQUFlLHlCQUF5QixDQUFDLE9BQWU7O1FBRXRELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFBRSxPQUFPLElBQUksQ0FBQztTQUFFO1FBRTVDLE1BQU0sVUFBVSxHQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQU0sRUFBRSxDQUFDLENBQUM7UUFFdkQsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRS9CLGdCQUFNLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FBQTtBQUVELE1BQXFCLE1BQU07SUFnQ3pCLFlBQVksS0FBSyxFQUFFLE1BQWMsRUFBRSxPQUFlLEVBQUUsYUFBNEIsRUFBRSxjQUE4QixFQUFFLGFBQTZCLEVBQUUsU0FBa0IsRUFBRSxRQUFjLEVBQUUsTUFBZSxFQUFFLFlBQXFCLEVBQUUsU0FBZSxFQUFFLFVBQW1CO1FBQy9QLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQztRQUN0QyxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUNuQyxJQUFJLENBQUMsWUFBWSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDeEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFFN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztRQUMzQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzVHLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBQzdCLENBQUM7SUFFSyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUc7O1lBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNoQixNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNuQjtZQUVELE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzFCLGlDQUFpQztZQUNqQyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQy9CLGFBQWE7WUFDYixNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNCLENBQUM7S0FBQTtJQUVLLElBQUk7OztZQUNSLElBQUksQ0FBQyxTQUFTLFNBQUcsSUFBSSxDQUFDLGFBQWEsMENBQUUsU0FBUyxDQUFDO1lBQy9DLElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDcEYsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSw4QkFBdUIsQ0FBQyxDQUFDLENBQUM7WUFDNUssSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLHlCQUF5QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sTUFBTSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxlQUFlLFdBQUksSUFBSSxDQUFDLGNBQWMsMENBQUUsZUFBZSxDQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4TCxpQ0FBaUM7WUFDakMsNkZBQTZGO1lBQzdGLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLElBQUksb0JBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDN0ssSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEYsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBRXJELCtHQUErRztZQUMvRyxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFFbEYsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUNoQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUNqQztZQUVELElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRTtnQkFDbEMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7YUFDbkM7WUFFRCxNQUFNLGVBQWUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxxQ0FBcUMsRUFBRSxDQUFDO1lBRTdFLElBQUksZUFBZSxFQUFFO2dCQUNuQixJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUM5RDtpQkFBTTtnQkFDTCxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQzthQUN4QjtZQUVELGdCQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUV2RSxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1lBQzFELE1BQU0saUJBQWlCLEdBQUcsa0NBQXdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pFLElBQUksaUJBQWlCLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7YUFDbEU7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDN0U7WUFFRCxNQUFNLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTdDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDOztLQUNwQjtJQUVLLFlBQVk7O1FBRWxCLENBQUM7S0FBQTtJQUVLLGdCQUFnQjs7WUFDcEIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQ25DLG9DQUFvQztnQkFDcEMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLFFBQVEsRUFBRTtvQkFDNUMsTUFBTSxNQUFNLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2lCQUNsSTtxQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLEtBQUssU0FBUyxFQUFFO29CQUNwRCxNQUFNLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQ2hGO2FBQ0Y7UUFDSCxDQUFDO0tBQUE7SUFFSyxpQkFBaUI7O1lBQ3JCLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUNuQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLEtBQUssUUFBUSxFQUFFO29CQUM1QyxtQ0FBbUM7b0JBQ25DLE1BQU0scUNBQTRCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQzVJO3FCQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsS0FBSyxTQUFTLEVBQUU7b0JBQ3BELE1BQU0sTUFBTSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDaEY7YUFDRjtRQUNILENBQUM7S0FBQTtJQUVNLG9CQUFvQjtRQUN6QixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7WUFDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxDQUFDLGVBQWUsZUFBZSxDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7U0FDN0I7SUFDSCxDQUFDO0lBRUssV0FBVzs7WUFDZixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM5QixDQUFDO0tBQUE7Q0FDRjtBQXBKRCx5QkFvSkMifQ==