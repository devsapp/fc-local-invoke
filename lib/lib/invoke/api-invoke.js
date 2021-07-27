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
            const event = yield http_1.getHttpRawBody(req);
            var invokeInitializer = false;
            if (this.functionConfig.initializer) {
                invokeInitializer = true;
            }
            this.cmd = docker.generateDockerCmd(this.runtime, false, this.functionConfig, true, invokeInitializer);
            const outputStream = new streams.WritableStream();
            const errorStream = new streams.WritableStream();
            // check signature
            if (!(yield http_1.validateSignature(req, res, req.method, this.creds))) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWludm9rZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvaW52b2tlL2FwaS1pbnZva2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFYixzREFBOEI7QUFDOUIseURBQTBDO0FBQzFDLGtFQUFvRDtBQUNwRCxpQ0FBeUs7QUFDeksscURBQW1FO0FBS25FLGlFQUF5QztBQUN6QywrQkFBb0M7QUFDcEMsd0RBQTBDO0FBRzFDLE1BQXFCLFNBQVUsU0FBUSxnQkFBTTtJQUczQyxZQUFZLEtBQW1CLEVBQUUsTUFBYyxFQUFFLE9BQWUsRUFBRSxhQUE0QixFQUFFLGNBQThCLEVBQUUsYUFBNkIsRUFBRSxTQUFrQixFQUFFLFFBQWMsRUFBRSxNQUFlLEVBQUUsWUFBcUIsRUFBRSxTQUFlLEVBQUUsVUFBbUI7UUFDN1EsS0FBSyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEosQ0FBQztJQUVLLElBQUk7Ozs7O1lBQ1IsTUFBTSxPQUFNLElBQUksV0FBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFB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