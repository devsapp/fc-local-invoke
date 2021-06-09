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
exports.resolveRuntimeToDockerImage = exports.resolveDockerEnv = exports.resolveDockerRegistry = exports.resolveMockScript = exports.generateLocalStartOpts = exports.generateContainerName = exports.generateContainerNameFilter = exports.generateLocalInvokeOpts = exports.transformPathForVirtualBox = exports.transformMountsForToolbox = exports.generateInstallOpts = exports.resolveDockerUser = exports.generateSboxOpts = exports.resolveImageNameForPull = exports.DOCKER_REGISTRIES = void 0;
const httpx = __importStar(require("httpx"));
const _ = __importStar(require("lodash"));
const env_1 = require("../env");
const logger_1 = __importDefault(require("../../common/logger"));
const definition_1 = require("../definition");
const nested_object_assign_1 = __importDefault(require("nested-object-assign"));
const debug_1 = require("../debug");
const runtime_1 = require("../common/model/runtime");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const profile_1 = require("../profile");
const pkgPath = path.join(__dirname, '..', '..', '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(path.join(pkgPath), 'utf8'));
const DEFAULT_REGISTRY = pkg['fc-docker'].registry_default || 'registry.hub.docker.com';
exports.DOCKER_REGISTRIES = pkg['fc-docker'].registry_mirrors || ['registry.hub.docker.com'];
let DOCKER_REGISTRY_CACHE;
const NAS_UID = 10003;
const NAS_GID = 10003;
const runtimeImageMap = {
    'nodejs6': 'nodejs6',
    'nodejs8': 'nodejs8',
    'nodejs10': 'nodejs10',
    'nodejs12': 'nodejs12',
    'python2.7': 'python2.7',
    'python3': 'python3.6',
    'java8': 'java8',
    'java11': 'java11',
    'php7.2': 'php7.2',
    'dotnetcore2.1': 'dotnetcore2.1',
    'custom': 'custom'
};
const IMAGE_VERSION = process.env.FC_DOCKER_VERSION || pkg['fc-docker'].version || '1.9.17';
function resolveImageNameForPull(imageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const dockerImageRegistry = yield resolveDockerRegistry();
        if (dockerImageRegistry) {
            imageName = `${dockerImageRegistry}/${imageName}`;
        }
        return imageName;
    });
}
exports.resolveImageNameForPull = resolveImageNameForPull;
function generateSboxOpts({ imageName, hostname, mounts, envs, cmd = [], isTty, isInteractive }) {
    return {
        Image: imageName,
        Hostname: hostname,
        AttachStdin: isInteractive,
        AttachStdout: true,
        AttachStderr: true,
        // @ts-ignore
        User: resolveDockerUser({ stage: 'sbox' }),
        Tty: isTty,
        OpenStdin: isInteractive,
        StdinOnce: true,
        Env: resolveDockerEnv(envs),
        Cmd: cmd.length ? cmd : ['/bin/bash'],
        HostConfig: {
            AutoRemove: true,
            Mounts: mounts
        }
    };
}
exports.generateSboxOpts = generateSboxOpts;
// Not Run stage:
//  for linux platform, it will always use process.uid and process.gid
//  for mac and windows platform, it will always use 0
// Run stage:
//  for linux platform, it will always use process.uid and process.gid
//  for mac and windows platform, it will use 10003 if no nasConfig, otherwise it will use nasConfig userId
function resolveDockerUser({ nasConfig, stage = 'run' }) {
    let { userId, groupId } = definition_1.getUserIdAndGroupId(nasConfig);
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
function generateInstallOpts(imageName, mounts, envs) {
    return {
        Image: imageName,
        Tty: true,
        Env: resolveDockerEnv(envs),
        Cmd: ['/bin/bash'],
        HostConfig: {
            AutoRemove: true,
            Mounts: mounts
        }
    };
}
exports.generateInstallOpts = generateInstallOpts;
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
        replaceMounts.Source = transformPathForVirtualBox(mountsObj.Source);
        return replaceMounts;
    }
    return {};
}
function transformPathForVirtualBox(source) {
    // C:\\Users\\image_crawler\\code -> /c/Users/image_crawler/code
    const sourcePath = source.split(':').join('');
    const lowerFirstAndReplace = _.lowerFirst(sourcePath.split('\\').join('/'));
    return '/' + lowerFirstAndReplace;
}
exports.transformPathForVirtualBox = transformPathForVirtualBox;
function generateLocalInvokeOpts(runtime, containerName, mounts, cmd, debugPort, envs, dockerUser, debugIde) {
    return __awaiter(this, void 0, void 0, function* () {
        const hostOpts = {
            HostConfig: {
                AutoRemove: true,
                Mounts: mounts
            }
        };
        let debugOpts = {};
        if (debugPort) {
            debugOpts = debug_1.generateDockerDebugOpts(runtime, debugPort, debugIde);
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
        const opts = nested_object_assign_1.default({
            Env: resolveDockerEnv(envs),
            Image: imageName,
            name: containerName,
            Cmd: cmd,
            User: dockerUser
        }, ioOpts, hostOpts, debugOpts);
        const encryptedOpts = _.cloneDeep(opts);
        if (encryptedOpts === null || encryptedOpts === void 0 ? void 0 : encryptedOpts.Env) {
            const encryptedEnv = encryptedOpts.Env.map((e) => {
                if (e.startsWith("FC_ACCESS_KEY_ID") || e.startsWith("FC_ACCESS_KEY_SECRET") || e.startsWith("FC_ACCOUNT_ID")) {
                    const keyValueList = e.split('=');
                    const encrptedVal = profile_1.mark(keyValueList[1]);
                    return `${keyValueList[0]}=${encrptedVal}`;
                }
                else {
                    return e;
                }
            });
            encryptedOpts.Env = encryptedEnv;
        }
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
function generateLocalStartOpts(runtime, name, mounts, cmd, envs, { debugPort, dockerUser, debugIde = null, imageName, caPort = 9000 }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (runtime_1.isCustomContainerRuntime(runtime)) {
            return genCustomContainerLocalStartOpts(name, mounts, cmd, envs, imageName, caPort);
        }
        return yield genNonCustomContainerLocalStartOpts(runtime, name, mounts, cmd, debugPort, envs, dockerUser, debugIde);
    });
}
exports.generateLocalStartOpts = generateLocalStartOpts;
function genNonCustomContainerLocalStartOpts(runtime, name, mounts, cmd, debugPort, envs, dockerUser, debugIde) {
    return __awaiter(this, void 0, void 0, function* () {
        const hostOpts = {
            HostConfig: {
                AutoRemove: true,
                Mounts: mounts
            }
        };
        let debugOpts = {};
        if (debugPort) {
            debugOpts = debug_1.generateDockerDebugOpts(runtime, debugPort, debugIde);
        }
        const imageName = yield resolveRuntimeToDockerImage(runtime);
        supportCustomBootstrapFile(runtime, envs);
        const opts = nested_object_assign_1.default({
            Env: resolveDockerEnv(envs),
            Image: imageName,
            name,
            Cmd: cmd,
            User: dockerUser,
            Entrypoint: [resolveMockScript(runtime)]
        }, hostOpts, debugOpts);
        const encryptedOpts = _.cloneDeep(opts);
        if (encryptedOpts === null || encryptedOpts === void 0 ? void 0 : encryptedOpts.Env) {
            const encryptedEnv = encryptedOpts.Env.map((e) => {
                if (e.startsWith("FC_ACCESS_KEY_ID") || e.startsWith("FC_ACCESS_KEY_SECRET") || e.startsWith("FC_ACCOUNT_ID")) {
                    const keyValueList = e.split('=');
                    const encrptedVal = profile_1.mark(keyValueList[1]);
                    return `${keyValueList[0]}=${encrptedVal}`;
                }
                else {
                    return e;
                }
            });
            encryptedOpts.Env = encryptedEnv;
        }
        logger_1.default.debug(`docker options: ${JSON.stringify(encryptedOpts, null, '  ')}`);
        return opts;
    });
}
// /**
//  * 支持通过 BOOTSTRAP_FILE 环境变量改变 bootstrap 文件名。
// **/
function supportCustomBootstrapFile(runtime, envs) {
    if (runtime === 'custom') {
        if (envs['BOOTSTRAP_FILE']) {
            envs['AGENT_SCRIPT'] = envs['BOOTSTRAP_FILE'];
        }
    }
}
function resolveMockScript(runtime) {
    return `/var/fc/runtime/${runtime}/mock`;
}
exports.resolveMockScript = resolveMockScript;
function genCustomContainerLocalStartOpts(name, mounts, cmd, envs, imageName, caPort = 9000) {
    const exposedPort = `${caPort}/tcp`;
    const hostOpts = {
        ExposedPorts: {
            [exposedPort]: {}
        },
        HostConfig: {
            AutoRemove: true,
            Mounts: mounts,
            PortBindings: {
                [exposedPort]: [
                    {
                        'HostIp': '',
                        'HostPort': `${caPort}`
                    }
                ]
            }
        }
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
    const dockerOpts = nested_object_assign_1.default(opts, hostOpts, ioOpts);
    const encryptedOpts = _.cloneDeep(dockerOpts);
    if (encryptedOpts === null || encryptedOpts === void 0 ? void 0 : encryptedOpts.Env) {
        const encryptedEnv = encryptedOpts.Env.map((e) => {
            if (e.startsWith("FC_ACCESS_KEY_ID") || e.startsWith("FC_ACCESS_KEY_SECRET") || e.startsWith("FC_ACCOUNT_ID")) {
                const keyValueList = e.split('=');
                const encrptedVal = profile_1.mark(keyValueList[1]);
                return `${keyValueList[0]}=${encrptedVal}`;
            }
            else {
                return e;
            }
        });
        encryptedOpts.Env = encryptedEnv;
    }
    logger_1.default.debug(`docker options for custom container: ${JSON.stringify(encryptedOpts, null, '  ')}`);
    return dockerOpts;
}
function resolveDockerRegistry() {
    return __awaiter(this, void 0, void 0, function* () {
        // await doImageRegisterEventTag('start');
        if (DOCKER_REGISTRY_CACHE) {
            return DOCKER_REGISTRY_CACHE;
        }
        const promises = exports.DOCKER_REGISTRIES.map(r => httpx.request(`https://${r}/v2/aliyunfc/runtime-nodejs8/tags/list`, { timeout: 3000 }).then(() => r));
        try {
            DOCKER_REGISTRY_CACHE = yield Promise.race(promises);
        }
        catch (error) {
            DOCKER_REGISTRY_CACHE = DEFAULT_REGISTRY;
        }
        // await doImageRegisterEventTag(DOCKER_REGISTRY_CACHE);
        return DOCKER_REGISTRY_CACHE;
    });
}
exports.resolveDockerRegistry = resolveDockerRegistry;
function resolveDockerEnv(envs = {}, isCustomContainer = false) {
    if (isCustomContainer) {
        return _.map(envs || {}, (v, k) => `${k}=${v}`);
    }
    return _.map(env_1.addEnv(envs || {}), (v, k) => `${k}=${v}`);
}
exports.resolveDockerEnv = resolveDockerEnv;
function resolveRuntimeToDockerImage(runtime, isBuild) {
    return __awaiter(this, void 0, void 0, function* () {
        if (runtimeImageMap[runtime]) {
            const name = runtimeImageMap[runtime];
            var imageName;
            if (isBuild) {
                imageName = `aliyunfc/runtime-${name}:build-${IMAGE_VERSION}`;
            }
            else {
                imageName = `aliyunfc/runtime-${name}:${IMAGE_VERSION}`;
            }
            logger_1.default.debug('imageName: ' + imageName);
            return imageName;
        }
        throw new Error(`invalid runtime name ${runtime}`);
    });
}
exports.resolveRuntimeToDockerImage = resolveRuntimeToDockerImage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9ja2VyLW9wdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2RvY2tlci9kb2NrZXItb3B0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1QixnQ0FBZ0M7QUFDaEMsaUVBQXlDO0FBQ3pDLDhDQUFvRDtBQUNwRCxnRkFBc0Q7QUFDdEQsb0NBQW1EO0FBQ25ELHFEQUFtRTtBQUNuRSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLHdDQUFrQztBQUVsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUN2RSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBRXBFLE1BQU0sZ0JBQWdCLEdBQVcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLHlCQUF5QixDQUFDO0FBQ25GLFFBQUEsaUJBQWlCLEdBQWEsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUU1RyxJQUFJLHFCQUFxQixDQUFDO0FBRzFCLE1BQU0sT0FBTyxHQUFXLEtBQUssQ0FBQztBQUM5QixNQUFNLE9BQU8sR0FBVyxLQUFLLENBQUM7QUFFOUIsTUFBTSxlQUFlLEdBQTRCO0lBQy9DLFNBQVMsRUFBRSxTQUFTO0lBQ3BCLFNBQVMsRUFBRSxTQUFTO0lBQ3BCLFVBQVUsRUFBRSxVQUFVO0lBQ3RCLFVBQVUsRUFBRSxVQUFVO0lBQ3RCLFdBQVcsRUFBRSxXQUFXO0lBQ3hCLFNBQVMsRUFBRSxXQUFXO0lBQ3RCLE9BQU8sRUFBRSxPQUFPO0lBQ2hCLFFBQVEsRUFBRSxRQUFRO0lBQ2xCLFFBQVEsRUFBRSxRQUFRO0lBQ2xCLGVBQWUsRUFBRSxlQUFlO0lBQ2hDLFFBQVEsRUFBRSxRQUFRO0NBQ25CLENBQUM7QUFFRixNQUFNLGFBQWEsR0FBVyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLElBQUksUUFBUSxDQUFDO0FBRXBHLFNBQXNCLHVCQUF1QixDQUFDLFNBQWlCOztRQUU3RCxNQUFNLG1CQUFtQixHQUFHLE1BQU0scUJBQXFCLEVBQUUsQ0FBQztRQUUxRCxJQUFJLG1CQUFtQixFQUFFO1lBQ3ZCLFNBQVMsR0FBRyxHQUFHLG1CQUFtQixJQUFJLFNBQVMsRUFBRSxDQUFDO1NBQ25EO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztDQUFBO0FBUkQsMERBUUM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxFQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUM7SUFDbEcsT0FBTztRQUNMLEtBQUssRUFBRSxTQUFTO1FBQ2hCLFFBQVEsRUFBRSxRQUFRO1FBQ2xCLFdBQVcsRUFBRSxhQUFhO1FBQzFCLFlBQVksRUFBRSxJQUFJO1FBQ2xCLFlBQVksRUFBRSxJQUFJO1FBQ2xCLGFBQWE7UUFDYixJQUFJLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDMUMsR0FBRyxFQUFFLEtBQUs7UUFDVixTQUFTLEVBQUUsYUFBYTtRQUN4QixTQUFTLEVBQUUsSUFBSTtRQUNmLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7UUFDM0IsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFDckMsVUFBVSxFQUFFO1lBQ1YsVUFBVSxFQUFFLElBQUk7WUFDaEIsTUFBTSxFQUFFLE1BQU07U0FDZjtLQUNGLENBQUM7QUFDSixDQUFDO0FBbkJELDRDQW1CQztBQUVELGlCQUFpQjtBQUNqQixzRUFBc0U7QUFDdEUsc0RBQXNEO0FBQ3RELGFBQWE7QUFDYixzRUFBc0U7QUFDdEUsMkdBQTJHO0FBQzNHLFNBQWdCLGlCQUFpQixDQUFDLEVBQUMsU0FBUyxFQUFFLEtBQUssR0FBRyxLQUFLLEVBQUM7SUFDMUQsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxnQ0FBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUV6RCxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFO1FBQ2hDLGdCQUFNLENBQUMsS0FBSyxDQUFDLHdGQUF3RixDQUFDLENBQUM7UUFDdkcsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUMxQixPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQzVCO1NBQU07UUFDTCxJQUFJLEtBQUssS0FBSyxLQUFLLEVBQUU7WUFDbkIsSUFBSSxNQUFNLEtBQUssQ0FBQyxDQUFDLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtnQkFDekMsTUFBTSxHQUFHLE9BQU8sQ0FBQzthQUNsQjtZQUNELElBQUksT0FBTyxLQUFLLENBQUMsQ0FBQyxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQzNDLE9BQU8sR0FBRyxPQUFPLENBQUM7YUFDbkI7U0FDRjthQUFNO1lBQ0wsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLENBQUM7U0FDYjtLQUNGO0lBRUQsT0FBTyxHQUFHLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztBQUNoQyxDQUFDO0FBdEJELDhDQXNCQztBQUdELFNBQWdCLG1CQUFtQixDQUFDLFNBQWlCLEVBQUUsTUFBVyxFQUFFLElBQVM7SUFDM0UsT0FBTztRQUNMLEtBQUssRUFBRSxTQUFTO1FBQ2hCLEdBQUcsRUFBRSxJQUFJO1FBQ1QsR0FBRyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQztRQUMzQixHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDbEIsVUFBVSxFQUFFO1lBQ1YsVUFBVSxFQUFFLElBQUk7WUFDaEIsTUFBTSxFQUFFLE1BQU07U0FDZjtLQUNGLENBQUM7QUFDSixDQUFDO0FBWEQsa0RBV0M7QUFFRCxTQUFnQix5QkFBeUIsQ0FBQyxNQUFNO0lBRTlDLE9BQU8sQ0FBQyxJQUFJLENBQUMseVZBQXlWLENBQUMsQ0FBQztJQUV4VyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDekIsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBRXBCLE9BQU8sMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUNELE9BQU8sMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQVhELDhEQVdDO0FBRUQsU0FBUywwQkFBMEIsQ0FBQyxTQUFTO0lBRTNDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBRXpCLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ25ELGFBQWEsQ0FBQyxNQUFNLEdBQUcsMEJBQTBCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sYUFBYSxDQUFDO0tBQ3RCO0lBQ0QsT0FBTyxFQUFFLENBQUM7QUFDWixDQUFDO0FBRUQsU0FBZ0IsMEJBQTBCLENBQUMsTUFBTTtJQUMvQyxnRUFBZ0U7SUFDaEUsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDNUUsT0FBTyxHQUFHLEdBQUcsb0JBQW9CLENBQUM7QUFDcEMsQ0FBQztBQUxELGdFQUtDO0FBRUQsU0FBc0IsdUJBQXVCLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFFBQVE7O1FBQ3RILE1BQU0sUUFBUSxHQUFHO1lBQ2YsVUFBVSxFQUFFO2dCQUNWLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixNQUFNLEVBQUUsTUFBTTthQUNmO1NBQ0YsQ0FBQztRQUVGLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVuQixJQUFJLFNBQVMsRUFBRTtZQUNiLFNBQVMsR0FBRywrQkFBdUIsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ25FO1FBRUQsTUFBTSxNQUFNLEdBQUc7WUFDYixTQUFTLEVBQUUsSUFBSTtZQUNmLEdBQUcsRUFBRSxLQUFLO1lBQ1YsU0FBUyxFQUFFLElBQUk7WUFDZixXQUFXLEVBQUUsSUFBSTtZQUNqQixZQUFZLEVBQUUsSUFBSTtZQUNsQixZQUFZLEVBQUUsSUFBSTtTQUNuQixDQUFDO1FBRUYsTUFBTSxTQUFTLEdBQUcsTUFBTSwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU3RCwwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFMUMsTUFBTSxJQUFJLEdBQUcsOEJBQWtCLENBQzdCO1lBQ0UsR0FBRyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQztZQUMzQixLQUFLLEVBQUUsU0FBUztZQUNoQixJQUFJLEVBQUUsYUFBYTtZQUNuQixHQUFHLEVBQUUsR0FBRztZQUNSLElBQUksRUFBRSxVQUFVO1NBQ2pCLEVBQ0QsTUFBTSxFQUNOLFFBQVEsRUFDUixTQUFTLENBQUMsQ0FBQztRQUViLE1BQU0sYUFBYSxHQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsR0FBRyxFQUFFO1lBQ3RCLE1BQU0sWUFBWSxHQUFRLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBUyxFQUFFLEVBQUU7Z0JBQzVELElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFO29CQUM3RyxNQUFNLFlBQVksR0FBYSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM1QyxNQUFNLFdBQVcsR0FBVyxjQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xELE9BQU8sR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUM7aUJBQzVDO3FCQUFNO29CQUNMLE9BQU8sQ0FBQyxDQUFDO2lCQUNWO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxhQUFhLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQztTQUNsQztRQUNELGdCQUFNLENBQUMsS0FBSyxDQUFDLDZCQUE2QixJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXZGLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUFBO0FBdkRELDBEQXVEQztBQUVELFNBQWdCLDJCQUEyQixDQUFDLGFBQXFCLEVBQUUsTUFBZ0I7SUFDakYsSUFBSSxNQUFNLEVBQUU7UUFDVixPQUFPLGNBQWMsYUFBYSxZQUFZLENBQUM7S0FDaEQ7SUFDRCxPQUFPLGNBQWMsYUFBYSxLQUFLLENBQUM7QUFDMUMsQ0FBQztBQUxELGtFQUtDO0FBR0QsU0FBZ0IscUJBQXFCLENBQUMsV0FBbUIsRUFBRSxZQUFvQixFQUFFLFNBQWtCO0lBQ2pHLE9BQU8sWUFBWSxXQUFXLElBQUksWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7VUFDOUQsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUhELHNEQUdDO0FBRUQsU0FBc0Isc0JBQXNCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsUUFBUSxHQUFHLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxHQUFHLElBQUksRUFBRTs7UUFDakosSUFBSSxrQ0FBd0IsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNyQyxPQUFPLGdDQUFnQyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDckY7UUFDRCxPQUFPLE1BQU0sbUNBQW1DLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3RILENBQUM7Q0FBQTtBQUxELHdEQUtDO0FBRUQsU0FBZSxtQ0FBbUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsUUFBUTs7UUFDbEgsTUFBTSxRQUFRLEdBQUc7WUFDZixVQUFVLEVBQUU7Z0JBQ1YsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLE1BQU0sRUFBRSxNQUFNO2FBQ2Y7U0FDRixDQUFDO1FBRUYsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBRW5CLElBQUksU0FBUyxFQUFFO1lBQ2IsU0FBUyxHQUFHLCtCQUF1QixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDbkU7UUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTdELDBCQUEwQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUUxQyxNQUFNLElBQUksR0FBRyw4QkFBa0IsQ0FDN0I7WUFDRSxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO1lBQzNCLEtBQUssRUFBRSxTQUFTO1lBQ2hCLElBQUk7WUFDSixHQUFHLEVBQUUsR0FBRztZQUNSLElBQUksRUFBRSxVQUFVO1lBQ2hCLFVBQVUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3pDLEVBQ0QsUUFBUSxFQUNSLFNBQVMsQ0FBQyxDQUFDO1FBQ2IsTUFBTSxhQUFhLEdBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLGFBQWEsYUFBYixhQUFhLHVCQUFiLGFBQWEsQ0FBRSxHQUFHLEVBQUU7WUFDdEIsTUFBTSxZQUFZLEdBQVEsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFTLEVBQUUsRUFBRTtnQkFDNUQsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUU7b0JBQzdHLE1BQU0sWUFBWSxHQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzVDLE1BQU0sV0FBVyxHQUFXLGNBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbEQsT0FBTyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztpQkFDNUM7cUJBQU07b0JBQ0wsT0FBTyxDQUFDLENBQUM7aUJBQ1Y7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILGFBQWEsQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDO1NBQ2xDO1FBQ0QsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0UsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQUE7QUFFRCxNQUFNO0FBQ04sK0NBQStDO0FBQy9DLE1BQU07QUFDTixTQUFTLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxJQUFJO0lBQy9DLElBQUksT0FBTyxLQUFLLFFBQVEsRUFBRTtRQUN4QixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQzFCLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUMvQztLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLE9BQWU7SUFDL0MsT0FBTyxtQkFBbUIsT0FBTyxPQUFPLENBQUM7QUFDM0MsQ0FBQztBQUZELDhDQUVDO0FBRUQsU0FBUyxnQ0FBZ0MsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sR0FBRyxJQUFJO0lBQ3pGLE1BQU0sV0FBVyxHQUFHLEdBQUcsTUFBTSxNQUFNLENBQUM7SUFDcEMsTUFBTSxRQUFRLEdBQUc7UUFDZixZQUFZLEVBQUU7WUFDWixDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUU7U0FDbEI7UUFDRCxVQUFVLEVBQUU7WUFDVixVQUFVLEVBQUUsSUFBSTtZQUNoQixNQUFNLEVBQUUsTUFBTTtZQUNkLFlBQVksRUFBRTtnQkFDWixDQUFDLFdBQVcsQ0FBQyxFQUFFO29CQUNiO3dCQUNFLFFBQVEsRUFBRSxFQUFFO3dCQUNaLFVBQVUsRUFBRSxHQUFHLE1BQU0sRUFBRTtxQkFDeEI7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0YsQ0FBQztJQUVGLE1BQU0sSUFBSSxHQUFRO1FBQ2hCLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQ2pDLEtBQUssRUFBRSxTQUFTO1FBQ2hCLElBQUk7S0FDTCxDQUFDO0lBQ0YsSUFBSSxHQUFHLEtBQUssRUFBRSxFQUFFO1FBQ2QsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7S0FDaEI7SUFDRCxNQUFNLE1BQU0sR0FBRztRQUNiLFNBQVMsRUFBRSxJQUFJO1FBQ2YsR0FBRyxFQUFFLEtBQUs7UUFDVixTQUFTLEVBQUUsSUFBSTtRQUNmLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLFlBQVksRUFBRSxJQUFJO1FBQ2xCLFlBQVksRUFBRSxJQUFJO0tBQ25CLENBQUM7SUFDRixNQUFNLFVBQVUsR0FBRyw4QkFBa0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzlELE1BQU0sYUFBYSxHQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbkQsSUFBSSxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsR0FBRyxFQUFFO1FBQ3RCLE1BQU0sWUFBWSxHQUFRLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBUyxFQUFFLEVBQUU7WUFDNUQsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQzdHLE1BQU0sWUFBWSxHQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sV0FBVyxHQUFXLGNBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEQsT0FBTyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQzthQUM1QztpQkFBTTtnQkFDTCxPQUFPLENBQUMsQ0FBQzthQUNWO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxhQUFhLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQztLQUNsQztJQUNELGdCQUFNLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xHLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFFRCxTQUFzQixxQkFBcUI7O1FBQ3pDLDBDQUEwQztRQUMxQyxJQUFJLHFCQUFxQixFQUFFO1lBQ3pCLE9BQU8scUJBQXFCLENBQUM7U0FDOUI7UUFDRCxNQUFNLFFBQVEsR0FBRyx5QkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyx3Q0FBd0MsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xKLElBQUk7WUFDRixxQkFBcUIsR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDdEQ7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNkLHFCQUFxQixHQUFHLGdCQUFnQixDQUFDO1NBQzFDO1FBQ0Qsd0RBQXdEO1FBQ3hELE9BQU8scUJBQXFCLENBQUM7SUFDL0IsQ0FBQztDQUFBO0FBYkQsc0RBYUM7QUFHRCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFJLEdBQUcsRUFBRSxFQUFFLGlCQUFpQixHQUFHLEtBQUs7SUFDbkUsSUFBSSxpQkFBaUIsRUFBRTtRQUNyQixPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDakQ7SUFDRCxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQUxELDRDQUtDO0FBRUQsU0FBc0IsMkJBQTJCLENBQUMsT0FBZSxFQUFFLE9BQWlCOztRQUNsRixJQUFJLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUM1QixNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsSUFBSSxTQUFTLENBQUM7WUFDZCxJQUFJLE9BQU8sRUFBRTtnQkFDWCxTQUFTLEdBQUcsb0JBQW9CLElBQUksVUFBVSxhQUFhLEVBQUUsQ0FBQzthQUMvRDtpQkFBTTtnQkFDTCxTQUFTLEdBQUcsb0JBQW9CLElBQUksSUFBSSxhQUFhLEVBQUUsQ0FBQzthQUN6RDtZQUVELGdCQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUMsQ0FBQztZQUN4QyxPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDckQsQ0FBQztDQUFBO0FBZEQsa0VBY0MifQ==