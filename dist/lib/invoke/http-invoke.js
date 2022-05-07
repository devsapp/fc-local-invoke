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
const async_lock_1 = __importDefault(require("async-lock"));
const lock = new async_lock_1.default();
const node_watch_1 = __importDefault(require("node-watch"));
const core = __importStar(require("@serverless-devs/core"));
const streams = __importStar(require("memory-streams"));
const rimraf = __importStar(require("rimraf"));
const invoke_1 = __importDefault(require("./invoke"));
const docker = __importStar(require("../docker/docker"));
const dockerOpts = __importStar(require("../docker/docker-opts"));
const docker_1 = require("../docker/docker");
const http_1 = require("./http");
const uuid_1 = require("uuid");
const runtime_1 = require("../common/model/runtime");
const logger_1 = __importDefault(require("../../common/logger"));
const FC_HTTP_PARAMS = 'x-fc-http-params';
const isWin = process.platform === 'win32';
function is2xxStatusCode(statusCode) {
    return statusCode && statusCode.startsWith('2');
}
class HttpInvoke extends invoke_1.default {
    constructor(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, authType, endpointPrefix, debuggerPath, debugArgs, nasBaseDir) {
        super(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
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
            logger_1.default.info(`Detect code changes, file is ${name}, event is ${evt}, auto reloading...`);
            oldRunner = this.runner;
            this.runner = null;
            this.containerName = docker.generateRamdomContainerName();
            this._invokeInitializer = true;
            setTimeout(() => {
                this.init().then(() => {
                    logger_1.default.info('Reloading success, stop old container background...');
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
                logger_1.default.info('Stopping old container successfully\n');
                if (tmpCodeDir) {
                    rimraf.sync(tmpCodeDir);
                    logger_1.default.info(`Clean tmp code dir ${tmpCodeDir} successfully.\n`);
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
                            if (!this.watcher && !(0, runtime_1.isCustomContainerRuntime)(this.runtime)) {
                                // add file ignore when auto reloading
                                const ign = yield this.getCodeIgnore();
                                this.watcher = (0, node_watch_1.default)(this.codeUri, {
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
            const envs = yield docker.generateDockerEnvs(this.creds, this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);
            const cmd = docker.generateDockerCmd(this.runtime, true, this.functionConfig);
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
            const opts = yield dockerOpts.generateLocalStartOpts(this.runtime, this.containerName, this.mounts, cmd, envs, this.limitedHostConfig, {
                debugPort: this.debugPort,
                dockerUser: this.dockerUser,
                imageName: this.imageName,
                caPort: this.functionConfig.caPort
            });
            this.runner = yield (0, docker_1.startContainer)(opts, process.stdout, process.stderr, {
                serviceName: this.serviceName,
                functionName: this.functionName,
                caPort: this.functionConfig.caPort
            });
        });
    }
    initAndStartRunner() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            yield this._startRunner();
            yield this.setDebugIdeConfig();
        });
    }
    doInvoke(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // only one invoke can be processed
            yield lock.acquire('invoke', () => __awaiter(this, void 0, void 0, function* () {
                logger_1.default.debug('http doInvoke, aquire invoke lock success, processing...');
                const outputStream = new streams.WritableStream();
                const errorStream = new streams.WritableStream();
                const event = yield (0, http_1.getHttpRawBody)(req);
                const httpParams = (0, http_1.generateHttpParams)(req, this.endpointPrefix);
                const envs = yield docker.generateDockerEnvs(this.creds, this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, httpParams, this.nasConfig, true, this.debugIde);
                if (this.debugPort && !this.runner) {
                    // don't reuse container
                    const cmd = docker.generateDockerCmd(this.runtime, false, this.functionConfig, true);
                    this.containerName = docker.generateRamdomContainerName();
                    const opts = yield dockerOpts.generateLocalInvokeOpts(this.runtime, this.containerName, this.mounts, cmd, this.debugPort, envs, this.limitedHostConfig, this.dockerUser, this.debugIde);
                    yield docker.run(opts, event, outputStream, errorStream);
                    this.response(outputStream, errorStream, res);
                }
                else {
                    // reuse container
                    logger_1.default.debug('http doInvoke, acquire invoke lock');
                    if ((0, runtime_1.isCustomContainerRuntime)(this.runtime) || (0, runtime_1.isCustomRuntime)(this.runtime)) {
                        const fcReqHeaders = (0, http_1.getFcReqHeaders)(req.headers, (0, uuid_1.v4)(), envs);
                        if (this.functionConfig.initializer && this._invokeInitializer) {
                            logger_1.default.info('Initializing...');
                            const initRequestOpts = (0, http_1.generateInitRequestOpts)(req, this.functionConfig.caPort, fcReqHeaders);
                            const initResp = yield (0, http_1.requestUntilServerUp)(initRequestOpts, this.functionConfig.initializationTimeout || 3);
                            this._invokeInitializer = false;
                            logger_1.default.info(`Initializing done. StatusCode of response is ${initResp.statusCode}`);
                            logger_1.default.debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
                        }
                        const requestOpts = (0, http_1.generateRequestOpts)(req, this.functionConfig.caPort, fcReqHeaders, event);
                        const respOfCustomContainer = yield (0, http_1.requestUntilServerUp)(requestOpts, this.functionConfig.timeout || 3);
                        this.responseOfCustomContainer(res, respOfCustomContainer);
                    }
                    else {
                        const cmd = [dockerOpts.resolveMockScript(this.runtime), ...docker.generateDockerCmd(this.runtime, false, this.functionConfig, true, this._invokeInitializer, isWin ? event : null)];
                        logger_1.default.debug(`http doInvoke, cmd is : ${cmd}`);
                        if (!this.isAnonymous) {
                            // check signature
                            if (!(yield (0, http_1.validateSignature)(req, res, req.method, this.creds))) {
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
        const { statusCode, headers, body, billedTime, memoryUsage } = (0, http_1.parseOutputStream)(outputStream);
        if ((0, runtime_1.isCustomRuntime)(this.runtime)) {
            res.status(statusCode);
            res.set(headers);
            res.send(body);
        }
        else { // non custom http request
            // it's function status code and is not http trigger response status code
            if (is2xxStatusCode(statusCode)) {
                const base64HttpParams = headers[FC_HTTP_PARAMS];
                const httpParams = (0, http_1.parseHttpTriggerHeaders)(base64HttpParams) || {};
                res.status(httpParams.status || statusCode);
                const httpParamsHeaders = httpParams.headersMap || httpParams.headers || headers;
                for (const headerKey in httpParamsHeaders) {
                    if (!{}.hasOwnProperty.call(httpParamsHeaders, headerKey)) {
                        continue;
                    }
                    const headerValue = httpParamsHeaders[headerKey];
                    if ((0, http_1.validateHeader)(headerKey, headerValue)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1pbnZva2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2ludm9rZS9odHRwLWludm9rZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFYiw0REFBbUM7QUFDbkMsTUFBTSxJQUFJLEdBQVEsSUFBSSxvQkFBUyxFQUFFLENBQUM7QUFDbEMsNERBQStCO0FBSy9CLDREQUE4QztBQUM5Qyx3REFBMEM7QUFDMUMsK0NBQWlDO0FBQ2pDLHNEQUE4QjtBQUM5Qix5REFBMkM7QUFDM0Msa0VBQW9EO0FBQ3BELDZDQUFrRDtBQUNsRCxpQ0FBZ087QUFDaE8sK0JBQW9DO0FBQ3BDLHFEQUFvRjtBQUNwRixpRUFBeUM7QUFHekMsTUFBTSxjQUFjLEdBQVcsa0JBQWtCLENBQUM7QUFFbEQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUM7QUFFM0MsU0FBUyxlQUFlLENBQUMsVUFBVTtJQUNqQyxPQUFPLFVBQVUsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xELENBQUM7QUFFRCxNQUFxQixVQUFXLFNBQVEsZ0JBQU07SUFPNUMsWUFBWSxLQUFtQixFQUFFLE1BQWMsRUFBRSxPQUFlLEVBQUUsYUFBNEIsRUFBRSxjQUE4QixFQUFFLGFBQTZCLEVBQUUsU0FBa0IsRUFBRSxRQUFjLEVBQUUsTUFBZSxFQUFFLFFBQWlCLEVBQUUsY0FBdUIsRUFBRSxZQUFrQixFQUFFLFNBQWUsRUFBRSxVQUFtQjtRQUN0VCxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUU5SSxJQUFJ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