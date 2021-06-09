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
const http_1 = require("./http");
const runtime_1 = require("../common/model/runtime");
const logger_1 = __importDefault(require("../../common/logger"));
const uuid_1 = require("uuid");
const streams = __importStar(require("memory-streams"));
class ApiInvoke extends invoke_1.default {
    constructor(region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir) {
        super(region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
    }
    init() {
        const _super = Object.create(null, {
            init: { get: () => super.init }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.init.call(this);
            this.envs = yield docker.generateDockerEnvs(this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);
        });
    }
    doInvoke(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const containerName = docker.generateRamdomContainerName();
            const event = yield http_1.getHttpRawBody(req);
            var invokeInitializer = false;
            if (this.functionConfig.initializer) {
                invokeInitializer = true;
            }
            this.cmd = docker.generateDockerCmd(this.runtime, false, this.functionConfig, true, invokeInitializer);
            const outputStream = new streams.WritableStream();
            const errorStream = new streams.WritableStream();
            // check signature
            if (!(yield http_1.validateSignature(req, res, req.method))) {
                return;
            }
            if (runtime_1.isCustomContainerRuntime(this.runtime)) {
                const opts = yield dockerOpts.generateLocalStartOpts(this.runtime, containerName, this.mounts, this.cmd, this.envs, {
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
                const fcReqHeaders = http_1.getFcReqHeaders({}, uuid_1.v4(), this.envs);
                if (this.functionConfig.initializer) {
                    console.log('Initializing...');
                    const initRequestOpts = http_1.generateInitRequestOpts({}, this.functionConfig.caPort, fcReqHeaders);
                    const initResp = yield http_1.requestUntilServerUp(initRequestOpts, this.functionConfig.initializationTimeout || 3);
                    console.log(initResp.body);
                    logger_1.default.debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
                }
                const requestOpts = http_1.generateInvokeRequestOpts(this.functionConfig.caPort, fcReqHeaders, event);
                const respOfCustomContainer = yield http_1.requestUntilServerUp(requestOpts, this.functionConfig.timeout || 3);
                // exit container
                this.responseOfCustomContainer(res, respOfCustomContainer);
                yield docker.exitContainer(container);
            }
            else {
                const opts = yield dockerOpts.generateLocalInvokeOpts(this.runtime, containerName, this.mounts, this.cmd, this.debugPort, this.envs, this.dockerUser, this.debugIde);
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
            logger_1.default.warning('Warning: outputStream of CA container is empty');
        }
        let { statusCode, body, requestId, billedTime, memoryUsage } = http_1.parseOutputStream(outputStream);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWludm9rZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvaW52b2tlL2FwaS1pbnZva2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFYixzREFBOEI7QUFDOUIseURBQTBDO0FBQzFDLGtFQUFvRDtBQUNwRCxpQ0FBeUs7QUFDeksscURBQW1FO0FBS25FLGlFQUF5QztBQUN6QywrQkFBb0M7QUFDcEMsd0RBQTBDO0FBRTFDLE1BQXFCLFNBQVUsU0FBUSxnQkFBTTtJQUczQyxZQUFZLE1BQWMsRUFBRSxPQUFlLEVBQUUsYUFBNEIsRUFBRSxjQUE4QixFQUFFLGFBQTZCLEVBQUUsU0FBa0IsRUFBRSxRQUFjLEVBQUUsTUFBZSxFQUFFLFlBQXFCLEVBQUUsU0FBZSxFQUFFLFVBQW1CO1FBQ3hQLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDekksQ0FBQztJQUVLLElBQUk7Ozs7O1lBQ1IsTUFBTSxPQUFNLElBQUksV0FBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbk8sQ0FB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