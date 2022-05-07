"use strict";
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
        yield (0, fc_1.detectLibrary)(codeUri, runtime, baseDir, functionName);
        const tmpDir = yield (0, path_1.ensureTmpDir)(null, devsPath, serviceName, functionName);
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
        const tmpDir = yield (0, path_1.ensureTmpDir)(null, devsPath, serviceName, functionName);
        const apiInvoke = new api_invoke_1.default(creds, region, baseDir, serviceConfig, functionConfig, null, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
        const codeUri = functionConfig.codeUri;
        const runtime = functionConfig.runtime;
        yield (0, fc_1.detectLibrary)(codeUri, runtime, baseDir, functionName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1zdXBwb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9pbnZva2UvaHR0cC1zdXBwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUVBQXlDO0FBSXpDLHNEQUEyQjtBQUMzQiwwQ0FBNEI7QUFDNUIsOEJBQXNDO0FBQ3RDLHdDQUE2QztBQUM3Qyx3RUFBK0M7QUFDL0Msc0VBQTZDO0FBQzdDLGtDQUF5QztBQUd6QyxNQUFNLG9CQUFvQixHQUFXLElBQUksQ0FBQztBQUcxQyxTQUFzQiwyQkFBMkIsQ0FBQyxLQUFtQixFQUFFLE1BQWMsRUFBRSxRQUFnQixFQUFFLE9BQWUsRUFBRSxHQUFRLEVBQUUsTUFBVyxFQUFFLFVBQWtCLEVBQUUsV0FBMEIsRUFBRSxhQUE0QixFQUFFLGNBQThCLEVBQUUsVUFBcUIsRUFBRSxVQUFtQixFQUFFLFNBQWtCLEVBQUUsUUFBYyxFQUFFLFlBQXFCLEVBQUUsU0FBZSxFQUFFLFVBQW1CLEVBQUUsS0FBZTs7UUFDelosSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3pCLE1BQU0seUJBQXlCLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztTQUMzTjthQUFNO1lBQ0wsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUU7Z0JBQ2xDLE1BQU0seUJBQXlCLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUs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