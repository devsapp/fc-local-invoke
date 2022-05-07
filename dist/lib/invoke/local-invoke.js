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
const invoke_1 = __importDefault(require("./invoke"));
const core = __importStar(require("@serverless-devs/core"));
const docker = require("../docker/docker");
const dockerOpts = require("../docker/docker-opts");
const http_1 = require("./http");
const uuid_1 = require("uuid");
const runtime_1 = require("../common/model/runtime");
const logger_1 = __importDefault(require("../../common/logger"));
class LocalInvoke extends invoke_1.default {
    constructor(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, reuse, nasBaseDir) {
        super(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
        this.reuse = reuse;
    }
    init() {
        const _super = Object.create(null, {
            init: { get: () => super.init }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.init.call(this);
            this.envs = yield docker.generateDockerEnvs(this.creds, this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, null, this.nasConfig, false, this.debugIde, this.debugArgs);
            this.cmd = docker.generateDockerCmd(this.runtime, false, this.functionConfig, false);
            let limitedHostConfig;
            try {
                limitedHostConfig = yield this.fcCore.genContainerResourcesLimitConfig(this.functionConfig.memorySize);
                logger_1.default.debug(limitedHostConfig);
            }
            catch (err) {
                logger_1.default.debug(err);
                logger_1.default.warn("Try to generate the container's resource limit configuration but failed. The default configuration of docker will be used.");
                limitedHostConfig = {
                    CpuPeriod: null,
                    CpuQuota: null,
                    Memory: null,
                    Ulimits: null,
                };
            }
            if ((0, runtime_1.isCustomContainerRuntime)(this.runtime) || (0, runtime_1.isCustomRuntime)(this.runtime)) {
                this.opts = yield dockerOpts.generateLocalStartOpts(this.runtime, this.containerName, this.mounts, this.cmd, this.envs, limitedHostConfig, {
                    debugPort: this.debugPort,
                    dockerUser: this.dockerUser,
                    debugIde: this.debugIde,
                    imageName: this.imageName,
                    caPort: this.functionConfig.caPort,
                });
            }
            else {
                this.opts = yield dockerOpts.generateLocalInvokeOpts(this.runtime, this.containerName, this.mounts, this.cmd, this.debugPort, this.envs, limitedHostConfig, this.dockerUser, this.debugIde);
            }
        });
    }
    doInvoke(event, { outputStream = null, errorStream = null } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let invokeInitializer = true;
            let containerUp = false;
            if (this.reuse) {
                const containerName = dockerOpts.generateContainerName(this.serviceName, this.functionName, this.debugPort);
                let filters = dockerOpts.generateContainerNameFilter(containerName, true);
                let containers = yield docker.listContainers({ filters });
                if (containers && containers.length) {
                    invokeInitializer = false;
                }
                else {
                    filters = dockerOpts.generateContainerNameFilter(containerName);
                    containers = yield docker.listContainers({ filters });
                }
                if (containers && containers.length) {
                    const container = yield docker.getContainer(containers[0].Id);
                    if ((0, runtime_1.isCustomContainerRuntime)(this.runtime) || (0, runtime_1.isCustomRuntime)(this.runtime)) {
                        if (this.functionConfig.initializer && invokeInitializer) {
                            yield docker.renameContainer(container, containerName + '-inited');
                        }
                        containerUp = true;
                    }
                    else {
                        let limitedHostConfig;
                        try {
                            const fcCore = yield core.loadComponent('devsapp/fc-core');
                            limitedHostConfig = yield fcCore.genContainerResourcesLimitConfig(this.functionConfig.memorySize);
                            logger_1.default.debug(limitedHostConfig);
                        }
                        catch (err) {
                            logger_1.default.debug(err);
                            logger_1.default.warn("Try to generate the container's resource limit configuration but failed. The default configuration of docker will be used.");
                            limitedHostConfig = {
                                CpuPeriod: null,
                                CpuQuota: null,
                                Memory: null,
                                Ulimits: null,
                            };
                        }
                        const cmd = [
                            dockerOpts.resolveMockScript(this.runtime),
                            ...docker.generateDockerCmd(this.runtime, false, this.functionConfig, false, invokeInitializer, event),
                        ];
                        const opts = yield dockerOpts.generateLocalInvokeOpts(this.runtime, this.containerName, this.mounts, cmd, this.debugPort, this.envs, limitedHostConfig, this.dockerUser, this.debugIde);
                        yield docker.execContainer(container, opts, outputStream, errorStream);
                        if (invokeInitializer) {
                            yield docker.renameContainer(container, containerName + '-inited');
                        }
                        return;
                    }
                }
            }
            if ((0, runtime_1.isCustomContainerRuntime)(this.runtime) || (0, runtime_1.isCustomRuntime)(this.runtime)) {
                let container;
                let stream;
                if (!containerUp) {
                    const containerRunner = yield docker.runContainer(this.opts, outputStream, errorStream, {
                        serviceName: this.serviceName,
                        functionName: this.functionName,
                    });
                    container = containerRunner.container;
                    stream = containerRunner.stream;
                }
                // send request
                const fcReqHeaders = (0, http_1.getFcReqHeaders)({}, (0, uuid_1.v4)(), this.envs);
                if (this.functionConfig.initializer && invokeInitializer) {
                    logger_1.default.info('Initializing...');
                    const initRequestOpts = (0, http_1.generateInitRequestOpts)({}, this.functionConfig.caPort, fcReqHeaders);
                    const initResp = yield (0, http_1.requestUntilServerUp)(initRequestOpts, this.functionConfig.initializationTimeout || 3);
                    invokeInitializer = false;
                    logger_1.default.log(initResp.body);
                    logger_1.default.debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
                }
                const requestOpts = (0, http_1.generateInvokeRequestOpts)(this.functionConfig.caPort, fcReqHeaders, event);
                const respOfCustomContainer = yield (0, http_1.requestUntilServerUp)(requestOpts, this.functionConfig.timeout || 3);
                logger_1.default.log(respOfCustomContainer.body);
                // exit container
                if (!containerUp) {
                    yield docker.exitContainer(container);
                    stream === null || stream === void 0 ? void 0 : stream.end();
                }
            }
            else {
                yield docker.run(this.opts, event, outputStream, errorStream, {
                    serviceName: this.serviceName,
                    functionName: this.functionName,
                });
            }
        });
    }
}
exports.default = LocalInvoke;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwtaW52b2tlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvbG9jYWwtaW52b2tlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNiLHNEQUE4QjtBQUM5Qiw0REFBOEM7QUFDOUMsMkNBQTRDO0FBSTVDLG9EQUFxRDtBQUNyRCxpQ0FBbUg7QUFDbkgsK0JBQW9DO0FBQ3BDLHFEQUFvRjtBQUNwRixpRUFBeUM7QUFHekMsTUFBcUIsV0FBWSxTQUFRLGdCQUFNO0lBSzdDLFlBQ0UsS0FBbUIsRUFDbkIsTUFBYyxFQUNkLE9BQWUsRUFDZixhQUE0QixFQUM1QixjQUE4QixFQUM5QixhQUE2QixFQUM3QixTQUFrQixFQUNsQixRQUFjLEVBQ2QsTUFBZSxFQUNmLFlBQWtCLEVBQ2xCLFNBQWUsRUFDZixLQUFlLEVBQ2YsVUFBbUI7UUFFbkIsS0FBSyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVLLElBQUk7Ozs7O1lBQ1IsTUFBTSxPQUFNLElBQUksV0FBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsa0JBQWtCLENBQ3pDLElBQUksQ0FBQyxLQUFLLEVBQ1YsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxhQUFhLEVBQ2xCLElBQUksQ0FBQyxZQUFZLEVBQ2pCLElBQUksQ0FBQyxjQUFjLEVBQ25CLElBQUksQ0FB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