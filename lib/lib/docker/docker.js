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
                logger_1.default.debug(`docker exec opts: ${JSON.stringify(options, null, 4)}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9ja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9kb2NrZXIvZG9ja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUViLGlFQUF5QztBQUN6QywwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsNENBQThCO0FBQzlCLDBEQUErQjtBQUMvQiw2Q0FBb0Q7QUFDcEQsbURBQXFDO0FBQ3JDLGtEQUFvQztBQUdwQyw0Q0FBOEI7QUFDOUIsMERBQTRDO0FBQzVDLDRDQUFrRDtBQUNsRCxxREFBbUU7QUFDbkUsa0NBQXlDO0FBQ3pDLGdDQUFnRjtBQUNoRixxREFBNkQ7QUFDN0Qsd0RBQStEO0FBQy9ELHdDQUF3QztBQUV4QyxvQ0FBdUU7QUFFdkUsTUFBTSxLQUFLLEdBQVksT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUM7QUFDcEQsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN2QixNQUFNLE1BQU0sR0FBUSxJQUFJLG1CQUFNLEVBQUUsQ0FBQztBQUVqQyxJQUFJLFVBQVUsR0FBUSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRWhDLG9DQUFvQztBQUNwQyxTQUFTLDBCQUEwQjtJQUNqQyxpSEFBaUg7SUFDakgsYUFBYTtJQUNiLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDNUIsTUFBTSxVQUFVLEdBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDckMsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRTtZQUN0QyxhQUFhO1lBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUN4QjtJQUNILENBQUMsQ0FBQztJQUNGLElBQUks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