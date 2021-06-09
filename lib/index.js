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
const base_1 = __importDefault(require("./common/base"));
const logger_1 = __importDefault(require("./common/logger"));
const _ = __importStar(require("lodash"));
const core = __importStar(require("@serverless-devs/core"));
const devs_1 = require("./lib/devs");
const debug_1 = require("./lib/debug");
const path = __importStar(require("path"));
const file_1 = require("./lib/utils/file");
const definition_1 = require("./lib/definition");
const path_1 = require("./lib/utils/path");
const event_start_1 = __importDefault(require("./lib/invoke/event-start"));
const tips_1 = require("./lib/utils/tips");
const http_support_1 = require("./lib/invoke/http-support");
const fc_1 = require("./lib/fc");
const value_1 = require("./lib/utils/value");
const local_invoke_1 = __importDefault(require("./lib/invoke/local-invoke"));
const static_1 = require("./lib/static");
const fs = __importStar(require("fs-extra"));
const express_1 = __importDefault(require("express"));
const app = express_1.default();
const serverPort = 8000;
const SUPPORTED_MODES = ['api', 'server', 'normal'];
class FcLocalInvokeComponent extends base_1.default {
    constructor(props) {
        super(props);
    }
    report(componentName, command, accountID, access) {
        return __awaiter(this, void 0, void 0, function* () {
            let uid = accountID;
            if (_.isEmpty(accountID)) {
                const credentials = yield core.getCredential(access);
                uid = credentials.AccountID;
            }
            try {
                core.reportComponent(componentName, {
                    command,
                    uid,
                });
            }
            catch (e) {
                logger_1.default.warning(`Component ${componentName} report error: ${e.message}`);
            }
        });
    }
    startExpress(app) {
        const server = app.listen(serverPort, function () {
            console.log(`function compute app listening on port ${serverPort}!`);
            console.log();
        });
        http_support_1.registerSigintForExpress(server);
    }
    handlerInputs(inputs) {
        return __awaiter(this, void 0, void 0, function* () {
            const project = inputs === null || inputs === void 0 ? void 0 : inputs.project;
            const access = project === null || project === void 0 ? void 0 : project.access;
            yield this.report('fc-local-invoke', inputs === null || inputs === void 0 ? void 0 : inputs.command, null, access);
            const properties = inputs === null || inputs === void 0 ? void 0 : inputs.props;
            const appName = inputs === null || inputs === void 0 ? void 0 : inputs.appName;
            const credentials = yield core.getCredential(access);
            // 去除 args 的行首以及行尾的空格
            const args = inputs === null || inputs === void 0 ? void 0 : inputs.args.replace(/(^\s*)|(\s*$)/g, '');
            const curPath = inputs === null || inputs === void 0 ? void 0 : inputs.path;
            const projectName = project === null || project === void 0 ? void 0 : project.projectName;
            const { region } = properties;
            const parsedArgs = core.commandParse({ args }, {
                boolean: ['help'],
                alias: { help: 'h' }
            });
            const argsData = (parsedArgs === null || parsedArgs === void 0 ? void 0 : parsedArgs.data) || {};
            if (argsData === null || argsData === void 0 ? void 0 : argsData.help) {
                return {
                    region,
                    credentials,
                    curPath,
                    args,
                    access,
                    isHelp: true
                };
            }
            const devsPath = curPath.configPath;
            const nasBaseDir = devs_1.detectNasBaseDir(devsPath);
            const baseDir = path.dirname(devsPath);
            const serviceConfig = properties === null || properties === void 0 ? void 0 : properties.service;
            const functionConfig = devs_1.updateCodeUriWithBuildPath(baseDir, properties === null || properties === void 0 ? void 0 : properties.function, serviceConfig.name);
            const triggerConfigList = properties === null || properties === void 0 ? void 0 : properties.triggers;
            const customDomainConfigList = properties === null || properties === void 0 ? void 0 : properties.customDomains;
            return {
                serviceConfig,
                functionConfig,
                triggerConfigList,
                customDomainConfigList,
                region,
                credentials,
                curPath,
                args,
                appName,
                projectName,
                devsPath,
                nasBaseDir,
                baseDir
            };
        });
    }
    /**
     * http 函数本地调试
     * @param inputs
     * @returns
     */
    start(inputs) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { serviceConfig, functionConfig, triggerConfigList, customDomainConfigList, region, args, devsPath, nasBaseDir, baseDir, isHelp } = yield this.handlerInputs(inputs);
            if (isHelp) {
                core.help(static_1.START_HELP_INFO);
                return;
            }
            const parsedArgs = core.commandParse({ args }, {
                boolean: ['debug', 'help'],
                alias: { 'help': 'h',
                    'config': 'c',
                    'debug-port': 'd'
                }
            });
            const argsData = (parsedArgs === null || parsedArgs === void 0 ? void 0 : parsedArgs.data) || {};
            const nonOptionsArgs = ((_a = parsedArgs.data) === null || _a === void 0 ? void 0 : _a._) || [];
            if (_.isEmpty(functionConfig)) {
                logger_1.default.error(`Please add function config in your s.yml/yaml and retry start.`);
                return {
                    status: 'failed'
                };
            }
            if (_.isEmpty(triggerConfigList)) {
                logger_1.default.error(`Please local invoke http function with 'start' method in fc-local-invoke component.`);
                return {
                    status: 'failed'
                };
            }
            if ((functionConfig === null || functionConfig === void 0 ? void 0 : functionConfig.codeUri) && !(yield fs.pathExists(functionConfig === null || functionConfig === void 0 ? void 0 : functionConfig.codeUri))) {
                logger_1.default.error(`Please make sure your codeUri: ${functionConfig.codeUri} exists and retry start.`);
                return {
                    status: 'failed'
                };
            }
            const { debugPort, debugIde, debuggerPath, debugArgs } = debug_1.getDebugOptions(argsData);
            const invokeName = nonOptionsArgs[0];
            logger_1.default.debug(`invokeName: ${invokeName}`);
            // TODO: debug mode for dotnetcore
            const serviceName = serviceConfig.name;
            const functionName = functionConfig.name;
            yield file_1.ensureFilesModified(devsPath);
            const httpTrigger = definition_1.findHttpTrigger(triggerConfigList);
            const [domainName, routePath] = definition_1.parseDomainRoutePath(invokeName);
            const routePaths = definition_1.getRoutePathsByDomainPath(customDomainConfigList, domainName, routePath);
            if (!_.isEmpty(routePaths)) {
                // 使用 customDomain 进行调试
                definition_1.checkCustomDomainConfig(serviceName, functionName, customDomainConfigList, domainName);
            }
            const router = express_1.default.Router({
                strict: true
            });
            const eager = !_.isNil(debugPort);
            yield http_support_1.registerHttpTriggerByRoutes(region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, routePaths, domainName, debugPort, debugIde, debuggerPath, debugArgs, nasBaseDir, eager);
            this.startExpress(app);
            tips_1.showTipsWithDomainIfNecessary(customDomainConfigList, domainName);
            return {
                status: 'succeed'
            };
        });
    }
    /**
     * event 函数本地调试
     * @param inputs
     * @returns
     */
    invoke(inputs) {
        return __awaiter(this, void 0, void 0, function* () {
            const { serviceConfig, functionConfig, triggerConfigList, region, args, devsPath, nasBaseDir, baseDir, projectName, isHelp } = yield this.handlerInputs(inputs);
            if (isHelp) {
                core.help(static_1.INVOKE_HELP_INFO);
                return;
            }
            const parsedArgs = core.commandParse({ args }, {
                boolean: ['debug'],
                alias: { 'help': 'h',
                    'config': 'c',
                    'mode': 'm',
                    'event': 'e',
                    'event-file': 'f',
                    'event-stdin': 's',
                    'debug-port': 'd'
                }
            });
            const argsData = (parsedArgs === null || parsedArgs === void 0 ? void 0 : parsedArgs.data) || {};
            if (_.isEmpty(functionConfig)) {
                logger_1.default.error(`Please add function config in your s.yml/yaml and retry start.`);
                return {
                    status: 'failed'
                };
            }
            if (!_.isEmpty(triggerConfigList)) {
                logger_1.default.error(`Please local invoke event function with 'invoke' method in fc-local-invoke component.`);
                return {
                    status: 'failed'
                };
            }
            if ((functionConfig === null || functionConfig === void 0 ? void 0 : functionConfig.codeUri) && !(yield fs.pathExists(functionConfig === null || functionConfig === void 0 ? void 0 : functionConfig.codeUri))) {
                logger_1.default.error(`Please make sure your codeUri: ${functionConfig.codeUri} exists and retry start.`);
                return {
                    status: 'failed'
                };
            }
            const { debugPort, debugIde, debuggerPath, debugArgs } = debug_1.getDebugOptions(argsData);
            // TODO: debug mode for dotnetcore
            const serviceName = serviceConfig === null || serviceConfig === void 0 ? void 0 : serviceConfig.name;
            const functionName = functionConfig === null || functionConfig === void 0 ? void 0 : functionConfig.name;
            const mode = argsData['mode'];
            if (mode && !SUPPORTED_MODES.includes(mode)) {
                throw new Error(`Unsupported mode: ${mode}`);
            }
            yield file_1.ensureFilesModified(devsPath);
            if (mode === 'api') {
                yield http_support_1.registerApis(region, devsPath, baseDir, app, serverPort, serviceConfig, functionConfig, debugPort, debugIde, debuggerPath, debugArgs, nasBaseDir);
                this.startExpress(app);
            }
            else if (mode == 'server') {
                const tmpDir = yield path_1.ensureTmpDir(null, devsPath, serviceName, functionName);
                const eventStart = new event_start_1.default(region, baseDir, serviceConfig, functionConfig, null, debugPort, debugIde, tmpDir, null, null, nasBaseDir);
                yield eventStart.init();
                logger_1.default.log(`Invoke with server mode done, please open a new terminal and execute 's exec ${projectName} -- invoke' to reuse the container.`, 'yellow');
                logger_1.default.log(`If you want to quit the server, please press Ctrl^C`, 'yellow');
            }
            else {
                const event = yield file_1.eventPriority(argsData);
                logger_1.default.debug(`event content: ${event}`);
                const codeUri = functionConfig.codeUri;
                const runtime = functionConfig.runtime;
                yield fc_1.detectLibrary(codeUri, runtime, baseDir, functionName);
                // env 'DISABLE_BIND_MOUNT_TMP_DIR' to disable bind mount of tmp dir.
                // libreoffice will be failed if /tmp directory is bind mount by docker.
                let absTmpDir;
                if (!process.env.DISABLE_BIND_MOUNT_TMP_DIR
                    || value_1.isFalseValue(process.env.DISABLE_BIND_MOUNT_TMP_DIR)) {
                    absTmpDir = yield path_1.ensureTmpDir(argsData['tmp-dir'], devsPath, serviceName, functionName);
                }
                logger_1.default.debug(`The temp directory mounted to /tmp is ${absTmpDir || 'null'}`);
                // Lazy loading to avoid stdin being taken over twice.
                let reuse = true;
                if (mode && mode === 'normal') {
                    reuse = false;
                }
                logger_1.default.debug(`reuse flag is ${reuse}`);
                const localInvoke = new local_invoke_1.default(region, baseDir, serviceConfig, functionConfig, null, debugPort, debugIde, absTmpDir, debuggerPath, debugArgs, reuse, nasBaseDir);
                // @ts-ignore
                yield localInvoke.invoke(event);
            }
            return {
                status: 'succeed',
                mode
            };
        });
    }
    help(inputs) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield this.report('fc-local-invoke', 'help', null, (_a = inputs === null || inputs === void 0 ? void 0 : inputs.project) === null || _a === void 0 ? void 0 : _a.access);
            core.help(static_1.COMPONENT_HELP_INFO);
        });
    }
}
exports.default = FcLocalInvokeComponent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseURBQTBDO0FBQzFDLDZEQUFxQztBQUVyQywwQ0FBNEI7QUFDNUIsNERBQThDO0FBSzlDLHFDQUEwRTtBQUMxRSx1Q0FBOEM7QUFDOUMsMkNBQTZCO0FBQzdCLDJDQUFzRTtBQUN0RSxpREFBNkg7QUFDN0gsMkNBQWdEO0FBQ2hELDJFQUFrRDtBQUNsRCwyQ0FBaUU7QUFDakUsNERBQWdIO0FBQ2hILGlDQUF5QztBQUN6Qyw2Q0FBaUQ7QUFDakQsNkVBQW9EO0FBQ3BELHlDQUFzRjtBQUN0Riw2Q0FBK0I7QUFDL0Isc0RBQThCO0FBQzlCLE1BQU0sR0FBRyxHQUFRLGlCQUFPLEVBQUUsQ0FBQztBQUUzQixNQUFNLFVBQVUsR0FBVyxJQUFJLENBQUM7QUFDaEMsTUFBTSxlQUFlLEdBQWEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzlELE1BQXFCLHNCQUF1QixTQUFRLGNBQWE7SUFDL0QsWUFBWSxLQUFLO1FBQ2YsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2QsQ0FBQztJQUVLLE1BQU0sQ0FBQyxhQUFxQixFQUFFLE9BQWUsRUFBRSxTQUFrQixFQUFFLE1BQWU7O1lBQ3RGLElBQUksR0FBRyxHQUFXLFNBQVMsQ0FBQztZQUM1QixJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3hCLE1BQU0sV0FBVyxHQUFpQixNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25FLEdBQUcsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO2FBQzdCO1lBQ0QsSUFBSTtnQkFDRixJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRTtvQkFDbEMsT0FBTztvQkFDUCxHQUFHO2lC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