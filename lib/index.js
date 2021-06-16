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
const stdout_formatter_1 = __importDefault(require("./lib/component/stdout-formatter"));
const express_1 = __importDefault(require("express"));
const app = express_1.default();
const MIN_SERVER_PORT = 7000;
const MAX_SERVER_PORT = 8000;
const serverPort = parseInt(_.toString(Math.random() * (MAX_SERVER_PORT - MIN_SERVER_PORT + 1) + MIN_SERVER_PORT), 10);
;
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
                logger_1.default.warning(stdout_formatter_1.default.stdoutFormatter.warn('component report', `component name: ${componentName}, method: ${command}`, e.message));
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
            yield stdout_formatter_1.default.initStdout();
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
            if (!_.isEmpty(triggerConfigList) && definition_1.includeHttpTrigger(triggerConfigList)) {
                logger_1.default.error(`Please local invoke non-http function with 'invoke' method in fc-local-invoke component.`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseURBQTBDO0FBQzFDLDZEQUFxQztBQUVyQywwQ0FBNEI7QUFDNUIsNERBQThDO0FBSzlDLHFDQUEwRTtBQUMxRSx1Q0FBOEM7QUFDOUMsMkNBQTZCO0FBQzdCLDJDQUFzRTtBQUN0RSxpREFBaUo7QUFDakosMkNBQWdEO0FBQ2hELDJFQUFrRDtBQUNsRCwyQ0FBaUU7QUFDakUsNERBQWdIO0FBQ2hILGlDQUF5QztBQUN6Qyw2Q0FBaUQ7QUFDakQsNkVBQW9EO0FBQ3BELHlDQUFzRjtBQUN0Riw2Q0FBK0I7QUFDL0Isd0ZBQStEO0FBQy9ELHNEQUE4QjtBQUM5QixNQUFNLEdBQUcsR0FBUSxpQkFBTyxFQUFFLENBQUM7QUFFM0IsTUFBTSxlQUFlLEdBQVcsSUFBSSxDQUFDO0FBQ3JDLE1BQU0sZUFBZSxHQUFXLElBQUksQ0FBQztBQUVyQyxNQUFNLFVBQVUsR0FBVyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUMsQ0FBQyxlQUFlLEdBQUMsZUFBZSxHQUFDLENBQUMsQ0FBQyxHQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQUMsQ0FBQztBQUN6SCxNQUFNLGVBQWUsR0FBYSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDOUQsTUFBcUIsc0JBQXVCLFNBQVEsY0FBYTtJQUMvRCxZQUFZLEtBQUs7UUFDZixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDZCxDQUFDO0lBRUssTUFBTSxDQUFDLGFBQXFCLEVBQUUsT0FBZSxFQUFFLFNBQWtCLEVBQUUsTUFBZTs7WUFDdEYsSUFBSSxHQUFHLEdBQVcsU0FBUyxDQUFDO1lBQzVCLElBQUksQ0FBQyxDQUFDLE9B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