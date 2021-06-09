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
const async_lock_1 = __importDefault(require("async-lock"));
const lock = new async_lock_1.default();
const node_watch_1 = __importDefault(require("node-watch"));
const streams = __importStar(require("memory-streams"));
const rimraf = __importStar(require("rimraf"));
const ignore_1 = require("../ignore");
const invoke_1 = __importDefault(require("./invoke"));
const docker = __importStar(require("../docker/docker"));
const dockerOpts = __importStar(require("../docker/docker-opts"));
const FC_HTTP_PARAMS = 'x-fc-http-params';
const docker_1 = require("../docker/docker");
const http_1 = require("./http");
const uuid_1 = require("uuid");
const runtime_1 = require("../common/model/runtime");
const logger_1 = __importDefault(require("../../common/logger"));
const isWin = process.platform === 'win32';
function is2xxStatusCode(statusCode) {
    return statusCode && statusCode.startsWith('2');
}
class HttpInvoke extends invoke_1.default {
    constructor(region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, authType, endpointPrefix, debuggerPath, debugArgs, nasBaseDir) {
        super(region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
        this.isAnonymous = authType === 'ANONYMOUS' || authType === 'anonymous';
        this.endpointPrefix = endpointPrefix;
        this._invokeInitializer = true;
        process.on('SIGINT', () => {
            this.cleanUnzippedCodeDir();
        });
    }
    _disableRunner(evt, name) {
        let oldRunner = null;
        let tmpCodeDir = this.unzippedCodeDir;
        lock.acquire('invoke', (done) => {
            if (!this.runner) {
                done();
                return;
            }
            logger_1.default.info(`detect code changes, file is ${name}, event is ${evt}, auto reloading...`);
            oldRunner = this.runner;
            this.runner = null;
            this.containerName = docker.generateRamdomContainerName();
            this._invokeInitializer = true;
            setTimeout(() => {
                this.init().then(() => {
                    logger_1.default.info('reloading success, stop old container background...');
                    done();
                });
            }, 500); // for mvn, jar will be writen done after a while
        }, (err, ret) => {
            logger_1.default.debug('stop container after lock released');
            // https://github.com/alibaba/funcraft/issues/527
            require('promise.prototype.finally').shim();
            oldRunner.stop().catch(reason => {
                logger_1.default.error(`stop container error, reason is ${reason}`);
            }).finally(() => {
                // release lock
                logger_1.default.info('stopping old container successfully\n');
                if (tmpCodeDir) {
                    rimraf.sync(tmpCodeDir);
                    logger_1.default.info(`clean tmp code dir ${tmpCodeDir} successfully.\n`);
                }
            });
        });
    }
    beforeInvoke() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.debugPort) {
                // reuse container
                if (!this.runner) {
                    logger_1.default.debug('runner not created, acquire beforeInvoke lock');
                    yield lock.acquire('invoke', () => __awaiter(this, void 0, void 0, function* () {
                        if (!this.runner) {
                            logger_1.default.debug('acquire invoke lock success, ready to create runner');
                            if (!this.watcher && !runtime_1.isCustomContainerRuntime(this.runtime)) {
                                // add file ignore when auto reloading
                                const ign = yield ignore_1.isIgnored(this.baseDir);
                                this.watcher = node_watch_1.default(this.codeUri, {
                                    recursive: true, persistent: false, filter: (f) => {
                                        return ign && !ign(f);
                                    }
                                }, (evt, name) => {
                                    if (this.runner) {
                                        this._disableRunner(evt, name);
                                    }
                                    else {
                                        logger_1.default.debug('detect code changes, but no runner found, ignore....');
                                    }
                                });
                            }
                            yield this._startRunner();
                        }
                        else {
                            logger_1.default.debug('acquire invoke lock success, but runner already created, skipping...');
                        }
                    }));
                }
            }
        });
    }
    _startRunner() {
        return __awaiter(this, void 0, void 0, function* () {
            const envs = yield docker.generateDockerEnvs(this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);
            const cmd = docker.generateDockerCmd(this.runtime, true, this.functionConfig);
            const opts = yield dockerOpts.generateLocalStartOpts(this.runtime, this.containerName, this.mounts, cmd, envs, {
                debugPort: this.debugPort,
                dockerUser: this.dockerUser,
                imageName: this.imageName,
                caPort: this.functionConfig.caPort
            });
            this.runner = yield docker_1.startContainer(opts, process.stdout, process.stderr, {
                serviceName: this.serviceName,
                functionName: this.functionName
            });
        });
    }
    initAndStartRunner() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            yield this._startRunner();
            yield this.showDebugIdeTips();
        });
    }
    doInvoke(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // only one invoke can be processed
            yield lock.acquire('invoke', () => __awaiter(this, void 0, void 0, function* () {
                logger_1.default.debug('http doInvoke, aquire invoke lock success, processing...');
                const outputStream = new streams.WritableStream();
                const errorStream = new streams.WritableStream();
                const event = yield http_1.getHttpRawBody(req);
                const httpParams = http_1.generateHttpParams(req, this.endpointPrefix);
                const envs = yield docker.generateDockerEnvs(this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, httpParams, this.nasConfig, true, this.debugIde);
                if (this.debugPort && !this.runner) {
                    // don't reuse container
                    const cmd = docker.generateDockerCmd(this.runtime, false, this.functionConfig, true);
                    this.containerName = docker.generateRamdomContainerName();
                    const opts = yield dockerOpts.generateLocalInvokeOpts(this.runtime, this.containerName, this.mounts, cmd, this.debugPort, envs, this.dockerUser, this.debugIde);
                    yield docker.run(opts, event, outputStream, errorStream);
                    this.response(outputStream, errorStream, res);
                }
                else {
                    // reuse container
                    logger_1.default.debug('http doInvoke, acquire invoke lock');
                    if (runtime_1.isCustomContainerRuntime(this.runtime)) {
                        const fcReqHeaders = http_1.getFcReqHeaders(req.headers, uuid_1.v4(), envs);
                        if (this.functionConfig.initializer && this._invokeInitializer) {
                            logger_1.default.info('Initializing...');
                            const initRequestOpts = http_1.generateInitRequestOpts(req, this.functionConfig.caPort, fcReqHeaders);
                            const initResp = yield http_1.requestUntilServerUp(initRequestOpts, this.functionConfig.initializationTimeout || 3);
                            this._invokeInitializer = false;
                            logger_1.default.info(`Initializing done. StatusCode of response is ${initResp.statusCode}`);
                            logger_1.default.debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
                        }
                        const requestOpts = http_1.generateRequestOpts(req, this.functionConfig.caPort, fcReqHeaders, event);
                        const respOfCustomContainer = yield http_1.requestUntilServerUp(requestOpts, this.functionConfig.timeout || 3);
                        this.responseOfCustomContainer(res, respOfCustomContainer);
                    }
                    else {
                        const cmd = [dockerOpts.resolveMockScript(this.runtime), ...docker.generateDockerCmd(this.runtime, false, this.functionConfig, true, this._invokeInitializer, isWin ? event : null)];
                        logger_1.default.debug(`http doInvoke, cmd is : ${cmd}`);
                        if (!this.isAnonymous) {
                            // check signature
                            if (!(yield http_1.validateSignature(req, res, req.method))) {
                                return;
                            }
                        }
                        try {
                            yield this.runner.exec(cmd, {
                                env: envs,
                                outputStream,
                                errorStream,
                                verbose: true,
                                context: {
                                    serviceName: this.serviceName,
                                    functionName: this.functionName
                                },
                                event: !isWin ? event : null
                            });
                            this._invokeInitializer = false;
                        }
                        catch (error) {
                            logger_1.default.log(`Fc Error: ${errorStream.toString()}`, 'red');
                            // errors for runtime error
                            // for example, when using nodejs, use response.send(new Error('haha')) will lead to runtime error
                            // and container will auto exit, exec will receive no message
                            res.status(500);
                            res.setHeader('Content-Type', 'application/json');
                            res.send({
                                'errorMessage': `Process exited unexpectedly before completing request`
                            });
                            // for next invoke
                            this.runner = null;
                            this.containerName = docker.generateRamdomContainerName();
                            if (error.indexOf && error.indexOf('exited with code 137') > -1) { // receive signal SIGKILL http://tldp.org/LDP/abs/html/exitcodes.html
                                logger_1.default.debug(error);
                            }
                            else {
                                logger_1.default.error(error);
                            }
                            return;
                        }
                        this.response(outputStream, errorStream, res);
                    }
                    logger_1.default.debug('http doInvoke exec end, begin to response');
                }
            }));
        });
    }
    afterInvoke() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    responseOfCustomContainer(res, resp) {
        var { statusCode, headers, body } = resp;
        res.status(statusCode);
        res.set(headers);
        res.send(body);
    }
    // responseHttpTriggers
    response(outputStream, errorStream, res) {
        // todo: real-time processing ?
        const errorResponse = errorStream.toString();
        const { statusCode, headers, body, billedTime, memoryUsage } = http_1.parseOutputStream(outputStream);
        if (this.runtime === 'custom') {
            res.status(statusCode);
            res.set(headers);
            res.send(body);
        }
        else { // non custom http request
            // it's function status code and is not http trigger response status code
            if (is2xxStatusCode(statusCode)) {
                const base64HttpParams = headers[FC_HTTP_PARAMS];
                const httpParams = http_1.parseHttpTriggerHeaders(base64HttpParams) || {};
                res.status(httpParams.status || statusCode);
                const httpParamsHeaders = httpParams.headersMap || httpParams.headers || headers;
                for (const headerKey in httpParamsHeaders) {
                    if (!{}.hasOwnProperty.call(httpParamsHeaders, headerKey)) {
                        continue;
                    }
                    const headerValue = httpParamsHeaders[headerKey];
                    if (http_1.validateHeader(headerKey, headerValue)) {
                        res.setHeader(headerKey, headerValue);
                    }
                }
                res.send(body);
                if (errorResponse) {
                    logger_1.default.log(errorResponse, 'red');
                }
            }
            else {
                logger_1.default.log(errorResponse, 'red');
                logger_1.default.log(body, 'red');
                res.status(statusCode || 500);
                res.setHeader('Content-Type', 'application/json');
                if (body) {
                    res.send(body);
                }
                else {
                    res.send({
                        'errorMessage': `Process exited unexpectedly before completing request (duration: ${billedTime}ms, maxMemoryUsage: ${memoryUsage}MB)`
                    });
                }
            }
        }
    }
}
exports.default = HttpInvoke;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1pbnZva2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2ludm9rZS9odHRwLWludm9rZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUViLDREQUFtQztBQUNuQyxNQUFNLElBQUksR0FBUSxJQUFJLG9CQUFTLEVBQUUsQ0FBQztBQUNsQyw0REFBK0I7QUFLL0Isd0RBQTBDO0FBQzFDLCtDQUFpQztBQUNqQyxzQ0FBZ0Q7QUFDaEQsc0RBQThCO0FBQzlCLHlEQUEyQztBQUMzQyxrRUFBb0Q7QUFFcEQsTUFBTSxjQUFjLEdBQVcsa0JBQWtCLENBQUM7QUFFbEQsNkNBQWtEO0FBQ2xELGlDQUFnTztBQUNoTywrQkFBb0M7QUFDcEMscURBQW1FO0FBQ25FLGlFQUF5QztBQUV6QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQztBQUUzQyxTQUFTLGVBQWUsQ0FBQyxVQUFVO0lBQ2pDLE9BQU8sVUFBVSxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUVELE1BQXFCLFVBQVcsU0FBUSxnQkFBTTtJQU01QyxZQUFZLE1BQWMsRUFBRSxPQUFlLEVBQUUsYUFBNEIsRUFBRSxjQUE4QixFQUFFLGFBQTZCLEVBQUUsU0FBa0IsRUFBRSxRQUFjLEVBQUUsTUFBZSxFQUFFLFFBQWlCLEVBQUUsY0FBdUIsRUFBRSxZQUFrQixFQUFFLFNBQWUsRUFBRSxVQUFtQjtRQUNqUyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXZJLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxLQUFLLFdBQVcsSUFBSSxRQUFRLEtBQUssV0FBVyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFDL0IsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSTtRQUN0QixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztRQUV0QyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzlCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNoQixJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPO2FBQ1I7WUFFRCxnQkFBTSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsSUFBSSxjQUFjLEdBQUcscUJBQXFCLENBQUMsQ0FBQztZQUV4RixTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUV4QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNuQixJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1lBQzFELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7WUFFL0IsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDcEIsZ0JBQU0sQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztvQkFDbkUsSUFBSSxFQUFFLENBQUM7Z0JBQ1QsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxpREFBaUQ7UUFDNUQsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ2QsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztZQUVuRCxpREFBaUQ7WUFDakQsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFNUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDOUIsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsbUNBQW1DLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDNUQsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtnQkFDZCxlQUFlO2dCQUNmLGdCQUFNLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7Z0JBRXJELElBQUksVUFBVSxFQUFFO29CQUNkLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3hCLGdCQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixVQUFVLGtCQUFrQixDQUFDLENBQUM7aUJBQ2pFO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFSyxZQUFZOztZQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDbkIsa0JBQWtCO2dCQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFFaEIsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsK0NBQStDLENBQUMsQ0FBQztvQkFFOUQsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFTLEVBQUU7d0JBRXRDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFOzRCQUNoQixnQkFBTSxDQUFDLEtBQUssQ0FBQyxxREFBcUQsQ0FBQyxDQUFDOzRCQUVwRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLGtDQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQ0FDNUQsc0NBQXNDO2dDQUN0QyxNQUFNLEdBQUcsR0FBRyxNQUFNLGtCQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dDQUN2QyxJQUFJLENBQUMsT0FBTyxHQUFHLG9CQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtvQ0FDakMsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO3dDQUNoRCxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDeEIsQ0FBQztpQ0FDRixFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO29DQUNmLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTt3Q0FDZixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztxQ0FDaEM7eUNBQU07d0NBQ0wsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsc0RBQXNELENBQUMsQ0FBQztxQ0FDdEU7Z0NBQ0gsQ0FBQyxDQUFDLENBQUM7NkJBQ0o7NEJBRUQsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7eUJBQzNCOzZCQUFNOzRCQUNMLGdCQUFNLENBQUMsS0FBSyxDQUFDLHNFQUFzRSxDQUFDLENBQUM7eUJBQ3RGO29CQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7aUJBQ0o7YUFDRjtRQUNILENBQUM7S0FBQTtJQUVLLFlBQVk7O1lBQ2hCLE1BQU0sSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pPLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFOUUsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFDL0QsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUFDLE1BQU0sRUFDWCxHQUFHLEVBQ0gsSUFBSSxFQUNKO2dCQUNFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUMzQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLE1BQU0sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU07YUFDbkMsQ0FBQyxDQUFDO1lBQ0wsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLHVCQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDdkUsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO2dCQUM3QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7YUFDaEMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRUssa0JBQWtCOztZQUN0QixNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMxQixNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hDLENBQUM7S0FBQTtJQUVLLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRzs7WUFDckIsbUNBQW1DO1lBQ25DLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBUyxFQUFFO2dCQUN0QyxnQkFBTSxDQUFDLEtBQUssQ0FBQywwREFBMEQsQ0FBQyxDQUFDO2dCQUN6RSxNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ2pELE1BQU0sS0FBSyxHQUFHLE1BQU0scUJBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEMsTUFBTSxVQUFVLEdBQUcseUJBQWtCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFFaEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUV2TixJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO29CQUNsQyx3QkFBd0I7b0JBQ3hCLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUVyRixJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxDQUFDO29CQUUxRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyx1QkFBdUIsQ0FDbkQsSUFBSSxDQUFDLE9BQU8sRUFDWixJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQUMsTUFBTSxFQUNYLEdBQUcsRUFDSCxJQUFJLENBQUMsU0FBUyxFQUNkLElBQUksRUFDSixJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxRQUFRLENBQ2QsQ0FBQztvQkFFRixNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUNuQixLQUFLLEVBQ0wsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUM3QixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQy9DO3FCQUFNO29CQUNMLGtCQUFrQjtvQkFDbEIsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztvQkFDbkQsSUFBSSxrQ0FBd0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQzFDLE1BQU0sWUFBWSxHQUFHLHNCQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDbEUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7NEJBQzlELGdCQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7NEJBQy9CLE1BQU0sZUFBZSxHQUFHLDhCQUF1QixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQzs0QkFFL0YsTUFBTSxRQUFRLEdBQUcsTUFBTSwyQkFBb0IsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLENBQUMsQ0FBQzs0QkFDN0csSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQzs0QkFDaEMsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsZ0RBQWdELFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDOzRCQUNuRixnQkFBTSxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7eUJBQzVFO3dCQUNELE1BQU0sV0FBVyxHQUFHLDBCQUFtQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBRTlGLE1BQU0scUJBQXFCLEdBQUcsTUFBTSwyQkFBb0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ3hHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLENBQUMsQ0FBQztxQkFDNUQ7eUJBQU07d0JBQ0wsTUFBTSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFFckwsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEdBQUcsRUFBRSxDQUFDLENBQUM7d0JBRS9DLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFOzRCQUNyQixrQkFBa0I7NEJBQ2xCLElBQUksQ0FBQyxDQUFBLE1BQU0sd0JBQWlCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUEsRUFBRTtnQ0FBRSxPQUFPOzZCQUFFO3lCQUNoRTt3QkFFRCxJQUFJOzRCQUNGLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dDQUMxQixHQUFHLEVBQUUsSUFBSTtnQ0FDVCxZQUFZO2dDQUNaLFdBQVc7Z0NBQ1gsT0FBTyxFQUFFLElBQUk7Z0NBQ2IsT0FBTyxFQUFFO29DQUNQLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztvQ0FDN0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO2lDQUNoQztnQ0FDRCxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSTs2QkFDN0IsQ0FBQyxDQUFDOzRCQUVILElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7eUJBQ2pDO3dCQUFDLE9BQU8sS0FBSyxFQUFFOzRCQUNkLGdCQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBRXpELDJCQUEyQjs0QkFDM0Isa0dBQWtHOzRCQUNsRyw2REFBNkQ7NEJBQzdELEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQ2hCLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7NEJBRWxELEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0NBQ1AsY0FBYyxFQUFFLHVEQUF1RDs2QkFDeEUsQ0FBQyxDQUFDOzRCQUVILGtCQUFrQjs0QkFDbEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7NEJBQ25CLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLDJCQUEyQixFQUFFLENBQUM7NEJBQzFELElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxxRUFBcUU7Z0NBQ3RJLGdCQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDOzZCQUNyQjtpQ0FBTTtnQ0FDTCxnQkFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQzs2QkFDckI7NEJBQ0QsT0FBTzt5QkFDUjt3QkFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7cUJBQy9DO29CQUNELGdCQUFNLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7aUJBQzNEO1lBRUgsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTtJQUVLLFdBQVc7O1FBRWpCLENBQUM7S0FBQTtJQUdELHlCQUF5QixDQUFDLEdBQUcsRUFBRSxJQUFJO1FBQ2pDLElBQUksRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQztRQUN6QyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZCLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRUQsdUJBQXVCO0lBQ3ZCLFFBQVEsQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLEdBQUc7UUFDckMsK0JBQStCO1FBQy9CLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUU3QyxNQUFNLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxHQUFHLHdCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRS9GLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxRQUFRLEVBQUU7WUFDN0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN2QixHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDaEI7YUFBTSxFQUFFLDBCQUEwQjtZQUNqQyx5RUFBeUU7WUFDekUsSUFBSSxlQUFlLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQy9CLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUVqRCxNQUFNLFVBQVUsR0FBRyw4QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFFbkUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxDQUFDO2dCQUU1QyxNQUFNLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxVQUFVLElBQUksVUFBVSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUM7Z0JBQ2pGLEtBQUssTUFBTSxTQUFTLElBQUksaUJBQWlCLEVBQUU7b0JBQ3pDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsRUFBRTt3QkFBRSxTQUFTO3FCQUFFO29CQUV4RSxNQUFNLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFFakQsSUFBSSxxQkFBYyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsRUFBRTt3QkFDMUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7cUJBQ3ZDO2lCQUNGO2dCQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRWYsSUFBSSxhQUFhLEVBQUU7b0JBQ2pCLGdCQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztpQkFDbEM7YUFFRjtpQkFBTTtnQkFDTCxnQkFBTSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2pDLGdCQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFFeEIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUM7Z0JBQzlCLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBRWxELElBQUksSUFBSSxFQUFFO29CQUNSLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2hCO3FCQUFNO29CQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUM7d0JBQ1AsY0FBYyxFQUFFLG9FQUFvRSxVQUFVLHVCQUF1QixXQUFXLEtBQUs7cUJBQ3RJLENBQUMsQ0FBQztpQkFDSjthQUNGO1NBQ0Y7SUFDSCxDQUFDO0NBQ0Y7QUF2U0QsNkJBdVNDIn0=