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
const invoke_1 = __importDefault(require("./invoke"));
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
            if (runtime_1.isCustomContainerRuntime(this.runtime)) {
                this.opts = yield dockerOpts.generateLocalStartOpts(this.runtime, this.containerName, this.mounts, this.cmd, this.envs, {
                    debugPort: this.debugPort,
                    dockerUser: this.dockerUser,
                    debugIde: this.debugIde,
                    imageName: this.imageName,
                    caPort: this.functionConfig.caPort
                });
            }
            else {
                this.opts = yield dockerOpts.generateLocalInvokeOpts(this.runtime, this.containerName, this.mounts, this.cmd, this.debugPort, this.envs, this.dockerUser, this.debugIde);
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
                    if (runtime_1.isCustomContainerRuntime(this.runtime)) {
                        if (this.functionConfig.initializer && invokeInitializer) {
                            yield docker.renameContainer(container, containerName + '-inited');
                        }
                        containerUp = true;
                    }
                    else {
                        const cmd = [dockerOpts.resolveMockScript(this.runtime), ...docker.generateDockerCmd(this.runtime, false, this.functionConfig, false, invokeInitializer, event)];
                        const opts = yield dockerOpts.generateLocalInvokeOpts(this.runtime, this.containerName, this.mounts, cmd, this.debugPort, this.envs, this.dockerUser, this.debugIde);
                        yield docker.execContainer(container, opts, outputStream, errorStream);
                        if (invokeInitializer) {
                            yield docker.renameContainer(container, containerName + '-inited');
                        }
                        return;
                    }
                }
            }
            if (runtime_1.isCustomContainerRuntime(this.runtime)) {
                let container;
                if (!containerUp) {
                    const containerRunner = yield docker.runContainer(this.opts, outputStream, errorStream, {
                        serviceName: this.serviceName,
                        functionName: this.functionName
                    });
                    container = containerRunner.container;
                }
                // send request
                const fcReqHeaders = http_1.getFcReqHeaders({}, uuid_1.v4(), this.envs);
                if (this.functionConfig.initializer && invokeInitializer) {
                    logger_1.default.info('Initializing...');
                    const initRequestOpts = http_1.generateInitRequestOpts({}, this.functionConfig.caPort, fcReqHeaders);
                    const initResp = yield http_1.requestUntilServerUp(initRequestOpts, this.functionConfig.initializationTimeout || 3);
                    invokeInitializer = false;
                    logger_1.default.log(initResp.body);
                    logger_1.default.debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
                }
                const requestOpts = http_1.generateInvokeRequestOpts(this.functionConfig.caPort, fcReqHeaders, event);
                const respOfCustomContainer = yield http_1.requestUntilServerUp(requestOpts, this.functionConfig.timeout || 3);
                logger_1.default.log(respOfCustomContainer.body);
                // exit container
                if (!containerUp) {
                    yield docker.exitContainer(container);
                }
            }
            else {
                yield docker.run(this.opts, event, outputStream, errorStream, {
                    serviceName: this.serviceName,
                    functionName: this.functionName
                });
            }
        });
    }
}
exports.default = LocalInvoke;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwtaW52b2tlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvbG9jYWwtaW52b2tlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFDYixzREFBOEI7QUFFOUIsMkNBQTRDO0FBSTVDLG9EQUFxRDtBQUNyRCxpQ0FBbUg7QUFDbkgsK0JBQW9DO0FBQ3BDLHFEQUFtRTtBQUNuRSxpRUFBeUM7QUFHekMsTUFBcUIsV0FBWSxTQUFRLGdCQUFNO0lBSzdDLFlBQVksS0FBbUIsRUFBRSxNQUFjLEVBQUUsT0FBZSxFQUFFLGFBQTRCLEVBQUUsY0FBOEIsRUFBRSxhQUE2QixFQUFFLFNBQWtCLEVBQUUsUUFBYyxFQUFFLE1BQWUsRUFBRSxZQUFrQixFQUFFLFNBQWUsRUFBRSxLQUFlLEVBQUUsVUFBbUI7UUFDM1IsS0FBSyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUdLLElBQUk7Ozs7O1lBQ1IsTUFBTSxPQUFNLElBQUksV0FBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUss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