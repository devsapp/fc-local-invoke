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
exports.resolveRuntimeToDockerImage = exports.resolveDockerEnv = exports.resolveDockerRegistry = exports.resolveMockScript = exports.encryptDockerOpts = exports.generateLocalStartOpts = exports.generateContainerName = exports.generateContainerNameFilter = exports.generateLocalInvokeOpts = exports.transformPathForVirtualBox = exports.transformMountsForToolbox = exports.generateInstallOpts = exports.resolveDockerUser = exports.generateSboxOpts = exports.resolveImageNameForPull = exports.DOCKER_REGISTRIES = void 0;
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
                const encrptedVal = profile_1.mark(keyValueList[1]);
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
    const encryptedOpts = encryptDockerOpts(dockerOpts);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9ja2VyLW9wdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2RvY2tlci9kb2NrZXItb3B0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1QixnQ0FBZ0M7QUFDaEMsaUVBQXlDO0FBQ3pDLDhDQUFvRDtBQUNwRCxnRkFBc0Q7QUFDdEQsb0NBQW1EO0FBQ25ELHFEQUFtRTtBQUNuRSwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLHdDQUFrQztBQUVsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQUN2RSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBRXBFLE1BQU0sZ0JBQWdCLEdBQVcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLHlCQUF5QixDQUFDO0FBQ25GLFFBQUEsaUJBQWlCLEdBQWEsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUU1RyxJQUFJLHFCQUFxQixDQUFDO0FBRzFCLE1BQU0sT0FBTyxHQUFXLEtBQUssQ0FBQztBQUM5QixNQUFNLE9BQU8sR0FBVyxLQUFLLENBQUM7QUFFOUIsTUFBTSxlQUFlLEdBQTRCO0lBQy9DLFNBQVMsRUFBRSxTQUFTO0lBQ3BCLFNBQVMsRUFBRSxTQUFTO0lBQ3BCLFVBQVUsRUFBRSxVQUFVO0lBQ3RCLFVBQVUsRUFBRSxVQUFVO0lBQ3RCLFdBQVcsRUFBRSxXQUFXO0lBQ3hCLFNBQVMsRUFBRSxX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