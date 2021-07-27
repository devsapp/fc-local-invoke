"use strict";
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
exports.registerApis = exports.registerSigintForExpress = exports.registerSingleHttpTrigger = exports.registerHttpTriggerByRoutes = void 0;
const logger_1 = __importDefault(require("../../common/logger"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const _ = __importStar(require("lodash"));
const fc_1 = require("../fc");
const path_1 = require("../utils/path");
const http_invoke_1 = __importDefault(require("../invoke/http-invoke"));
const api_invoke_1 = __importDefault(require("../invoke/api-invoke"));
const cors_1 = require("../cors");
const SERVER_CLOSE_TIMEOUT = 3000;
function registerHttpTriggerByRoutes(creds, region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, routePaths, domainName, debugPort, debugIde, debuggerPath, debugArgs, nasBaseDir, eager) {
    return __awaiter(this, void 0, void 0, function* () {
        if (_.isEmpty(routePaths)) {
            yield registerSingleHttpTrigger(creds, region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, null, domainName, debugPort, debugIde, eager, debuggerPath, debugArgs, nasBaseDir);
        }
        else {
            for (const routePath of routePaths) {
                yield registerSingleHttpTrigger(creds, region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, routePath, domainName, debugPort, debugIde, eager, debuggerPath, debugArgs, nasBaseDir);
            }
        }
    });
}
exports.registerHttpTriggerByRoutes = registerHttpTriggerByRoutes;
function registerSingleHttpTrigger(creds, region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, routePath, domainName, debugPort, debugIde, eager = false, debuggerPath, debugArgs, nasBaseDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const serviceName = serviceConfig.name;
        const functionName = functionConfig.name;
        const triggerName = httpTrigger.name;
        logger_1.default.debug(`serviceName: ${serviceName}`);
        logger_1.default.debug(`functionName: ${functionName}`);
        logger_1.default.debug(`tiggerName: ${triggerName}`);
        logger_1.default.debug(`httpTrigger: ${js_yaml_1.default.dump(httpTrigger)}`);
        logger_1.default.debug(`domainName: ${domainName}`);
        logger_1.default.debug(`routePath: ${routePath}`);
        const isCustomDomain = routePath;
        const httpTriggerPrefix = `/2016-08-15/proxy/${serviceName}/${functionName}`;
        const customDomainPrefix = routePath;
        const endpointForRoute = isCustomDomain ? customDomainPrefix : `${httpTriggerPrefix}/*`;
        let endpointForDisplay = endpointForRoute;
        if (_.endsWith(endpointForDisplay, '*')) {
            endpointForDisplay = endpointForDisplay.substr(0, endpointForDisplay.length - 1);
        }
        const endpointPrefix = isCustomDomain ? '' : httpTriggerPrefix;
        const triggerConfig = httpTrigger.config;
        const httpMethods = triggerConfig.methods;
        const authType = triggerConfig.authType;
        const codeUri = functionConfig.codeUri;
        const runtime = functionConfig.runtime;
        logger_1.default.debug(`debug port: ${debugPort}`);
        yield fc_1.detectLibrary(codeUri, runtime, baseDir, functionName);
        const tmpDir = yield path_1.ensureTmpDir(null, devsPath, serviceName, functionName);
        const httpInvoke = new http_invoke_1.default(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, authType, endpointPrefix, debuggerPath, debugArgs, nasBaseDir);
        if (eager) {
            yield httpInvoke.initAndStartRunner();
        }
        app.use(cors_1.setCORSHeaders);
        app.use(router);
        for (let method of httpMethods) {
            router[method.toLowerCase()](endpointForRoute, (req, res) => __awaiter(this, void 0, void 0, function* () {
                if (req.get('Upgrade') === 'websocket') {
                    res.status(403).send('websocket not support');
                    return;
                }
                // Avoid get /favicon.ico, refer to: https://stackoverflow.com/questions/35408729/express-js-prevent-get-favicon-ico
                if (_.isEqual(req.path, '/favicon.ico')) {
                    logger_1.default.debug(`Response '204 No Content' status when request path is: /favicon.ico`);
                    res.status(204).end();
                    return;
                }
                yield httpInvoke.invoke(req, res);
            }));
        }
        printHttpTriggerTips(serverPort, serviceName, functionName, triggerName, endpointForDisplay, httpMethods, authType, domainName);
    });
}
exports.registerSingleHttpTrigger = registerSingleHttpTrigger;
function printHttpTriggerTips(serverPort, serviceName, functionName, triggerName, endpoint, httpMethods, authType, domainName) {
    const prefix = domainName ? `CustomDomain ${domainName}` : `HttpTrigger ${triggerName}`;
    logger_1.default.info(`${prefix} of ${serviceName}/${functionName} was registered`);
    logger_1.default.log('\turl: ' + `http://localhost:${serverPort}${endpoint}`, 'yellow');
    logger_1.default.log(`\tmethods: ` + httpMethods, 'yellow');
    logger_1.default.log(`\tauthType: ` + authType, 'yellow');
}
function registerSigintForExpress(server) {
    var sockets = {}, nextSocketId = 0;
    // close express server
    // https://stackoverflow.com/questions/14626636/how-do-i-shutdown-a-node-js-https-server-immediately/14636625#14636625
    server.on('connection', function (socket) {
        let socketId = nextSocketId++;
        sockets[socketId] = socket;
        socket.on('close', function () {
            delete sockets[socketId];
        });
    });
    process.once('SIGINT', () => {
        console.log('begin to close server');
        // force close if gracefully closing failed
        // https://stackoverflow.com/a/36830072/6602338
        const serverCloseTimeout = setTimeout(() => {
            console.log('server close timeout, force to close server');
            server.emit('close');
            // if force close failed, exit directly
            setTimeout(() => {
                process.exit(-1); // eslint-disable-line
            }, SERVER_CLOSE_TIMEOUT);
        }, SERVER_CLOSE_TIMEOUT);
        // gracefully close server
        server.close(() => {
            clearTimeout(serverCloseTimeout);
        });
        for (let socketId in sockets) {
            if (!{}.hasOwnProperty.call(sockets, socketId)) {
                continue;
            }
            sockets[socketId].destroy();
        }
    });
}
exports.registerSigintForExpress = registerSigintForExpress;
function registerApis(creds, region, devsPath, baseDir, app, serverPort, serviceConfig, functionConfig, debugPort, debugIde, debuggerPath, debugArgs, nasBaseDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const serviceName = serviceConfig.name;
        const functionName = functionConfig.name;
        const endpoint = `/2016-08-15/services/${serviceName}/functions/${functionName}/invocations`;
        const tmpDir = yield path_1.ensureTmpDir(null, devsPath, serviceName, functionName);
        const apiInvoke = new api_invoke_1.default(creds, region, baseDir, serviceConfig, functionConfig, null, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
        const codeUri = functionConfig.codeUri;
        const runtime = functionConfig.runtime;
        yield fc_1.detectLibrary(codeUri, runtime, baseDir, functionName);
        app.post(endpoint, (req, res) => __awaiter(this, void 0, void 0, function* () {
            // @ts-ignore
            apiInvoke.invoke(req, res);
        }));
        logsApi(serverPort, serviceName, functionName, endpoint);
        console.log();
    });
}
exports.registerApis = registerApis;
function logsApi(serverPort, serviceName, functionName, endpoint) {
    logger_1.default.log(`API ${serviceName}/${functionName} was registered`, 'green');
    logger_1.default.log('\turl: ' + `http://localhost:${serverPort}${endpoint}/`, 'yellow');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1zdXBwb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvaHR0cC1zdXBwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpRUFBeUM7QUFJekMsc0RBQTJCO0FBQzNCLDBDQUE0QjtBQUM1Qiw4QkFBc0M7QUFDdEMsd0NBQTZDO0FBQzdDLHdFQUErQztBQUMvQyxzRUFBNkM7QUFDN0Msa0NBQXlDO0FBR3pDLE1BQU0sb0JBQW9CLEdBQVcsSUFBSSxDQUFDO0FBRzFDLFNBQXNCLDJCQUEyQixDQUFDLEtBQW1CLEVBQUUsTUFBYyxFQUFFLFFBQWdCLEVBQUUsT0FBZSxFQUFFLEdBQVEsRUFBRSxNQUFXLEVBQUUsVUFBa0IsRUFBRSxXQUEwQixFQUFFLGFBQTRCLEVBQUUsY0FBOEIsRUFBRSxVQUFxQixFQUFFLFVBQW1CLEVBQUUsU0FBa0IsRUFBRSxRQUFjLEVBQUUsWUFBcUIsRUFBRSxTQUFlLEVBQUUsVUFBbUIsRUFBRSxLQUFlOztRQUN6WixJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDekIsTUFBTSx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1NBQzNOO2FBQU07WUFDTCxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRTtnQkFDbEMsTUFBTSx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxVQUFV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