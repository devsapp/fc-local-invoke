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
exports.resolveRuntimeToDockerImage = exports.resolveDockerEnv = exports.resolveMockScript = exports.encryptDockerOpts = exports.generateLocalStartOpts = exports.generateContainerName = exports.generateContainerNameFilter = exports.generateLocalInvokeOpts = exports.transformMountsForToolbox = exports.resolveDockerUser = void 0;
const _ = __importStar(require("lodash"));
const core = __importStar(require("@serverless-devs/core"));
const env_1 = require("../env");
const logger_1 = __importDefault(require("../../common/logger"));
const definition_1 = require("../definition");
const nested_object_assign_1 = __importDefault(require("nested-object-assign"));
const debug_1 = require("../debug");
const runtime_1 = require("../common/model/runtime");
const profile_1 = require("../profile");
const NAS_UID = 10003;
const NAS_GID = 10003;
// Not Run stage:
//  for linux platform, it will always use process.uid and process.gid
//  for mac and windows platform, it will always use 0
// Run stage:
//  for linux platform, it will always use process.uid and process.gid
//  for mac and windows platform, it will use 10003 if no nasConfig, otherwise it will use nasConfig userId
function resolveDockerUser({ nasConfig, stage = 'run' }) {
    let { userId, groupId } = (0, definition_1.getUserIdAndGroupId)(nasConfig);
    if (process.platform === 'linux') {
        logger_1.default.debug('For linux platform, Fc will use host userId and groupId to build or run your functions');
        userId = process.getuid();
        groupId = process.getgid();
    }
    else {
        if (stage === 'run') {
            if (userId === -1 || userId === undefined) {
                userId = NAS_UID;
            }
            if (groupId === -1 || groupId === undefined) {
                groupId = NAS_GID;
            }
        }
        else {
            userId = 0;
            groupId = 0;
        }
    }
    return `${userId}:${groupId}`;
}
exports.resolveDockerUser = resolveDockerUser;
function transformMountsForToolbox(mounts) {
    console.warn(`We detected that you are using docker toolbox. For a better experience, please upgrade 'docker for windows'.\nYou can refer to Chinese doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation-zh.md#windows-%E5%AE%89%E8%A3%85-docker or English doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation.md.\n`);
    if (Array.isArray(mounts)) {
        return mounts.map(m => {
            return transformSourcePathOfMount(m);
        });
    }
    return transformSourcePathOfMount(mounts);
}
exports.transformMountsForToolbox = transformMountsForToolbox;
function transformSourcePathOfMount(mountsObj) {
    if (!_.isEmpty(mountsObj)) {
        const replaceMounts = Object.assign({}, mountsObj);
        // C:\\Users\\image_crawler\\code -> /c/Users/image_crawler/code
        const sourcePath = mountsObj.Source.split(':').join('');
        const lowerFirstAndReplace = _.lowerFirst(sourcePath.split('\\').join('/'));
        replaceMounts.Source = '/' + lowerFirstAndReplace;
        return replaceMounts;
    }
    return {};
}
function generateLocalInvokeOpts(runtime, containerName, mounts, cmd, debugPort, envs, limitedHostConfig, dockerUser, debugIde) {
    return __awaiter(this, void 0, void 0, function* () {
        const hostOpts = {
            HostConfig: Object.assign({ AutoRemove: true, Mounts: mounts }, limitedHostConfig)
        };
        let debugOpts = {};
        if (debugPort) {
            debugOpts = (0, debug_1.generateDockerDebugOpts)(runtime, debugPort, debugIde);
        }
        const ioOpts = {
            OpenStdin: true,
            Tty: false,
            StdinOnce: true,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true
        };
        const imageName = yield resolveRuntimeToDockerImage(runtime);
        supportCustomBootstrapFile(runtime, envs);
        const opts = (0, nested_object_assign_1.default)({
            Env: resolveDockerEnv(envs),
            Image: imageName,
            name: containerName,
            Cmd: cmd,
            User: dockerUser
        }, ioOpts, hostOpts, debugOpts);
        const encryptedOpts = encryptDockerOpts(opts);
        logger_1.default.debug(`fc-docker docker options: ${JSON.stringify(encryptedOpts, null, '  ')}`);
        return opts;
    });
}
exports.generateLocalInvokeOpts = generateLocalInvokeOpts;
function generateContainerNameFilter(containerName, inited) {
    if (inited) {
        return `{"name": ["${containerName}-inited"]}`;
    }
    return `{"name": ["${containerName}"]}`;
}
exports.generateContainerNameFilter = generateContainerNameFilter;
function generateContainerName(serviceName, functionName, debugPort) {
    return `fc-local-${serviceName}-${functionName}`.replace(/ /g, '')
        + (debugPort ? '-debug' : '-run');
}
exports.generateContainerName = generateContainerName;
function generateLocalStartOpts(runtime, name, mounts, cmd, envs, limitedHostConfig, { debugPort, dockerUser, debugIde = null, imageName, caPort = 9000 }) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((0, runtime_1.isCustomContainerRuntime)(runtime)) {
            return genCustomContainerLocalStartOpts(name, mounts, cmd, envs, limitedHostConfig, imageName, caPort);
        }
        return yield genNonCustomContainerLocalStartOpts(runtime, name, mounts, cmd, debugPort, envs, limitedHostConfig, dockerUser, debugIde, caPort);
    });
}
exports.generateLocalStartOpts = generateLocalStartOpts;
function genNonCustomContainerLocalStartOpts(runtime, name, mounts, cmd, debugPort, envs, limitedHostConfig, dockerUser, debugIde, caPort = 9000) {
    return __awaiter(this, void 0, void 0, function* () {
        const hostOpts = {
            HostConfig: Object.assign({ AutoRemove: true, Mounts: mounts }, limitedHostConfig)
        };
        if ((0, runtime_1.isCustomRuntime)(runtime)) {
            const exposedPort = `${caPort}/tcp`;
            Object.assign(hostOpts, {
                ExposedPorts: {
                    [exposedPort]: {}
                },
            });
            Object.assign(hostOpts.HostConfig, {
                PortBindings: {
                    [exposedPort]: [
                        {
                            'HostIp': '',
                            'HostPort': `${caPort}`
                        }
                    ]
                }
            });
        }
        let debugOpts = {};
        // custom runtime dose not support debug
        if (debugPort && !(0, runtime_1.isCustomRuntime)(runtime)) {
            debugOpts = (0, debug_1.generateDockerDebugOpts)(runtime, debugPort, debugIde);
        }
        const imageName = yield resolveRuntimeToDockerImage(runtime);
        supportCustomBootstrapFile(runtime, envs);
        let ioOpts = {};
        if ((0, runtime_1.isCustomRuntime)(runtime)) {
            ioOpts = {
                OpenStdin: true,
                Tty: false,
                StdinOnce: true,
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true
            };
        }
        const opts = (0, nested_object_assign_1.default)({
            Env: resolveDockerEnv(envs),
            Image: imageName,
            name,
            Cmd: cmd,
            User: dockerUser,
            Entrypoint: [resolveMockScript(runtime)]
        }, hostOpts, debugOpts, ioOpts);
        const encryptedOpts = encryptDockerOpts(opts);
        logger_1.default.debug(`docker options: ${JSON.stringify(encryptedOpts, null, '  ')}`);
        return opts;
    });
}
function encryptDockerOpts(dockerOpts) {
    const encryptedOpts = _.cloneDeep(dockerOpts);
    if (encryptedOpts === null || encryptedOpts === void 0 ? void 0 : encryptedOpts.Env) {
        const encryptedEnv = encryptedOpts.Env.map((e) => {
            if (e.startsWith("FC_ACCESS_KEY_ID") || e.startsWith("FC_ACCESS_KEY_SECRET") || e.startsWith("FC_ACCOUNT_ID")) {
                const keyValueList = e.split('=');
                const encrptedVal = (0, profile_1.mark)(keyValueList[1]);
                return `${keyValueList[0]}=${encrptedVal}`;
            }
            else {
                return e;
            }
        });
        encryptedOpts.Env = encryptedEnv;
    }
    return encryptedOpts;
}
exports.encryptDockerOpts = encryptDockerOpts;
// /**
//  * 支持通过 BOOTSTRAP_FILE 环境变量改变 bootstrap 文件名。
// **/
function supportCustomBootstrapFile(runtime, envs) {
    if ((0, runtime_1.isCustomRuntime)(runtime)) {
        if (envs['BOOTSTRAP_FILE']) {
            envs['AGENT_SCRIPT'] = envs['BOOTSTRAP_FILE'];
        }
    }
}
function resolveMockScript(runtime) {
    if (runtime == 'python3.9') {
        return `/var/fc/runtime/python3/mock`;
    }
    return `/var/fc/runtime/${runtime}/mock`;
}
exports.resolveMockScript = resolveMockScript;
function genCustomContainerLocalStartOpts(name, mounts, cmd, envs, limitedHostConfig, imageName, caPort = 9000) {
    const exposedPort = `${caPort}/tcp`;
    const hostOpts = {
        ExposedPorts: {
            [exposedPort]: {}
        },
        HostConfig: Object.assign(Object.assign({ AutoRemove: true, Mounts: mounts }, limitedHostConfig), { PortBindings: {
                [exposedPort]: [
                    {
                        'HostIp': '',
                        'HostPort': `${caPort}`
                    }
                ]
            } })
    };
    const opts = {
        Env: resolveDockerEnv(envs, true),
        Image: imageName,
        name
    };
    if (cmd !== []) {
        opts.Cmd = cmd;
    }
    const ioOpts = {
        OpenStdin: true,
        Tty: false,
        StdinOnce: true,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true
    };
    const dockerOpts = (0, nested_object_assign_1.default)(opts, hostOpts, ioOpts);
    const encryptedOpts = encryptDockerOpts(dockerOpts);
    logger_1.default.debug(`docker options for custom container: ${JSON.stringify(encryptedOpts, null, '  ')}`);
    return dockerOpts;
}
function resolveDockerEnv(envs = {}, isCustomContainer = false) {
    if (isCustomContainer) {
        return _.map(envs || {}, (v, k) => `${k}=${v}`);
    }
    return _.map((0, env_1.addEnv)(envs || {}), (v, k) => `${k}=${v}`);
}
exports.resolveDockerEnv = resolveDockerEnv;
function resolveRuntimeToDockerImage(runtime) {
    return __awaiter(this, void 0, void 0, function* () {
        const fcCore = yield core.loadComponent('devsapp/fc-core');
        return yield fcCore.resolveRuntimeToDockerImage(runtime);
    });
}
exports.resolveRuntimeToDockerImage = resolveRuntimeToDockerImage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9ja2VyLW9wdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2RvY2tlci9kb2NrZXItb3B0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1Qiw0REFBOEM7QUFDOUMsZ0NBQWdDO0FBQ2hDLGlFQUF5QztBQUN6Qyw4Q0FBb0Q7QUFDcEQsZ0ZBQXNEO0FBQ3RELG9DQUFtRDtBQUNuRCxxREFBa0Y7QUFDbEYsd0NBQWtDO0FBRWxDLE1BQU0sT0FBTyxHQUFXLEtBQUssQ0FBQztBQUM5QixNQUFNLE9BQU8sR0FBVyxLQUFLLENBQUM7QUFFOUIsaUJBQWlCO0FBQ2pCLHNFQUFzRTtBQUN0RSxzREFBc0Q7QUFDdEQsYUFBYTtBQUNiLHNFQUFzRTtBQUN0RSwyR0FBMkc7QUFDM0csU0FBZ0IsaUJBQWlCLENBQUMsRUFBQyxTQUFTLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBQztJQUMxRCxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUEsZ0NBQW1CLEVBQUMsU0FBUyxDQUFDLENBQUM7SUFFekQsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRTtRQUNoQyxnQkFBTSxDQUFDLEtBQUssQ0FBQyx3RkFBd0YsQ0FBQyxDQUFDO1FBQ3ZHLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDMUIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztLQUM1QjtTQUFNO1FBQ0wsSUFBSSxLQUFLLEtBQUssS0FBSyxFQUFFO1lBQ25CLElBQUksTUFBTSxLQUFLLENBQUMsQ0FBQyxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7Z0JBQ3pDLE1BQU0sR0FBRyxPQUFPLENBQUM7YUFDbEI7WUFDRCxJQUFJLE9BQU8sS0FBSyxDQUFDLENBQUMsSUFBSSxPQUFPLEtBQUssU0FBUyxF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