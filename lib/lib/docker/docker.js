'use strict';
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
exports.detectDockerVersion = exports.buildImage = exports.copyFromImage = exports.startSboxContainer = exports.startInstallationContainer = exports.startContainer = exports.execContainer = exports.createAndRunContainer = exports.run = exports.exitContainer = exports.runContainer = exports.isDockerToolBoxAndEnsureDockerVersion = exports.showDebugIdeTipsForPycharm = exports.writeDebugIdeConfigForVscode = exports.showDebugIdeTipsForVscode = exports.pullImageIfNeed = exports.generateDockerEnvs = exports.generateDockerfileEnvs = exports.generateRamdomContainerName = exports.generateFunctionEnvs = exports.pullImage = exports.generateDockerCmd = exports.renameContainer = exports.getContainer = exports.listContainers = exports.imageExist = exports.conventInstallTargetsToMounts = exports.resolvePasswdMount = exports.resolveCodeUriToMount = exports.resolveDebuggerPathToMount = exports.resolveTmpDirToMount = exports.resolveNasConfigToMounts = void 0;
const logger_1 = __importDefault(require("../../common/logger"));
const _ = __importStar(require("lodash"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const ip = __importStar(require("ip"));
const tar = __importStar(require("tar-fs"));
const dockerode_1 = __importDefault(require("dockerode"));
const string_argv_1 = require("string-argv");
const draftlog = __importStar(require("draftlog"));
const devnull = __importStar(require("dev-null"));
const nas = __importStar(require("../nas"));
const dockerOpts = __importStar(require("./docker-opts"));
const passwd_1 = require("../utils/passwd");
const runtime_1 = require("../common/model/runtime");
const devs_1 = require("../devs");
const env_1 = require("../env");
const docker_support_1 = require("./docker-support");
const error_processor_1 = require("../error-processor");
const profile_1 = require("../profile");
const debug_1 = require("../debug");
const docker_opts_1 = require("./docker-opts");
const isWin = process.platform === 'win32';
draftlog.into(console);
const docker = new dockerode_1.default();
let containers = new Set();
// exit container, when use ctrl + c
function waitingForContainerStopped() {
    // see https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
    // @ts-ignore
    const isRaw = process.isRaw;
    const kpCallBack = (_char, key) => {
        if (key & key.ctrl && key.name === 'c') {
            // @ts-ignore
            process.emit('SIGINT');
        }
    };
    if (process.platform === 'win32') {
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(isRaw);
        }
        process.stdin.on('keypress', kpCallBack);
    }
    let stopping = false;
    process.on('SIGINT', () => __awaiter(this, void 0, void 0, function* () {
        logger_1.default.debug(`containers size: ${containers === null || containers === void 0 ? void 0 : containers.size}`);
        if (stopping) {
            return;
        }
        // Just fix test on windows
        // Because process.emit('SIGINT') in test/docker.test.js will not trigger rl.on('SIGINT')
        // And when listening to stdin the process never finishes until you send a SIGINT signal explicitly.
        process.stdin.destroy();
        if (!containers.size) {
            return;
        }
        stopping = true;
        logger_1.default.info(`\nReceived canncel request, stopping running containers.....`);
        const jobs = [];
        for (let container of containers) {
            try {
                if (container.destroy) { // container stream
                    container.destroy();
                }
                else {
                    const c = docker.getContainer(container);
                    logger_1.default.info(`Stopping container ${container}`);
                    jobs.push(c.kill().catch(ex => logger_1.default.debug(`kill container instance error, error is ${ex}`)));
                }
            }
            catch (error) {
                logger_1.default.debug(`get container instance error, ignore container to stop, error is ${error}`);
            }
        }
        try {
            yield Promise.all(jobs);
            logger_1.default.info('All containers stopped');
            // 修复 windows 环境下 Ctrl C 后容器退出，但是程序会 block 住的问题
            if (process.platform === 'win32') {
                process.exit(0);
            }
        }
        catch (error) {
            logger_1.default.error(error);
            process.exit(-1); // eslint-disable-line
        }
    }));
    return () => {
        process.stdin.removeListener('keypress', kpCallBack);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(isRaw);
        }
    };
}
const goThrough = waitingForContainerStopped();
// todo: add options for pull latest image
const skipPullImage = true;
function resolveNasConfigToMounts(baseDir, serviceName, nasConfig, nasBaseDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const nasMappings = yield nas.convertNasConfigToNasMappings(nasBaseDir, nasConfig, serviceName);
        return convertNasMappingsToMounts(devs_1.getRootBaseDir(baseDir), nasMappings);
    });
}
exports.resolveNasConfigToMounts = resolveNasConfigToMounts;
function resolveTmpDirToMount(absTmpDir) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!absTmpDir) {
            return {};
        }
        return {
            Type: 'bind',
            Source: absTmpDir,
            Target: '/tmp',
            ReadOnly: false
        };
    });
}
exports.resolveTmpDirToMount = resolveTmpDirToMount;
function resolveDebuggerPathToMount(debuggerPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!debuggerPath) {
            return {};
        }
        const absDebuggerPath = path.resolve(debuggerPath);
        return {
            Type: 'bind',
            Source: absDebuggerPath,
            Target: '/tmp/debugger_files',
            ReadOnly: false
        };
    });
}
exports.resolveDebuggerPathToMount = resolveDebuggerPathToMount;
// todo: 当前只支持目录以及 jar。code uri 还可能是 oss 地址、目录、jar、zip?
function resolveCodeUriToMount(absCodeUri, readOnly = true) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!absCodeUri) {
            return null;
        }
        let target = null;
        const stats = yield fs.lstat(absCodeUri);
        if (stats.isDirectory()) {
            target = '/code';
        }
        else {
            // could not use path.join('/code', xxx)
            // in windows, it will be translate to \code\xxx, and will not be recorgnized as a valid path in linux container
            target = path.posix.join('/code', path.basename(absCodeUri));
        }
        // Mount the code directory as read only
        return {
            Type: 'bind',
            Source: absCodeUri,
            Target: target,
            ReadOnly: readOnly
        };
    });
}
exports.resolveCodeUriToMount = resolveCodeUriToMount;
function resolvePasswdMount() {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.platform === 'linux') {
            return {
                Type: 'bind',
                Source: yield passwd_1.generatePwdFile(),
                Target: '/etc/passwd',
                ReadOnly: true
            };
        }
        return null;
    });
}
exports.resolvePasswdMount = resolvePasswdMount;
function convertNasMappingsToMounts(baseDir, nasMappings) {
    return nasMappings.map(nasMapping => {
        // console.log('mounting local nas mock dir %s into container %s\n', nasMapping.localNasDir, nasMapping.remoteNasDir);
        return {
            Type: 'bind',
            Source: path.resolve(baseDir, nasMapping.localNasDir),
            Target: nasMapping.remoteNasDir,
            ReadOnly: false
        };
    });
}
function conventInstallTargetsToMounts(installTargets) {
    if (!installTargets) {
        return [];
    }
    const mounts = [];
    _.forEach(installTargets, (target) => {
        const { hostPath, containerPath } = target;
        if (!(fs.pathExistsSync(hostPath))) {
            fs.ensureDirSync(hostPath);
        }
        mounts.push({
            Type: 'bind',
            Source: hostPath,
            Target: containerPath,
            ReadOnly: false
        });
    });
    return mounts;
}
exports.conventInstallTargetsToMounts = conventInstallTargetsToMounts;
function imageExist(imageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const images = yield docker.listImages({
            filters: {
                reference: [imageName]
            }
        });
        return images.length > 0;
    });
}
exports.imageExist = imageExist;
function listContainers(options) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield docker.listContainers(options);
    });
}
exports.listContainers = listContainers;
function getContainer(containerId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield docker.getContainer(containerId);
    });
}
exports.getContainer = getContainer;
function renameContainer(container, name) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield container.rename({
            name
        });
    });
}
exports.renameContainer = renameContainer;
function genDockerCmdOfCustomContainer(functionConfig) {
    const command = functionConfig.customContainerConfig.command ? JSON.parse(functionConfig.customContainerConfig.command) : undefined;
    const args = functionConfig.customContainerConfig.args ? JSON.parse(functionConfig.customContainerConfig.args) : undefined;
    if (command && args) {
        return [...command, ...args];
    }
    else if (command) {
        return command;
    }
    else if (args) {
        return args;
    }
    return [];
}
// dockerode exec 在 windows 上有问题，用 exec 的 stdin 传递事件，当调用 stream.end() 时，会直接导致 exec 退出，且 ExitCode 为 null
function genDockerCmdOfNonCustomContainer(functionConfig, httpMode, invokeInitializer = true, event = null) {
    const cmd = ['-h', functionConfig.handler];
    // 如果提供了 event
    if (event !== null) {
        cmd.push('--event', Buffer.from(event).toString('base64'));
        cmd.push('--event-decode');
    }
    else {
        // always pass event using stdin mode
        cmd.push('--stdin');
    }
    if (httpMode) {
        cmd.push('--http');
    }
    const initializer = functionConfig.initializer;
    if (initializer && invokeInitializer) {
        cmd.push('-i', initializer);
    }
    const initializationTimeout = functionConfig.initializationTimeout;
    // initializationTimeout is defined as integer, see lib/validate/schema/function.js
    if (initializationTimeout) {
        cmd.push('--initializationTimeout', initializationTimeout.toString());
    }
    logger_1.default.debug(`docker cmd: ${cmd}`);
    return cmd;
}
function generateDockerCmd(runtime, isLocalStartInit, functionConfig, httpMode, invokeInitializer = true, event = null) {
    if (runtime_1.isCustomContainerRuntime(runtime)) {
        return genDockerCmdOfCustomContainer(functionConfig);
    }
    else if (isLocalStartInit) {
        return ['--server'];
    }
    return genDockerCmdOfNonCustomContainer(functionConfig, httpMode, invokeInitializer, event);
}
exports.generateDockerCmd = generateDockerCmd;
function followProgress(stream, onFinished) {
    const barLines = {};
    const onProgress = (event) => {
        let status = event.status;
        if (event.progress) {
            status = `${event.status} ${event.progress}`;
        }
        if (event.id) {
            const id = event.id;
            if (!barLines[id]) {
                barLines[id] = console.draft();
            }
            barLines[id](id + ': ' + status);
        }
        else {
            if (_.has(event, 'aux.ID')) {
                event.stream = event.aux.ID + '\n';
            }
            // If there is no id, the line should be wrapped manually.
            const out = event.status ? event.status + '\n' : event.stream;
            process.stdout.write(out);
        }
    };
    docker.modem.followProgress(stream, onFinished, onProgress);
}
function pullImage(imageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const resolveImageName = yield dockerOpts.resolveImageNameForPull(imageName);
        // copied from lib/edge/container.js
        // const startTime: any = new Date();
        const stream = yield docker.pull(resolveImageName);
        // const visitor: any = await getVisitor();
        // visitor.event({
        //   ec: 'image',
        //   ea: 'pull',
        //   el: 'start'
        // }).send();
        // const registry: any = await dockerOpts.resolveDockerRegistry();
        return yield new Promise((resolve, reject) => {
            logger_1.default.info(`Pulling image ${resolveImageName}, you can also use ` + `'docker pull ${resolveImageName}'` + ' to pull image by yourself.');
            const onFinished = (err) => __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    reject(err);
                }
                containers.delete(stream);
                // const endTime: any = new Date();
                // const pullDuration: number = parseInt(String( (endTime - startTime) / 1000));
                // if (err) {
                //   visitor.event({
                //     ec: 'image',
                //     ea: 'pull',
                //     el: 'error'
                //   }).send();
                //   visitor.event({
                //     ec: 'image',
                //     ea: `pull from ${registry}`,
                //     el: 'error'
                //   }).send();
                //   visitor.event({
                //     ec: `image pull from ${registry}`,
                //     ea: `used ${pullDuration}`,
                //     el: 'error'
                //   }).send();
                //   reject(err);
                //   return;
                // }
                // visitor.event({
                //   ec: 'image',
                //   ea: `pull from ${registry}`,
                //   el: 'success'
                // }).send();
                // visitor.event({
                //   ec: 'image',
                //   ea: 'pull',
                //   el: 'success'
                // }).send();
                // visitor.event({
                //   ec: `image pull from ${registry}`,
                //   ea: `used ${pullDuration}`,
                //   el: 'success'
                // }).send();
                for (const r of dockerOpts.DOCKER_REGISTRIES) {
                    if (resolveImageName.indexOf(r) === 0) {
                        const image = yield docker.getImage(resolveImageName);
                        const newImageName = resolveImageName.slice(r.length + 1);
                        const repoTag = newImageName.split(':');
                        // rename
                        yield image.tag({
                            name: resolveImageName,
                            repo: _.first(repoTag),
                            tag: _.last(repoTag)
                        });
                        break;
                    }
                }
                resolve(resolveImageName);
            });
            containers.add(stream);
            // pull image progress
            followProgress(stream, onFinished);
        });
    });
}
exports.pullImage = pullImage;
function generateFunctionEnvs(functionConfig) {
    const environmentVariables = functionConfig.environmentVariables;
    if (!environmentVariables) {
        return {};
    }
    return Object.assign({}, environmentVariables);
}
exports.generateFunctionEnvs = generateFunctionEnvs;
function generateRamdomContainerName() {
    return `fc_local_${new Date().getTime()}_${Math.random().toString(36).substr(2, 7)}`;
}
exports.generateRamdomContainerName = generateRamdomContainerName;
function generateDockerfileEnvs(region, baseDir, serviceName, serviceProps, functionName, functionProps, debugPort, httpParams, nasConfig, ishttpTrigger, debugIde, debugArgs) {
    return __awaiter(this, void 0, void 0, function* () {
        const DockerEnvs = yield generateDockerEnvs(region, baseDir, serviceName, serviceProps, functionName, functionProps, debugPort, httpParams, nasConfig, ishttpTrigger, debugIde, debugArgs);
        const DockerfilEnvs = [];
        Object.keys(DockerEnvs).forEach((key) => {
            DockerfilEnvs.push(`${key}=${DockerEnvs[key]}`);
        });
        return DockerfilEnvs;
    });
}
exports.generateDockerfileEnvs = generateDockerfileEnvs;
function generateDockerEnvs(region, baseDir, serviceName, serviceProps, functionName, functionProps, debugPort, httpParams, nasConfig, ishttpTrigger, debugIde, debugArgs) {
    return __awaiter(this, void 0, void 0, function* () {
        const envs = {};
        if (httpParams) {
            Object.assign(envs, {
                'FC_HTTP_PARAMS': httpParams
            });
        }
        const confEnv = yield env_1.resolveLibPathsFromLdConf(baseDir, functionProps.codeUri);
        Object.assign(envs, confEnv);
        const runtime = functionProps.runtime;
        if (debugPort && !debugArgs) {
            const debugEnv = debug_1.generateDebugEnv(runtime, debugPort, debugIde);
            Object.assign(envs, debugEnv);
        }
        else if (debugArgs) {
            Object.assign(envs, {
                DEBUG_OPTIONS: debugArgs
            });
        }
        if (ishttpTrigger && (runtime === 'java8' || runtime === 'java11')) {
            envs['fc_enable_new_java_ca'] = 'true';
        }
        Object.assign(envs, generateFunctionEnvs(functionProps));
        const profile = yield profile_1.getProfile();
        Object.assign(envs, {
            'local': true,
            'FC_ACCESS_KEY_ID': profile.AccessKeyID,
            'FC_ACCESS_KEY_SECRET': profile.AccessKeySecret,
            'FC_SECURITY_TOKEN': profile.SecurityToken,
            'FC_ACCOUNT_ID': profile.AccountID,
            'FC_REGION': region,
            'FC_FUNCTION_NAME': functionName,
            'FC_HANDLER': functionProps.handler,
            'FC_MEMORY_SIZE': functionProps.memorySize || 128,
            'FC_TIMEOUT': functionProps.timeout || 3,
            'FC_INITIALIZER': functionProps.initializer,
            'FC_INITIALIZATION_TIMEOUT': functionProps.initializationTimeout || 3,
            'FC_SERVICE_NAME': serviceName,
            'FC_SERVICE_LOG_PROJECT': ((serviceProps || {}).logConfig || {}).project,
            'FC_SERVICE_LOG_STORE': ((serviceProps || {}).logConfig || {}).logstore
        });
        if (runtime_1.isCustomContainerRuntime(functionProps.runtime)) {
            return envs;
        }
        return env_1.addEnv(envs, nasConfig);
    });
}
exports.generateDockerEnvs = generateDockerEnvs;
function pullImageIfNeed(imageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const exist = yield imageExist(imageName);
        if (!exist || !skipPullImage) {
            yield pullImage(imageName);
        }
        else {
            logger_1.default.debug(`skip pulling image ${imageName}...`);
            logger_1.default.info(`Skip pulling image ${imageName}...`);
        }
    });
}
exports.pullImageIfNeed = pullImageIfNeed;
function showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort) {
    return __awaiter(this, void 0, void 0, function* () {
        const vscodeDebugConfig = yield debug_1.generateVscodeDebugConfig(serviceName, functionName, runtime, codeSource, debugPort);
        // todo: auto detect .vscode/launch.json in codeuri path.
        logger_1.default.log('You can paste these config to .vscode/launch.json, and then attach to your running function', 'yellow');
        logger_1.default.log('///////////////// config begin /////////////////');
        logger_1.default.log(JSON.stringify(vscodeDebugConfig, null, 4));
        logger_1.default.log('///////////////// config end /////////////////');
    });
}
exports.showDebugIdeTipsForVscode = showDebugIdeTipsForVscode;
function writeDebugIdeConfigForVscode(baseDir, serviceName, functionName, runtime, codeSource, debugPort) {
    return __awaiter(this, void 0, void 0, function* () {
        const configJsonFolder = path.join(baseDir, '.vscode');
        const configJsonFilePath = path.join(configJsonFolder, 'launch.json');
        try {
            yield fs.ensureDir(path.dirname(configJsonFilePath));
        }
        catch (e) {
            logger_1.default.warning(`Ensure directory: ${configJsonFolder} failed.`);
            yield showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort);
            logger_1.default.debug(`Ensure directory: ${configJsonFolder} failed, error: ${e}`);
            return;
        }
        const vscodeDebugConfig = yield debug_1.generateVscodeDebugConfig(serviceName, functionName, runtime, codeSource, debugPort);
        if (fs.pathExistsSync(configJsonFilePath) && fs.lstatSync(configJsonFilePath).isFile()) {
            // 文件已存在则对比文件内容与待写入内容，若不一致提示用户需要手动写入 launch.json
            const configInJsonFile = JSON.parse(yield fs.readFile(configJsonFilePath, { encoding: 'utf8' }));
            if (_.isEqual(configInJsonFile, vscodeDebugConfig)) {
                return;
            }
            logger_1.default.warning(`File: ${configJsonFilePath} already exists, please overwrite it with the following config.`);
            yield showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort);
            return;
        }
        try {
            yield fs.writeFile(configJsonFilePath, JSON.stringify(vscodeDebugConfig, null, '  '), { encoding: 'utf8', flag: 'w' });
        }
        catch (e) {
            logger_1.default.warning(`Write ${configJsonFilePath} failed.`);
            yield showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort);
            logger_1.default.debug(`Write ${configJsonFilePath} failed, error: ${e}`);
        }
    });
}
exports.writeDebugIdeConfigForVscode = writeDebugIdeConfigForVscode;
function showDebugIdeTipsForPycharm(codeSource, debugPort) {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = yield fs.lstat(codeSource);
        if (!stats.isDirectory()) {
            codeSource = path.dirname(codeSource);
        }
        logger_1.default.log(`\n========= Tips for PyCharm remote debug =========
Local host name: ${ip.address()}
Port           : ${debugPort}
Path mappings  : ${codeSource}=/code

Debug Code needed to copy to your function code:

import pydevd
pydevd.settrace('${ip.address()}', port=${debugPort}, stdoutToServer=True, stderrToServer=True)

=========================================================================\n`, 'yellow');
    });
}
exports.showDebugIdeTipsForPycharm = showDebugIdeTipsForPycharm;
function writeEventToStreamAndClose(stream, event) {
    if (event) {
        stream.write(event);
    }
    stream.end();
}
function isDockerToolBoxAndEnsureDockerVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        const dockerInfo = yield docker.info();
        yield detectDockerVersion(dockerInfo.ServerVersion || '');
        const obj = (dockerInfo.Labels || []).map(e => _.split(e, '=', 2))
            .filter(e => e.length === 2)
            .reduce((acc, cur) => (acc[cur[0]] = cur[1], acc), {});
        return process.platform === 'win32' && obj.provider === 'virtualbox';
    });
}
exports.isDockerToolBoxAndEnsureDockerVersion = isDockerToolBoxAndEnsureDockerVersion;
function runContainer(opts, outputStream, errorStream, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const container = yield createContainer(opts);
        const attachOpts = {
            hijack: true,
            stream: true,
            stdin: true,
            stdout: true,
            stderr: true
        };
        const stream = yield container.attach(attachOpts);
        if (!outputStream) {
            outputStream = process.stdout;
        }
        if (!errorStream) {
            errorStream = process.stderr;
        }
        const errorTransform = error_processor_1.processorTransformFactory({
            serviceName: context === null || context === void 0 ? void 0 : context.serviceName,
            functionName: context === null || context === void 0 ? void 0 : context.functionName,
            errorStream: errorStream
        });
        if (!isWin) {
            container.modem.demuxStream(stream, outputStream, errorTransform);
        }
        yield container.start();
        // dockerode bugs on windows. attach could not receive output and error
        if (isWin) {
            const logStream = yield container.logs({
                stdout: true,
                stderr: true,
                follow: true
            });
            container.modem.demuxStream(logStream, outputStream, errorTransform);
        }
        containers.add(container.id);
        return {
            container,
            stream
        };
    });
}
exports.runContainer = runContainer;
function exitContainer(container) {
    return __awaiter(this, void 0, void 0, function* () {
        if (container) {
            // exitRs format: {"Error":null,"StatusCode":0}
            // see https://docs.docker.com/engine/api/v1.37/#operation/ContainerStop
            logger_1.default.info('Exiting Container...');
            yield container.stop();
            containers.delete(container.id);
            logger_1.default.info('Container exited!');
        }
        else {
            throw new Error('Exited container is undefined!');
        }
    });
}
exports.exitContainer = exitContainer;
function run(opts, event, outputStream, errorStream, context = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const { container, stream } = yield runContainer(opts, outputStream, errorStream, context);
        writeEventToStreamAndClose(stream, event);
        // exitRs format: {"Error":null,"StatusCode":0}
        // see https://docs.docker.com/engine/api/v1.37/#operation/ContainerWait
        const exitRs = yield container.wait();
        containers.delete(container.id);
        return exitRs;
    });
}
exports.run = run;
function createContainer(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const isWin = process.platform === 'win32';
        const isMac = process.platform === 'darwin';
        if (opts && isMac) {
            if (opts.HostConfig) {
                const pathsOutofSharedPaths = yield docker_support_1.findPathsOutofSharedPaths(opts.HostConfig.Mounts);
                if (isMac && pathsOutofSharedPaths.length > 0) {
                    throw new Error(`Please add directory '${pathsOutofSharedPaths}' to Docker File sharing list, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
                }
            }
        }
        const dockerToolBox = yield isDockerToolBoxAndEnsureDockerVersion();
        let container;
        try {
            // see https://github.com/apocas/dockerode/pull/38
            container = yield docker.createContainer(opts);
        }
        catch (ex) {
            if (ex.message.indexOf('invalid mount config for type') !== -1 && dockerToolBox) {
                throw new Error(`The default host machine path for docker toolbox is under 'C:\\Users', Please make sure your project is in this directory. If you want to mount other disk paths, please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md .`);
            }
            if (ex.message.indexOf('drive is not shared') !== -1 && isWin) {
                throw new Error(`${ex.message}More information please refer to https://docs.docker.com/docker-for-windows/#shared-drives`);
            }
            throw ex;
        }
        return container;
    });
}
function createAndRunContainer(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const container = yield createContainer(opts);
        containers.add(container.id);
        yield container.start({});
        return container;
    });
}
exports.createAndRunContainer = createAndRunContainer;
function execContainer(container, opts, outputStream, errorStream) {
    return __awaiter(this, void 0, void 0, function* () {
        outputStream = process.stdout;
        errorStream = process.stderr;
        const logStream = yield container.logs({
            stdout: true,
            stderr: true,
            follow: true,
            since: (new Date().getTime() / 1000)
        });
        container.modem.demuxStream(logStream, outputStream, errorStream);
        const exec = yield container.exec(opts);
        const stream = yield exec.start();
        // have to wait, otherwise stdin may not be readable
        yield new Promise(resolve => setTimeout(resolve, 30));
        container.modem.demuxStream(stream, outputStream, errorStream);
        yield waitForExec(exec);
        logStream.destroy();
    });
}
exports.execContainer = execContainer;
function waitForExec(exec) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            // stream.on('end') could not receive end event on windows.
            // so use inspect to check exec exit
            function waitContainerExec() {
                exec.inspect((err, data) => {
                    if (data.Running) {
                        setTimeout(waitContainerExec, 100);
                        return;
                    }
                    if (err) {
                        reject(err);
                    }
                    else if (data.ExitCode !== 0) {
                        reject(`${data.ProcessConfig.entrypoint} exited with code ${data.ExitCode}`);
                    }
                    else {
                        resolve(data.ExitCode);
                    }
                });
            }
            waitContainerExec();
        });
    });
}
// outputStream, errorStream used for http invoke
// because agent is started when container running and exec could not receive related logs
function startContainer(opts, outputStream, errorStream, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const container = yield createContainer(opts);
        containers.add(container.id);
        try {
            yield container.start({});
        }
        catch (err) {
            logger_1.default.error(err);
        }
        const logs = outputStream || errorStream;
        if (logs) {
            if (!outputStream) {
                outputStream = devnull();
            }
            if (!errorStream) {
                errorStream = devnull();
            }
            // dockerode bugs on windows. attach could not receive output and error, must use logs
            const logStream = yield container.logs({
                stdout: true,
                stderr: true,
                follow: true
            });
            container.modem.demuxStream(logStream, outputStream, error_processor_1.processorTransformFactory({
                serviceName: context.serviceName,
                functionName: context.functionName,
                errorStream
            }));
        }
        return {
            stop: () => __awaiter(this, void 0, void 0, function* () {
                yield container.stop();
                containers.delete(container.id);
            }),
            exec: (cmd, { cwd = '', env = {}, outputStream = process.stdout, errorStream = process.stderr, verbose = false, context = {}, event = null } = {}) => __awaiter(this, void 0, void 0, function* () {
                const stdin = event ? true : false;
                const options = {
                    Env: dockerOpts.resolveDockerEnv(env),
                    Tty: false,
                    AttachStdin: stdin,
                    AttachStdout: true,
                    AttachStderr: true,
                    WorkingDir: cwd
                };
                if (cmd !== []) {
                    options.Cmd = cmd;
                }
                // docker exec
                const encryptedOpts = docker_opts_1.encryptDockerOpts(opts);
                logger_1.default.debug(`docker exec opts: ${JSON.stringify(encryptedOpts, null, 4)}`);
                const exec = yield container.exec(options);
                const stream = yield exec.start({ hijack: true, stdin });
                // todo: have to wait, otherwise stdin may not be readable
                yield new Promise(resolve => setTimeout(resolve, 30));
                if (event !== null) {
                    writeEventToStreamAndClose(stream, event);
                }
                if (!outputStream) {
                    outputStream = process.stdout;
                }
                if (!errorStream) {
                    errorStream = process.stderr;
                }
                if (verbose) {
                    container.modem.demuxStream(stream, outputStream, errorStream);
                }
                else {
                    container.modem.demuxStream(stream, devnull(), errorStream);
                }
                return yield waitForExec(exec);
            })
        };
    });
}
exports.startContainer = startContainer;
function startInstallationContainer({ runtime, imageName, codeUri, targets, context }) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.debug(`runtime: ${runtime}`);
        logger_1.default.debug(`codeUri: ${codeUri}`);
        if (yield isDockerToolBoxAndEnsureDockerVersion()) {
            throw new Error(`\nWe detected that you are using docker toolbox. For a better experience, please upgrade 'docker for windows'.\nYou can refer to Chinese doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation-zh.md#windows-%E5%AE%89%E8%A3%85-docker or English doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation.md.`);
        }
        if (!imageName) {
            imageName = yield dockerOpts.resolveRuntimeToDockerImage(runtime, true);
            if (!imageName) {
                throw new Error(`invalid runtime name ${runtime}`);
            }
        }
        const codeMount = yield resolveCodeUriToMount(codeUri, false);
        const installMounts = conventInstallTargetsToMounts(targets);
        const passwdMount = yield resolvePasswdMount();
        const mounts = _.compact([codeMount, ...installMounts, passwdMount]);
        yield pullImageIfNeed(imageName);
        const envs = env_1.addInstallTargetEnv({}, targets);
        const opts = dockerOpts.generateInstallOpts(imageName, mounts, envs);
        return yield startContainer(opts);
    });
}
exports.startInstallationContainer = startInstallationContainer;
function displaySboxTips(runtime) {
    logger_1.default.log(`\nWelcom to fc sbox environment.\n`, 'yellow');
    logger_1.default.log(`You can install system dependencies like this:`, 'yellow');
    logger_1.default.log(`fun-install apt-get install libxss1\n`, 'yellow');
    switch (runtime) {
        case 'nodejs6':
        case 'nodejs8':
        case 'nodejs10':
        case 'nodejs12':
            logger_1.default.log(`You can install node modules like this:`, 'yellow');
            logger_1.default.log(`fun-install npm install puppeteer\n`, 'yellow');
            break;
        case 'python2.7':
        case 'python3':
            logger_1.default.log(`You can install pip dependencies like this:`, 'yellow');
            logger_1.default.log(`fun-install pip install flask`, 'yellow');
            break;
        default:
            break;
    }
    logger_1.default.info('Type \'fun-install --help\' for more help\n');
}
function startSboxContainer({ runtime, imageName, mounts, cmd, envs, isTty, isInteractive }) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.debug(`runtime: ${runtime}`);
        logger_1.default.debug(`mounts: ${mounts}`);
        logger_1.default.debug(`isTty: ${isTty}`);
        logger_1.default.debug(`isInteractive: ${isInteractive}`);
        if (!imageName) {
            imageName = yield dockerOpts.resolveRuntimeToDockerImage(runtime, true);
            if (!imageName) {
                throw new Error(`invalid runtime name ${runtime}`);
            }
        }
        logger_1.default.debug(`cmd: ${string_argv_1.parseArgsStringToArgv(cmd || '')}`);
        const container = yield createContainer(dockerOpts.generateSboxOpts({
            imageName,
            hostname: `fc-${runtime}`,
            mounts,
            envs,
            cmd: string_argv_1.parseArgsStringToArgv(cmd || ''),
            isTty,
            isInteractive
        }));
        containers.add(container.id);
        yield container.start();
        const stream = yield container.attach({
            logs: true,
            stream: true,
            stdin: isInteractive,
            stdout: true,
            stderr: true
        });
        // show outputs
        let logStream;
        if (isTty) {
            stream.pipe(process.stdout);
        }
        else {
            if (isInteractive || process.platform === 'win32') {
                // 这种情况很诡异，收不到 stream 的 stdout，使用 log 绕过去。
                logStream = yield container.logs({
                    stdout: true,
                    stderr: true,
                    follow: true
                });
                container.modem.demuxStream(logStream, process.stdout, process.stderr);
            }
            else {
                container.modem.demuxStream(stream, process.stdout, process.stderr);
            }
        }
        if (isInteractive) {
            displaySboxTips(runtime);
            // Connect stdin
            process.stdin.pipe(stream);
            let previousKey;
            const CTRL_P = '\u0010', CTRL_Q = '\u0011';
            process.stdin.on('data', (key) => {
                // Detects it is detaching a running container
                const keyStr = key.toString('ascii');
                if (previousKey === CTRL_P && keyStr === CTRL_Q) {
                    container.stop(() => { });
                }
                previousKey = keyStr;
            });
        }
        let resize;
        // @ts-ignore
        const isRaw = process.isRaw;
        if (isTty) {
            // fix not exit process in windows
            goThrough();
            process.stdin.setRawMode(true);
            resize = () => __awaiter(this, void 0, void 0, function* () {
                const dimensions = {
                    h: process.stdout.rows,
                    w: process.stdout.columns
                };
                if (dimensions.h !== 0 && dimensions.w !== 0) {
                    yield container.resize(dimensions);
                }
            });
            yield resize();
            process.stdout.on('resize', resize);
            // 在不加任何 cmd 的情况下 shell prompt 需要输出一些字符才会显示，
            // 这里输入一个空格+退格，绕过这个怪异的问题。
            stream.write(' \b');
        }
        yield container.wait();
        // cleanup
        if (isTty) {
            process.stdout.removeListener('resize', resize);
            process.stdin.setRawMode(isRaw);
        }
        if (isInteractive) {
            process.stdin.removeAllListeners();
            process.stdin.unpipe(stream);
            /**
             *  https://stackoverflow.com/questions/31716784/nodejs-process-never-ends-when-piping-the-stdin-to-a-child-process?rq=1
             *  https://github.com/nodejs/node/issues/2276
             * */
            process.stdin.destroy();
        }
        if (logStream) {
            logStream.removeAllListeners();
        }
        stream.unpipe(process.stdout);
        // fix not exit process in windows
        // stream is hackji socks,so need to close
        stream.destroy();
        containers.delete(container.id);
        if (!isTty) {
            goThrough();
        }
    });
}
exports.startSboxContainer = startSboxContainer;
function zipTo(archive, to) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs.ensureDir(to);
        yield new Promise((resolve, reject) => {
            archive.pipe(tar.extract(to)).on('error', reject).on('finish', resolve);
        });
    });
}
function copyFromImage(imageName, from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        const container = yield docker.createContainer({
            Image: imageName
        });
        const archive = yield container.getArchive({
            path: from
        });
        yield zipTo(archive, to);
        yield container.remove();
    });
}
exports.copyFromImage = copyFromImage;
function buildImage(dockerBuildDir, dockerfilePath, imageTag) {
    return new Promise((resolve, reject) => {
        var tarStream = tar.pack(dockerBuildDir);
        docker.buildImage(tarStream, {
            dockerfile: path.relative(dockerBuildDir, dockerfilePath),
            t: imageTag
        }, (error, stream) => {
            containers.add(stream);
            if (error) {
                reject(error);
                return;
            }
            stream.on('error', (e) => {
                containers.delete(stream);
                reject(e);
                return;
            });
            stream.on('end', function () {
                containers.delete(stream);
                resolve(imageTag);
                return;
            });
            followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
        });
    });
}
exports.buildImage = buildImage;
function detectDockerVersion(serverVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        let cur = serverVersion.split('.');
        // 1.13.1
        if (Number.parseInt(cur[0]) === 1 && Number.parseInt(cur[1]) <= 13) {
            throw new Error(`\nWe detected that your docker version is ${serverVersion}, for a better experience, please upgrade the docker version.`);
        }
    });
}
exports.detectDockerVersion = detectDockerVersion;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9ja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9kb2NrZXIvZG9ja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUViLGlFQUF5QztBQUN6QywwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsNENBQThCO0FBQzlCLDBEQUErQjtBQUMvQiw2Q0FBb0Q7QUFDcEQsbURBQXFDO0FBQ3JDLGtEQUFvQztBQUdwQyw0Q0FBOEI7QUFDOUIsMERBQTRDO0FBQzVDLDRDQUFrRDtBQUNsRCxxREFBbUU7QUFDbkUsa0NBQXlDO0FBQ3pDLGdDQUFnRjtBQUNoRixxREFBNkQ7QUFDN0Qsd0RBQStEO0FBQy9ELHdDQUF3QztBQUV4QyxvQ0FBdUU7QUFDdkUsK0NBQWdEO0FBRWhELE1BQU0sS0FBSyxHQUFZLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDO0FBQ3BELFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkIsTUFBTSxNQUFNLEdBQVEsSUFBSSxtQkFBTSxFQUFFLENBQUM7QUFFakMsSUFBSSxVQUFVLEdBQVEsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUVoQyxvQ0FBb0M7QUFDcEMsU0FBUywwQkFBMEI7SUFDakMsaUhBQWlIO0lBQ2pILGFBQWE7SUFDYixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQzVCLE1BQU0sVUFBVSxHQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3JDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7WUFDdEMsYUFBYTtZQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDeEI7SUFDSCxDQUFDLENB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