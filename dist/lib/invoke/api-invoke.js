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
const http_1 = require("./http");
const runtime_1 = require("../common/model/runtime");
const logger_1 = __importDefault(require("../../common/logger"));
const uuid_1 = require("uuid");
const streams = __importStar(require("memory-streams"));
class ApiInvoke extends invoke_1.default {
    constructor(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir) {
        super(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
    }
    init() {
        const _super = Object.create(null, {
            init: { get: () => super.init }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.init.call(this);
            this.envs = yield docker.generateDockerEnvs(this.creds, this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);
        });
    }
    doInvoke(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const containerName = docker.generateRamdomContainerName();
            const event = yield (0, http_1.getHttpRawBody)(req);
            var invokeInitializer = false;
            if (this.functionConfig.initializer) {
                invokeInitializer = true;
            }
            this.cmd = docker.generateDockerCmd(this.runtime, false, this.functionConfig, true, invokeInitializer);
            const outputStream = new streams.WritableStream();
            const errorStream = new streams.WritableStream();
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
            // check signature
            if (!(yield (0, http_1.validateSignature)(req, res, req.method, this.creds))) {
                return;
            }
            if ((0, runtime_1.isCustomContainerRuntime)(this.runtime) || (0, runtime_1.isCustomRuntime)(this.runtime)) {
                const opts = yield dockerOpts.generateLocalStartOpts(this.runtime, containerName, this.mounts, this.cmd, this.envs, limitedHostConfig, {
                    debugPort: this.debugPort,
                    dockerUser: this.dockerUser,
                    debugIde: this.debugIde,
                    imageName: this.imageName,
                    caPort: this.functionConfig.caPort
                });
                const containerRunner = yield docker.runContainer(opts, outputStream, errorStream, {
                    serviceName: this.serviceName,
                    functionName: this.functionName
                });
                const container = containerRunner.container;
                // send request
                const fcReqHeaders = (0, http_1.getFcReqHeaders)({}, (0, uuid_1.v4)(), this.envs);
                if (this.functionConfig.initializer) {
                    console.log('Initializing...');
                    const initRequestOpts = (0, http_1.generateInitRequestOpts)({}, this.functionConfig.caPort, fcReqHeaders);
                    const initResp = yield (0, http_1.requestUntilServerUp)(initRequestOpts, this.functionConfig.initializationTimeout || 3);
                    console.log(initResp.body);
                    logger_1.default.debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
                }
                const requestOpts = (0, http_1.generateInvokeRequestOpts)(this.functionConfig.caPort, fcReqHeaders, event);
                const respOfCustomContainer = yield (0, http_1.requestUntilServerUp)(requestOpts, this.functionConfig.timeout || 3);
                // exit container
                this.responseOfCustomContainer(res, respOfCustomContainer);
                yield docker.exitContainer(container);
            }
            else {
                const opts = yield dockerOpts.generateLocalInvokeOpts(this.runtime, containerName, this.mounts, this.cmd, this.debugPort, this.envs, limitedHostConfig, this.dockerUser, this.debugIde);
                yield docker.run(opts, event, outputStream, errorStream);
                this.response(outputStream, errorStream, res);
            }
        });
    }
    responseOfCustomContainer(res, resp) {
        var { statusCode, headers, body } = resp;
        res.status(statusCode);
        res.set(headers);
        res.send(body);
    }
    // responseApi
    response(outputStream, errorStream, res) {
        const errorResponse = errorStream.toString();
        // 当容器的输出为空异常时
        if (outputStream.toString() === '') {
            logger_1.default.warn('Warning: outputStream of CA container is empty');
        }
        let { statusCode, body, requestId, billedTime, memoryUsage } = (0, http_1.parseOutputStream)(outputStream);
        const headers = {
            'content-type': 'application/octet-stream',
            'x-fc-request-id': requestId,
            'x-fc-invocation-duration': billedTime,
            'x-fc-invocation-service-version': 'LATEST',
            'x-fc-max-memory-usage': memoryUsage,
            'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version'
        };
        if (statusCode) {
            res.status(statusCode);
        }
        else {
            res.status(500);
        }
        // todo: fix body 后面多个换行的 bug
        if (errorResponse) { // process HandledInvocationError and UnhandledInvocationError
            headers['content-type'] = 'application/json';
            logger_1.default.error(errorResponse);
            if (body.toString()) {
                headers['x-fc-error-type'] = 'HandledInvocationError';
            }
            else {
                headers['x-fc-error-type'] = 'UnhandledInvocationError';
                body = {
                    'errorMessage': `Process exited unexpectedly before completing request (duration: ${billedTime}ms, maxMemoryUsage: ${memoryUsage}MB)`
                };
            }
        }
        res.set(headers);
        res.send(body);
    }
}
exports.default = ApiInvoke;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWludm9rZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvaW52b2tlL2FwaS1pbnZva2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRWIsc0RBQThCO0FBQzlCLHlEQUEwQztBQUMxQyxrRUFBb0Q7QUFDcEQsNERBQThDO0FBQzlDLGlDQUF5SztBQUN6SyxxREFBa0Y7QUFLbEYsaUVBQXlDO0FBQ3pDLCtCQUFvQztBQUNwQyx3REFBMEM7QUFHMUMsTUFBcUIsU0FBVSxTQUFRLGdCQUFNO0lBRzNDLFlBQVksS0FBbUIsRUFBRSxNQUFjLEVBQUUsT0FBZSxFQUFFLGFBQTRCLEVBQUUsY0FBOEIsRUFBRSxhQUE2QixFQUFFLFNBQWtCLEVBQUUsUUFBYyxFQUFFLE1BQWUsRUFBRSxZQUFxQixFQUFFLFNBQWUsRUFBRSxVQUFtQjtRQUM3USxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNoSixDQUFDO0lBRUssSUFBSTs7Ozs7WUFDUixNQUFNLE9BQU0sSUFBSSxXQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxF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