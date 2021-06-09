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
function registerHttpTriggerByRoutes(region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, routePaths, domainName, debugPort, debugIde, debuggerPath, debugArgs, nasBaseDir, eager) {
    return __awaiter(this, void 0, void 0, function* () {
        if (_.isEmpty(routePaths)) {
            yield registerSingleHttpTrigger(region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, null, domainName, debugPort, debugIde, eager, debuggerPath, debugArgs, nasBaseDir);
        }
        else {
            for (const routePath of routePaths) {
                yield registerSingleHttpTrigger(region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, routePath, domainName, debugPort, debugIde, eager, debuggerPath, debugArgs, nasBaseDir);
            }
        }
    });
}
exports.registerHttpTriggerByRoutes = registerHttpTriggerByRoutes;
function registerSingleHttpTrigger(region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, routePath, domainName, debugPort, debugIde, eager = false, debuggerPath, debugArgs, nasBaseDir) {
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
        const httpInvoke = new http_invoke_1.default(region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, authType, endpointPrefix, debuggerPath, debugArgs, nasBaseDir);
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
                // @ts-ignore
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
function registerApis(region, devsPath, baseDir, app, serverPort, serviceConfig, functionConfig, debugPort, debugIde, debuggerPath, debugArgs, nasBaseDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const serviceName = serviceConfig.name;
        const functionName = functionConfig.name;
        const endpoint = `/2016-08-15/services/${serviceName}/functions/${functionName}/invocations`;
        const tmpDir = yield path_1.ensureTmpDir(null, devsPath, serviceName, functionName);
        const apiInvoke = new api_invoke_1.default(region, baseDir, serviceConfig, functionConfig, null, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1zdXBwb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvaHR0cC1zdXBwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpRUFBeUM7QUFJekMsc0RBQTJCO0FBQzNCLDBDQUE0QjtBQUM1Qiw4QkFBc0M7QUFDdEMsd0NBQTZDO0FBQzdDLHdFQUErQztBQUMvQyxzRUFBNkM7QUFDN0Msa0NBQXlDO0FBRXpDLE1BQU0sb0JBQW9CLEdBQVcsSUFBSSxDQUFDO0FBRzFDLFNBQXNCLDJCQUEyQixDQUFDLE1BQWMsRUFBRSxRQUFnQixFQUFFLE9BQWUsRUFBRSxHQUFRLEVBQUUsTUFBVyxFQUFFLFVBQWtCLEVBQUUsV0FBMEIsRUFBRSxhQUE0QixFQUFFLGNBQThCLEVBQUUsVUFBcUIsRUFBRSxVQUFtQixFQUFFLFNBQWtCLEVBQUUsUUFBYyxFQUFFLFlBQXFCLEVBQUUsU0FBZSxFQUFFLFVBQW1CLEVBQUUsS0FBZTs7UUFDcFksSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3pCLE1BQU0seUJBQXlCLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1NBQ3BOO2FBQU07WUFDTCxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRTtnQkFDbEMsTUFBTSx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLGNBQWMs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