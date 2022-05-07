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
const docker = __importStar(require("../docker/docker"));
const dockerOpts = __importStar(require("../docker/docker-opts"));
const core = __importStar(require("@serverless-devs/core"));
const logger_1 = __importDefault(require("../../common/logger"));
class EventStart extends invoke_1.default {
    constructor(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir) {
        super(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
    }
    init() {
        const _super = Object.create(null, {
            init: { get: () => super.init }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.init.call(this);
            this.envs = yield docker.generateDockerEnvs(this.creds, this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, null, this.nasConfig, false, this.debugIde, this.debugArgs);
            this.containerName = dockerOpts.generateContainerName(this.serviceName, this.functionName, this.debugPort);
            let filters = dockerOpts.generateContainerNameFilter(this.containerName, true);
            let containers = yield docker.listContainers({ filters });
            if (!containers || !containers.length) {
                filters = dockerOpts.generateContainerNameFilter(this.containerName);
                containers = yield docker.listContainers({ filters });
            }
            if (containers && containers.length) {
                const jobs = [];
                for (let c of containers) {
                    const container = yield docker.getContainer(c.Id);
                    jobs.push(container.stop());
                    logger_1.default.debug(`stopping container ${c.Id}`);
                }
                yield Promise.all(jobs);
                logger_1.default.debug('all containers stopped');
            }
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
            const cmd = docker.generateDockerCmd(this.runtime, true, this.functionConfig);
            this.opts = yield dockerOpts.generateLocalStartOpts(this.runtime, this.containerName, this.mounts, cmd, this.envs, limitedHostConfig, {
                debugPort: this.debugPort,
                dockerUser: this.dockerUser,
                debugIde: this.debugIde,
                imageName: this.imageName,
                caPort: this.functionConfig.caPort
            });
            const container = yield docker.createAndRunContainer(this.opts);
            yield container.logs({
                stdout: true,
                stderr: true,
                follow: true,
                since: (new Date().getTime() / 1000)
            });
            console.log('Function container started successful.');
            yield this.setDebugIdeConfig();
        });
    }
}
exports.default = EventStart;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtc3RhcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2ludm9rZS9ldmVudC1zdGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDYixzREFBOEI7QUFDOUIseURBQTBDO0FBQzFDLGtFQUFvRDtBQUNwRCw0REFBOEM7QUFJOUMsaUVBQXlDO0FBRXpDLE1BQXFCLFVBQVcsU0FBUSxnQkFBTTtJQUc1QyxZQUFZLEtBQW1CLEVBQUUsTUFBYyxFQUFFLE9BQWUsRUFBRSxhQUE0QixFQUFFLGNBQThCLEVBQUUsYUFBNkIsRUFBRSxTQUFrQixFQUFFLFFBQWMsRUFBRSxNQUFlLEVBQUUsWUFBcUIsRUFBRSxTQUFlLEVBQUUsVUFBbUI7UUFDN1EsS0FBSyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEosQ0FBQztJQUVLLElBQUk7Ozs7O1lBQ1IsTUFBTSxPQUFNLElBQUksV0FBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNoUCxJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTNHLElBQUksT0FBTyxHQUFHLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQy9FLElBQUksVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDMUQsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3JDLE9BQU8sR0FBRyxVQUFVLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNyRSxVQUFVLEdBQUcsTUFBTSxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQzthQUN2RDtZQUNELElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ25DLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDaEIsS0FBSyxJQUFJLENBQUMsSUFBSSxVQUFVLEVBQUU7b0JBQ3hCLE1BQU0sU0FBUyxHQUFHLE1BQU0sTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQzVCLGdCQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDNUM7Z0JBQ0QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4QixnQkFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2FBQ3hDO1lBRUQsSUFBSSxpQkFBaUIsQ0FBQztZQUN0QixJQUFJO2dCQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUMzRCxpQkFBaUIsR0FBRyxNQUFNLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNsRyxnQkFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2FBQ2pDO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ1osZ0JBQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2xCLGdCQUFNLENBQUMsSUFBSSxDQUFDLDRIQUE0SCxDQUFDLENBQUM7Z0JBQzFJLGlCQUFpQixHQUFHO29CQUNsQixTQUFTLEVBQUUsSUFBSTtvQkFDZixRQUFRLEVBQUUsSUFBSTtvQkFDZCxNQUFNLEVBQUUsSUFBSTtvQkFDWixPQUFPLEVBQUUsSUFBSTtpQkFDZCxDQUFDO2FBQ0g7WUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzlFLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFDOUQsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUFDLE1BQU0sRUFDWCxHQUFHLEVBQ0gsSUFBSSxDQUFDLElBQUksRUFDVCxpQkFBaUIsRUFDakI7Z0JBQ0UsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUN6QixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7Z0JBQzNCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDdkIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUN6QixNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNO2FBQ25DLENBQUMsQ0FBQztZQUVMLE1BQU0sU0FBUyxHQUFHLE1BQU0sTUFBTSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoRSxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLE1BQU0sRUFBRSxJQUFJO2dCQUNaLE1BQU0sRUFBRSxJQUFJO2dCQUNaLE1BQU0sRUFBRSxJQUFJO2dCQUNaLEtBQUssRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDO2FBQ3JDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLENBQUMsQ0FBQztZQUN0RCxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ2pDLENBQUM7S0FBQTtDQUNGO0FBdEVELDZCQXNFQyJ9