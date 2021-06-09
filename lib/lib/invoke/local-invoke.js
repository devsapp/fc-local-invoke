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
    constructor(region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, reuse, nasBaseDir) {
        super(region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
        this.reuse = reuse;
    }
    init() {
        const _super = Object.create(null, {
            init: { get: () => super.init }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.init.call(this);
            this.envs = yield docker.generateDockerEnvs(this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, null, this.nasConfig, false, this.debugIde, this.debugArgs);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwtaW52b2tlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvbG9jYWwtaW52b2tlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFDYixzREFBOEI7QUFFOUIsMkNBQTRDO0FBSTVDLG9EQUFxRDtBQUNyRCxpQ0FBbUg7QUFDbkgsK0JBQW9DO0FBQ3BDLHFEQUFtRTtBQUNuRSxpRUFBeUM7QUFFekMsTUFBcUIsV0FBWSxTQUFRLGdCQUFNO0lBSzdDLFlBQVksTUFBYyxFQUFFLE9BQWUsRUFBRSxhQUE0QixFQUFFLGNBQThCLEVBQUUsYUFBNkIsRUFBRSxTQUFrQixFQUFFLFFBQWMsRUFBRSxNQUFlLEVBQUUsWUFBa0IsRUFBRSxTQUFlLEVBQUUsS0FBZSxFQUFFLFVBQW1CO1FBQ3RRLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdkksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUdLLElBQUk7Ozs7O1lBQ1IsTUFBTSxPQUFNLElBQUksV0FBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxD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