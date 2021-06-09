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
const invoke_1 = __importDefault(require("./invoke"));
const docker = __importStar(require("../docker/docker"));
const dockerOpts = __importStar(require("../docker/docker-opts"));
const logger_1 = __importDefault(require("../../common/logger"));
class EventStart extends invoke_1.default {
    constructor(region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir) {
        super(region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
    }
    init() {
        const _super = Object.create(null, {
            init: { get: () => super.init }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.init.call(this);
            this.envs = yield docker.generateDockerEnvs(this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, null, this.nasConfig, false, this.debugIde, this.debugArgs);
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
            const cmd = docker.generateDockerCmd(this.runtime, true, this.functionConfig);
            this.opts = yield dockerOpts.generateLocalStartOpts(this.runtime, this.containerName, this.mounts, cmd, this.envs, {
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
            console.log('local start succeeded.');
            yield this.showDebugIdeTips();
        });
    }
}
exports.default = EventStart;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtc3RhcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2ludm9rZS9ldmVudC1zdGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNiLHNEQUE4QjtBQUM5Qix5REFBMEM7QUFDMUMsa0VBQW9EO0FBS3BELGlFQUF5QztBQUN6QyxNQUFxQixVQUFXLFNBQVEsZ0JBQU07SUFHNUMsWUFBWSxNQUFjLEVBQUUsT0FBZSxFQUFFLGFBQTRCLEVBQUUsY0FBOEIsRUFBRSxhQUE2QixFQUFFLFNBQWtCLEVBQUUsUUFBYyxFQUFFLE1BQWUsRUFBRSxZQUFxQixFQUFFLFNBQWUsRUFBRSxVQUFtQjtRQUN4UCxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3pJLENBQUM7SUFFSyxJQUFJOzs7OztZQUNSLE1BQU0sT0FBTSxJQUFJLFdBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3BPLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxX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