'use strict';
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
exports.startContainer = exports.execContainer = exports.createAndRunContainer = exports.run = exports.exitContainer = exports.runContainer = exports.isDockerToolBoxAndEnsureDockerVersion = exports.showDebugIdeTipsForPycharm = exports.writeDebugIdeConfigForVscode = exports.showDebugIdeTipsForVscode = exports.generateDockerEnvs = exports.generateRamdomContainerName = exports.generateFunctionEnvs = exports.generateDockerCmd = exports.renameContainer = exports.getContainer = exports.listContainers = exports.resolvePasswdMount = exports.resolveCodeUriToMount = exports.resolveDebuggerPathToMount = exports.resolveTmpDirToMount = exports.resolveLayerToMounts = exports.resolveNasConfigToMounts = void 0;
const logger_1 = __importDefault(require("../../common/logger"));
const _ = __importStar(require("lodash"));
const core = __importStar(require("@serverless-devs/core"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const ip = __importStar(require("ip"));
const dockerode_1 = __importDefault(require("dockerode"));
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
const debug_1 = require("../debug");
const docker_opts_1 = require("./docker-opts");
const isWin = process.platform === 'win32';
draftlog.into(console);
const docker = new dockerode_1.default();
let containers = new Set();
// exit container, when use ctrl + c
waitingForContainerStopped();
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
            // 修复Ctrl C 后容器退出，但是程序会 block 住的问题
            process.exit(0);
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
;
function resolveNasConfigToMounts(baseDir, serviceName, nasConfig, nasBaseDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const nasMappings = yield nas.convertNasConfigToNasMappings(nasBaseDir, nasConfig, serviceName);
        return convertNasMappingsToMounts((0, devs_1.getRootBaseDir)(baseDir), nasMappings);
    });
}
exports.resolveNasConfigToMounts = resolveNasConfigToMounts;
function resolveLayerToMounts(absOptDir) {
    return {
        Type: 'bind',
        Source: absOptDir,
        Target: '/opt',
        ReadOnly: false
    };
}
exports.resolveLayerToMounts = resolveLayerToMounts;
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
                Source: yield (0, passwd_1.generatePwdFile)(),
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
    if ((0, runtime_1.isCustomContainerRuntime)(runtime)) {
        return genDockerCmdOfCustomContainer(functionConfig);
    }
    else if (isLocalStartInit) {
        return ['--server'];
    }
    return genDockerCmdOfNonCustomContainer(functionConfig, httpMode, invokeInitializer, event);
}
exports.generateDockerCmd = generateDockerCmd;
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
function generateDockerEnvs(creds, region, baseDir, serviceName, serviceProps, functionName, functionProps, debugPort, httpParams, nasConfig, ishttpTrigger, debugIde, debugArgs) {
    return __awaiter(this, void 0, void 0, function* () {
        const envs = {};
        if (httpParams) {
            Object.assign(envs, {
                'FC_HTTP_PARAMS': httpParams
            });
        }
        const confEnv = yield (0, env_1.resolveLibPathsFromLdConf)(baseDir, functionProps.codeUri);
        Object.assign(envs, confEnv);
        const runtime = functionProps.runtime;
        if (debugPort && !debugArgs) {
            const debugEnv = (0, debug_1.generateDebugEnv)(runtime, debugPort, debugIde);
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
        Object.assign(envs, {
            'local': true,
            'FC_ACCESS_KEY_ID': creds === null || creds === void 0 ? void 0 : creds.AccessKeyID,
            'FC_ACCESS_KEY_SECRET': creds === null || creds === void 0 ? void 0 : creds.AccessKeySecret,
            'FC_SECURITY_TOKEN': creds === null || creds === void 0 ? void 0 : creds.SecurityToken,
            'FC_ACCOUNT_ID': creds === null || creds === void 0 ? void 0 : creds.AccountID,
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
        if ((0, runtime_1.isCustomContainerRuntime)(functionProps.runtime)) {
            return envs;
        }
        return (0, env_1.addEnv)(envs, {
            nasConfig,
            layers: functionProps.layers,
            runtime: functionProps.runtime,
        });
    });
}
exports.generateDockerEnvs = generateDockerEnvs;
function showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort) {
    return __awaiter(this, void 0, void 0, function* () {
        const vscodeDebugConfig = yield (0, debug_1.generateVscodeDebugConfig)(serviceName, functionName, runtime, codeSource, debugPort);
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
            logger_1.default.warn(`Ensure directory: ${configJsonFolder} failed.`);
            yield showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort);
            logger_1.default.debug(`Ensure directory: ${configJsonFolder} failed, error: ${e}`);
            return;
        }
        const vscodeDebugConfig = yield (0, debug_1.generateVscodeDebugConfig)(serviceName, functionName, runtime, codeSource, debugPort);
        if (fs.pathExistsSync(configJsonFilePath) && fs.lstatSync(configJsonFilePath).isFile()) {
            // 文件已存在则对比文件内容与待写入内容，若不一致提示用户需要手动写入 launch.json
            const configInJsonFile = JSON.parse(yield fs.readFile(configJsonFilePath, { encoding: 'utf8' }));
            if (_.isEqual(configInJsonFile, vscodeDebugConfig)) {
                return;
            }
            logger_1.default.warn(`File: ${configJsonFilePath} already exists, please overwrite it with the following config.`);
            yield showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort);
            return;
        }
        try {
            yield fs.writeFile(configJsonFilePath, JSON.stringify(vscodeDebugConfig, null, '  '), { encoding: 'utf8', flag: 'w' });
        }
        catch (e) {
            logger_1.default.warn(`Write ${configJsonFilePath} failed.`);
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
        const fcCore = yield core.loadComponent('devsapp/fc-core');
        return yield fcCore.isDockerToolBox();
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
        const errorTransform = (0, error_processor_1.processorTransformFactory)({
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
                const pathsOutofSharedPaths = yield (0, docker_support_1.findPathsOutofSharedPaths)(opts.HostConfig.Mounts);
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
                    if (data === null || data === void 0 ? void 0 : data.Running) {
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
// 处理容器的异常
function _handlerContainerError(err, caPort) {
    const message = (err === null || err === void 0 ? void 0 : err.message) || '';
    const DOCKER_CAPORT_ERROR_MESSAGE = 'port is already allocated';
    if (_.trim(message).lastIndexOf(DOCKER_CAPORT_ERROR_MESSAGE) > -1) {
        return JSON.stringify({
            message,
            tips: `Your server expose port is no the same as caPort: ${caPort} \nMore details, please read document: https://help.aliyun.com/document_detail/209242.html`
        });
    }
    else {
        return message;
    }
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
            throw new Error(_handlerContainerError(err, context.caPort));
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
            container.modem.demuxStream(logStream, outputStream, (0, error_processor_1.processorTransformFactory)({
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
                const encryptedOpts = (0, docker_opts_1.encryptDockerOpts)(opts);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9ja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9kb2NrZXIvZG9ja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFYixpRUFBeUM7QUFDekMsMENBQTRCO0FBQzVCLDREQUE4QztBQUM5Qyw2Q0FBK0I7QUFDL0IsMkNBQTZCO0FBQzdCLHVDQUF5QjtBQUN6QiwwREFBK0I7QUFDL0IsbURBQXFDO0FBQ3JDLGtEQUFvQztBQUdwQyw0Q0FBOEI7QUFDOUIsMERBQTRDO0FBQzVDLDRDQUFrRDtBQUNsRCxxREFBbUU7QUFDbkUsa0NBQXlDO0FBQ3pDLGdDQUEyRDtBQUMzRCxxREFBNkQ7QUFDN0Qsd0RBQStEO0FBRS9ELG9DQUF1RTtBQUN2RSwrQ0FBZ0Q7QUFFaEQsTUFBTSxLQUFLLEdBQVksT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUM7QUFDcEQsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN2QixNQUFNLE1BQU0sR0FBUSxJQUFJLG1CQUFNLEVBQUUsQ0FBQztBQUVqQyxJQUFJLFVBQVUsR0FBUSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRWhDLG9DQUFvQztBQUNwQywwQkFBMEIsRUFBRSxDQUFDO0FBQzdCLFNBQVMsMEJBQTBCO0lBQ2pDLGlIQUFpSDtJQUNqSCxhQUFhO0lBQ2IsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztJQUM1QixNQUFNLFVBQVUsR0FBUSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNyQyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO1lBQ3RDLGFBQWE7WUFDYixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3hCO0lBQ0gsQ0FBQyxD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