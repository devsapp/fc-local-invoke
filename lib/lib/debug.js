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
exports.generateVscodeDebugConfig = exports.generateDebugEnv = exports.generateDockerDebugOpts = exports.getDebugOptions = void 0;
const ip = __importStar(require("ip"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("../common/logger"));
const IDE_PYCHARM = 'pycharm';
function getDebugOptions(argsData) {
    const debugPort = argsData['debug-port'];
    logger_1.default.debug(`debugPort: ${debugPort}`);
    const debugIde = argsData['config'];
    logger_1.default.debug(`debugIde: ${debugIde}`);
    const debuggerPath = argsData['debugger-path'];
    logger_1.default.debug(`debuggerPath: ${debuggerPath}`);
    const debugArgs = argsData['debug-args'];
    logger_1.default.debug(`debugArgs: ${JSON.stringify(debugArgs)}`);
    return {
        debugPort,
        debugIde,
        debuggerPath,
        debugArgs
    };
}
exports.getDebugOptions = getDebugOptions;
function generateDockerDebugOpts(runtime, debugPort, debugIde) {
    const exposedPort = `${debugPort}/tcp`;
    if (debugIde === IDE_PYCHARM) {
        if (runtime !== 'python2.7' && runtime !== 'python3') {
            throw new Error(`${IDE_PYCHARM} debug config only support for runtime [python2.7, python3]`);
        }
        else {
            return {};
        }
    }
    else if (runtime === 'php7.2') {
        return {};
    }
    else {
        return {
            ExposedPorts: {
                [exposedPort]: {}
            },
            HostConfig: {
                PortBindings: {
                    [exposedPort]: [
                        {
                            'HostIp': '',
                            'HostPort': `${debugPort}`
                        }
                    ]
                }
            }
        };
    }
}
exports.generateDockerDebugOpts = generateDockerDebugOpts;
function generateDebugEnv(runtime, debugPort, debugIde) {
    const remoteIp = ip.address();
    switch (runtime) {
        case 'nodejs12':
        case 'nodejs10':
        case 'nodejs8':
            return { 'DEBUG_OPTIONS': `--inspect-brk=0.0.0.0:${debugPort}` };
        case 'nodejs6':
            return { 'DEBUG_OPTIONS': `--debug-brk=${debugPort}` };
        case 'python2.7':
        case 'python3':
            if (debugIde === IDE_PYCHARM) {
                return {};
            }
            return { 'DEBUG_OPTIONS': `-m ptvsd --host 0.0.0.0 --port ${debugPort} --wait` };
        case 'java8':
        case 'java11':
            return { 'DEBUG_OPTIONS': `-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=${debugPort}` };
        case 'php7.2':
            console.log(`using remote_ip ${remoteIp}`);
            return { 'XDEBUG_CONFIG': `remote_enable=1 remote_autostart=1 remote_port=${debugPort} remote_host=${remoteIp}` };
        case 'dotnetcore2.1':
            return { 'DEBUG_OPTIONS': 'true' };
        default:
            throw new Error('could not found runtime.');
    }
}
exports.generateDebugEnv = generateDebugEnv;
function generateVscodeDebugConfig(serviceName, functionName, runtime, codePath, debugPort) {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = yield fs.lstat(codePath);
        if (!stats.isDirectory()) {
            codePath = path.dirname(codePath);
        }
        switch (runtime) {
            case 'nodejs6':
                return {
                    'version': '0.2.0',
                    'configurations': [
                        {
                            'name': `fc/${serviceName}/${functionName}`,
                            'type': 'node',
                            'request': 'attach',
                            'address': 'localhost',
                            'port': debugPort,
                            'localRoot': `${codePath}`,
                            'remoteRoot': '/code',
                            'protocol': 'legacy',
                            'stopOnEntry': false
                        }
                    ]
                };
            case 'nodejs12':
            case 'nodejs10':
            case 'nodejs8':
                return {
                    'version': '0.2.0',
                    'configurations': [
                        {
                            'name': `fc/${serviceName}/${functionName}`,
                            'type': 'node',
                            'request': 'attach',
                            'address': 'localhost',
                            'port': debugPort,
                            'localRoot': `${codePath}`,
                            'remoteRoot': '/code',
                            'protocol': 'inspector',
                            'stopOnEntry': false
                        }
                    ]
                };
            case 'python3':
            case 'python2.7':
                return {
                    'version': '0.2.0',
                    'configurations': [
                        {
                            'name': `fc/${serviceName}/${functionName}`,
                            'type': 'python',
                            'request': 'attach',
                            'host': 'localhost',
                            'port': debugPort,
                            'pathMappings': [
                                {
                                    'localRoot': `${codePath}`,
                                    'remoteRoot': '/code'
                                }
                            ]
                        }
                    ]
                };
            case 'java8':
            case 'java11':
                return {
                    'version': '0.2.0',
                    'configurations': [
                        {
                            'name': `fc/${serviceName}/${functionName}`,
                            'type': 'java',
                            'request': 'attach',
                            'hostName': 'localhost',
                            'port': debugPort
                        }
                    ]
                };
            case 'php7.2':
                return {
                    'version': '0.2.0',
                    'configurations': [
                        {
                            'name': `fc/${serviceName}/${functionName}`,
                            'type': 'php',
                            'request': 'launch',
                            'port': debugPort,
                            'stopOnEntry': false,
                            'pathMappings': {
                                '/code': `${codePath}`
                            },
                            'ignore': [
                                '/var/fc/runtime/**'
                            ]
                        }
                    ]
                };
            case 'dotnetcore2.1':
                return {
                    'version': '0.2.0',
                    'configurations': [
                        {
                            'name': `fc/${serviceName}/${functionName}`,
                            'type': 'coreclr',
                            'request': 'attach',
                            'processName': 'dotnet',
                            'pipeTransport': {
                                'pipeProgram': 'sh',
                                'pipeArgs': [
                                    '-c',
                                    `docker exec -i $(docker ps -q -f publish=${debugPort}) \${debuggerCommand}`
                                ],
                                'debuggerPath': '/vsdbg/vsdbg',
                                'pipeCwd': '${workspaceFolder}'
                            },
                            'windows': {
                                'pipeTransport': {
                                    'pipeProgram': 'powershell',
                                    'pipeArgs': [
                                        '-c',
                                        `docker exec -i $(docker ps -q -f publish=${debugPort}) \${debuggerCommand}`
                                    ],
                                    'debuggerPath': '/vsdbg/vsdbg',
                                    'pipeCwd': '${workspaceFolder}'
                                }
                            },
                            'sourceFileMap': {
                                '/code': codePath
                            }
                        }
                    ]
                };
            default:
                break;
        }
        logger_1.default.debug('CodePath: ' + codePath);
    });
}
exports.generateVscodeDebugConfig = generateVscodeDebugConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL2RlYnVnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3Qiw4REFBc0M7QUFDdEMsTUFBTSxXQUFXLEdBQVcsU0FBUyxDQUFDO0FBRXRDLFNBQWdCLGVBQWUsQ0FBQyxRQUFhO0lBQzNDLE1BQU0sU0FBUyxHQUFXLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNqRCxnQkFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLFNBQVMsRUFBRSxDQUFDLENBQUM7SUFDeEMsTUFBTSxRQUFRLEdBQVEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3pDLGdCQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUN0QyxNQUFNLFlBQVksR0FBVyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDdkQsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLFlBQVksRUFBRSxDQUFDLENBQUM7SUFDOUMsTUFBTSxTQUFTLEdBQVEsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzlDLGdCQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFeEQsT0FBTztRQUNMLFNBQVM7UUFDVCxRQUFRO1FBQ1IsWUFBWTtRQUNaLFNBQVM7S0FDVixDQUFBO0FBQ0gsQ0FBQztBQWhCRCwwQ0FnQkM7QUFFRCxTQUFnQix1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVE7SUFDbEUsTUFBTSxXQUFXLEdBQUcsR0FBRyxTQUFTLE1BQU0sQ0FBQztJQUV2QyxJQUFJLFFBQVEsS0FBSyxXQUFXLEVBQUU7UUFDNUIsSUFBSSxPQUFPLEtBQUssV0FBVyxJ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