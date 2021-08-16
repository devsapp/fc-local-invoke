'use strict';

import logger from '../../common/logger';
import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as ip from 'ip';
import * as tar from 'tar-fs';
import Docker from 'dockerode';
import { parseArgsStringToArgv } from 'string-argv';
import * as draftlog from 'draftlog';
import * as devnull from 'dev-null';
import { NasConfig, ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import * as nas from '../nas';
import * as dockerOpts from './docker-opts';
import { generatePwdFile } from '../utils/passwd';
import { isCustomContainerRuntime } from '../common/model/runtime';
import { getRootBaseDir } from '../devs';
import { addEnv, addInstallTargetEnv, resolveLibPathsFromLdConf } from '../env';
import { findPathsOutofSharedPaths } from './docker-support';
import { processorTransformFactory } from '../error-processor';
import { ICredentials } from '../../common/entity';
import { generateVscodeDebugConfig, generateDebugEnv } from '../debug';
import {encryptDockerOpts} from "./docker-opts";

const isWin: boolean = process.platform === 'win32';
draftlog.into(console);
const docker: any = new Docker();

let containers: any = new Set();

// exit container, when use ctrl + c
function waitingForContainerStopped(): any {
  // see https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
  // @ts-ignore
  const isRaw = process.isRaw;
  const kpCallBack: any = (_char, key) => {
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

  let stopping: boolean = false;

  process.on('SIGINT', async () => {
    logger.debug(`containers size: ${containers?.size}`);

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

    logger.info(`\nReceived canncel request, stopping running containers.....`);

    const jobs: Array<any> = [];
    for (let container of containers) {
      try {
        if (container.destroy) { // container stream
          container.destroy();
        } else {
          const c: any = docker.getContainer(container);
          logger.info(`Stopping container ${container}`);

          jobs.push(c.kill().catch(ex => logger.debug(`kill container instance error, error is ${ex}`)));
        }
      } catch (error) {
        logger.debug(`get container instance error, ignore container to stop, error is ${error}`);
      }
    }

    try {
      await Promise.all(jobs);
      logger.info('All containers stopped');
      // 修复 windows 环境下 Ctrl C 后容器退出，但是程序会 block 住的问题
      if (process.platform === 'win32') {
        process.exit(0);
      }
    } catch (error) {
      logger.error(error);
      process.exit(-1); // eslint-disable-line
    }
  });

  return () => {
    process.stdin.removeListener('keypress', kpCallBack);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(isRaw);
    }
  };
}

const goThrough: any = waitingForContainerStopped();

// todo: add options for pull latest image
const skipPullImage: boolean = true;

export async function resolveNasConfigToMounts(baseDir: string, serviceName: string, nasConfig: NasConfig, nasBaseDir: string): Promise<any> {
  const nasMappings: any = await nas.convertNasConfigToNasMappings(nasBaseDir, nasConfig, serviceName);
  return convertNasMappingsToMounts(getRootBaseDir(baseDir), nasMappings);
}

export async function resolveTmpDirToMount(absTmpDir: string): Promise<any> {
  if (!absTmpDir) { return {}; }
  return {
    Type: 'bind',
    Source: absTmpDir,
    Target: '/tmp',
    ReadOnly: false
  };
}

export async function resolveDebuggerPathToMount(debuggerPath: string): Promise<any> {
  if (!debuggerPath) { return {}; }
  const absDebuggerPath: string = path.resolve(debuggerPath);
  return {
    Type: 'bind',
    Source: absDebuggerPath,
    Target: '/tmp/debugger_files',
    ReadOnly: false
  };
}

// todo: 当前只支持目录以及 jar。code uri 还可能是 oss 地址、目录、jar、zip?
export async function resolveCodeUriToMount(absCodeUri: string, readOnly = true): Promise<any> {
  if (!absCodeUri) {
    return null;
  }
  let target: string = null;

  const stats: any = await fs.lstat(absCodeUri);

  if (stats.isDirectory()) {
    target = '/code';
  } else {
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
}

export async function resolvePasswdMount(): Promise<any> {
  if (process.platform === 'linux') {
    return {
      Type: 'bind',
      Source: await generatePwdFile(),
      Target: '/etc/passwd',
      ReadOnly: true
    };
  }

  return null;
}

function convertNasMappingsToMounts(baseDir: string, nasMappings: any): any {
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

export function conventInstallTargetsToMounts(installTargets: any): any {

  if (!installTargets) { return []; }

  const mounts: Array<any> = [];

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

export async function imageExist(imageName: string): Promise<boolean> {

  const images: Array<any> = await docker.listImages({
    filters: {
      reference: [imageName]
    }
  });

  return images.length > 0;
}

export async function listContainers(options: any): Promise<any> {
  return await docker.listContainers(options);
}

export async function getContainer(containerId: any): Promise<any> {
  return await docker.getContainer(containerId);
}

export async function renameContainer(container: any, name: string): Promise<any> {
  return await container.rename({
    name
  });
}

function genDockerCmdOfCustomContainer(functionConfig: FunctionConfig): any {
  const command: any = functionConfig.customContainerConfig.command ? JSON.parse(functionConfig.customContainerConfig.command) : undefined;
  const args: any = functionConfig.customContainerConfig.args ? JSON.parse(functionConfig.customContainerConfig.args) : undefined;

  if (command && args) {
    return [...command, ...args];
  } else if (command) {
    return command;
  } else if (args) {
    return args;
  }
  return [];
}
// dockerode exec 在 windows 上有问题，用 exec 的 stdin 传递事件，当调用 stream.end() 时，会直接导致 exec 退出，且 ExitCode 为 null
function genDockerCmdOfNonCustomContainer(functionConfig: FunctionConfig, httpMode: boolean, invokeInitializer = true, event = null): string[] {
  const cmd: string[] = ['-h', functionConfig.handler];

  // 如果提供了 event
  if (event !== null) {
    cmd.push('--event', Buffer.from(event).toString('base64'));
    cmd.push('--event-decode');
  } else {
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

  logger.debug(`docker cmd: ${cmd}`);

  return cmd;
}

export function generateDockerCmd(runtime: string, isLocalStartInit: boolean, functionConfig?: FunctionConfig, httpMode?: boolean, invokeInitializer = true, event = null): string[] {
  if (isCustomContainerRuntime(runtime)) {
    return genDockerCmdOfCustomContainer(functionConfig);
  } else if (isLocalStartInit) {
    return ['--server'];
  }
  return genDockerCmdOfNonCustomContainer(functionConfig, httpMode, invokeInitializer, event);
}


function followProgress(stream: any, onFinished: any): void {

  const barLines: any = {};

  const onProgress: Function = (event) => {
    let status: any = event.status;

    if (event.progress) {
      status = `${event.status} ${event.progress}`;
    }

    if (event.id) {
      const id: number = event.id;

      if (!barLines[id]) {
        barLines[id] = console.draft();
      }
      barLines[id](id + ': ' + status);
    } else {
      if (_.has(event, 'aux.ID')) {
        event.stream = event.aux.ID + '\n';
      }
      // If there is no id, the line should be wrapped manually.
      const out: any = event.status ? event.status + '\n' : event.stream;
      process.stdout.write(out);
    }
  };

  docker.modem.followProgress(stream, onFinished, onProgress);
}

export async function pullImage(imageName: string, needResolveImageName?: boolean): Promise<any> {

  const resolveImageName: string = needResolveImageName ? await dockerOpts.resolveImageNameForPull(imageName) : imageName;

  // copied from lib/edge/container.js
  // const startTime: any = new Date();

  const stream: any = await docker.pull(resolveImageName);

  // const visitor: any = await getVisitor();

  // visitor.event({
  //   ec: 'image',
  //   ea: 'pull',
  //   el: 'start'
  // }).send();

  // const registry: any = await dockerOpts.resolveDockerRegistry();

  return await new Promise((resolve, reject) => {

    logger.info(`Pulling image ${resolveImageName}, you can also use ` + `'docker pull ${resolveImageName}'` + ' to pull image by yourself.');

    const onFinished = async (err) => {
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
          const image: any = await docker.getImage(resolveImageName);

          const newImageName: string = resolveImageName.slice(r.length + 1);
          const repoTag: string[] = newImageName.split(':');

          // rename
          await image.tag({
            name: resolveImageName,
            repo: _.first(repoTag),
            tag: _.last(repoTag)
          });
          break;
        }
      }
      resolve(resolveImageName);
    };

    containers.add(stream);
    // pull image progress
    followProgress(stream, onFinished);
  });
}

export function generateFunctionEnvs(functionConfig: FunctionConfig): any {
  const environmentVariables = functionConfig.environmentVariables;

  if (!environmentVariables) { return {}; }

  return Object.assign({}, environmentVariables);
}

export function generateRamdomContainerName(): string {
  return `fc_local_${new Date().getTime()}_${Math.random().toString(36).substr(2, 7)}`;
}

export async function generateDockerEnvs(creds: ICredentials, region: string, baseDir: string, serviceName: string, serviceProps: ServiceConfig, functionName: string, functionProps: FunctionConfig, debugPort: number, httpParams: any, nasConfig: NasConfig, ishttpTrigger: boolean, debugIde: any, debugArgs?: any): Promise<any> {
  const envs = {};

  if (httpParams) {
    Object.assign(envs, {
      'FC_HTTP_PARAMS': httpParams
    });
  }

  const confEnv = await resolveLibPathsFromLdConf(baseDir, functionProps.codeUri);

  Object.assign(envs, confEnv);

  const runtime: string = functionProps.runtime;

  if (debugPort && !debugArgs) {
    const debugEnv = generateDebugEnv(runtime, debugPort, debugIde);

    Object.assign(envs, debugEnv);
  } else if (debugArgs) {
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
    'FC_ACCESS_KEY_ID': creds?.AccessKeyID,
    'FC_ACCESS_KEY_SECRET': creds?.AccessKeySecret,
    'FC_SECURITY_TOKEN': creds?.SecurityToken,
    'FC_ACCOUNT_ID': creds?.AccountID,
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

  if (isCustomContainerRuntime(functionProps.runtime)) {
    return envs;
  }
  return addEnv(envs, nasConfig);
}


export async function pullImageIfNeed(imageName: string, needResolveImageName = true): Promise<void> {
  const exist: boolean = await imageExist(imageName);

  if (!exist || !skipPullImage) {

    await pullImage(imageName, needResolveImageName);
  } else {
    logger.debug(`skip pulling image ${imageName}...`);
    logger.info(`Skip pulling image ${imageName}...`);
  }
}

export async function showDebugIdeTipsForVscode(serviceName: string, functionName: string, runtime: string, codeSource: string, debugPort?: number): Promise<void> {
  const vscodeDebugConfig = await generateVscodeDebugConfig(serviceName, functionName, runtime, codeSource, debugPort);

  // todo: auto detect .vscode/launch.json in codeuri path.
  logger.log('You can paste these config to .vscode/launch.json, and then attach to your running function', 'yellow');
  logger.log('///////////////// config begin /////////////////');
  logger.log(JSON.stringify(vscodeDebugConfig, null, 4));
  logger.log('///////////////// config end /////////////////');
}

export async function writeDebugIdeConfigForVscode(baseDir: string, serviceName: string, functionName: string, runtime: string, codeSource: string, debugPort?: number): Promise<void> {
  const configJsonFolder: string = path.join(baseDir, '.vscode');
  const configJsonFilePath: string = path.join(configJsonFolder, 'launch.json');
  try {
    await fs.ensureDir(path.dirname(configJsonFilePath));
  } catch (e) {
    logger.warning(`Ensure directory: ${configJsonFolder} failed.`);
    await showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort);
    logger.debug(`Ensure directory: ${configJsonFolder} failed, error: ${e}`);
    return;
  }
  const vscodeDebugConfig = await generateVscodeDebugConfig(serviceName, functionName, runtime, codeSource, debugPort);
  if (fs.pathExistsSync(configJsonFilePath) && fs.lstatSync(configJsonFilePath).isFile()) {
    // 文件已存在则对比文件内容与待写入内容，若不一致提示用户需要手动写入 launch.json
    const configInJsonFile = JSON.parse(await fs.readFile(configJsonFilePath, {encoding: 'utf8'}));
    if (_.isEqual(configInJsonFile, vscodeDebugConfig)) { return; }
    logger.warning(`File: ${configJsonFilePath} already exists, please overwrite it with the following config.`);
    await showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort);
    return;
  }
  try {
    await fs.writeFile(configJsonFilePath, JSON.stringify(vscodeDebugConfig, null, '  '), {encoding: 'utf8', flag: 'w'});
  } catch (e) {
    logger.warning(`Write ${configJsonFilePath} failed.`);
    await showDebugIdeTipsForVscode(serviceName, functionName, runtime, codeSource, debugPort);
    logger.debug(`Write ${configJsonFilePath} failed, error: ${e}`);
  }
}


export async function showDebugIdeTipsForPycharm(codeSource: string, debugPort: number): Promise<void> {

  const stats = await fs.lstat(codeSource);

  if (!stats.isDirectory()) {
    codeSource = path.dirname(codeSource);
  }

  logger.log(`\n========= Tips for PyCharm remote debug =========
Local host name: ${ip.address()}
Port           : ${debugPort}
Path mappings  : ${codeSource}=/code

Debug Code needed to copy to your function code:

import pydevd
pydevd.settrace('${ip.address()}', port=${debugPort}, stdoutToServer=True, stderrToServer=True)

=========================================================================\n`, 'yellow');
}

function writeEventToStreamAndClose(stream, event) {

  if (event) {
    stream.write(event);
  }

  stream.end();
}

export async function isDockerToolBoxAndEnsureDockerVersion(): Promise<boolean> {

  const dockerInfo: any = await docker.info();

  await detectDockerVersion(dockerInfo.ServerVersion || '');

  const obj = (dockerInfo.Labels || []).map(e => _.split(e, '=', 2))
    .filter(e => e.length === 2)
    .reduce((acc, cur) => (acc[cur[0]] = cur[1], acc), {});

  return process.platform === 'win32' && obj.provider === 'virtualbox';
}

export async function runContainer(opts, outputStream, errorStream, context?: any) {
  const container = await createContainer(opts);

  const attachOpts = {
    hijack: true,
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true
  };

  const stream = await container.attach(attachOpts);

  if (!outputStream) {
    outputStream = process.stdout;
  }

  if (!errorStream) {
    errorStream = process.stderr;
  }

  const errorTransform = processorTransformFactory({
    serviceName: context?.serviceName,
    functionName: context?.functionName,
    errorStream: errorStream
  });

  if (!isWin) {
    container.modem.demuxStream(stream, outputStream, errorTransform);
  }

  await container.start();

  // dockerode bugs on windows. attach could not receive output and error
  if (isWin) {
    const logStream = await container.logs({
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
}

export async function exitContainer(container): Promise<void> {
  if (container) {
    // exitRs format: {"Error":null,"StatusCode":0}
    // see https://docs.docker.com/engine/api/v1.37/#operation/ContainerStop
    logger.info('Exiting Container...');
    await container.stop();

    containers.delete(container.id);
    logger.info('Container exited!');
  } else {
    throw new Error('Exited container is undefined!');
  }
}

export async function run(opts, event, outputStream, errorStream, context = {}): Promise<any> {

  const { container, stream } = await runContainer(opts, outputStream, errorStream, context);

  writeEventToStreamAndClose(stream, event);

  // exitRs format: {"Error":null,"StatusCode":0}
  // see https://docs.docker.com/engine/api/v1.37/#operation/ContainerWait
  const exitRs = await container.wait();

  containers.delete(container.id);

  return exitRs;
}


async function createContainer(opts: any): Promise<any> {
  const isWin: boolean = process.platform === 'win32';
  const isMac: boolean = process.platform === 'darwin';

  if (opts && isMac) {
    if (opts.HostConfig) {
      const pathsOutofSharedPaths = await findPathsOutofSharedPaths(opts.HostConfig.Mounts);
      if (isMac && pathsOutofSharedPaths.length > 0) {
        throw new Error(`Please add directory '${pathsOutofSharedPaths}' to Docker File sharing list, more information please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md`);
      }
    }
  }
  const dockerToolBox = await isDockerToolBoxAndEnsureDockerVersion();

  let container;
  try {
    // see https://github.com/apocas/dockerode/pull/38
    container = await docker.createContainer(opts);
  } catch (ex) {

    if (ex.message.indexOf('invalid mount config for type') !== -1 && dockerToolBox) {
      throw new Error(`The default host machine path for docker toolbox is under 'C:\\Users', Please make sure your project is in this directory. If you want to mount other disk paths, please refer to https://github.com/alibaba/funcraft/blob/master/docs/usage/faq-zh.md .`);
    }
    if (ex.message.indexOf('drive is not shared') !== -1 && isWin) {
      throw new Error(`${ex.message}More information please refer to https://docs.docker.com/docker-for-windows/#shared-drives`);
    }
    throw ex;
  }
  return container;
}

export async function createAndRunContainer(opts): Promise<any> {
  const container = await createContainer(opts);
  containers.add(container.id);
  await container.start({});
  return container;
}

export async function execContainer(container, opts, outputStream, errorStream): Promise<void> {
  outputStream = process.stdout;
  errorStream = process.stderr;
  const logStream = await container.logs({
    stdout: true,
    stderr: true,
    follow: true,
    since: (new Date().getTime() / 1000)
  });
  container.modem.demuxStream(logStream, outputStream, errorStream);
  const exec = await container.exec(opts);
  const stream = await exec.start();
  // have to wait, otherwise stdin may not be readable
  await new Promise(resolve => setTimeout(resolve, 30));
  container.modem.demuxStream(stream, outputStream, errorStream);

  await waitForExec(exec);
  logStream.destroy();
}

async function waitForExec(exec) {
  return await new Promise((resolve, reject) => {
    // stream.on('end') could not receive end event on windows.
    // so use inspect to check exec exit
    function waitContainerExec() {
      exec.inspect((err, data) => {
        if (data?.Running) {
          setTimeout(waitContainerExec, 100);
          return;
        }
        if (err) {
          reject(err);
        } else if (data.ExitCode !== 0) {
          reject(`${data.ProcessConfig.entrypoint} exited with code ${data.ExitCode}`);
        } else {
          resolve(data.ExitCode);
        }
      });
    }
    waitContainerExec();
  });
}

// outputStream, errorStream used for http invoke
// because agent is started when container running and exec could not receive related logs
export async function startContainer(opts: any, outputStream?: any, errorStream?: any, context?: any): Promise<any> {

  const container = await createContainer(opts);

  containers.add(container.id);

  try {
    await container.start({});
  } catch (err) {
    logger.error(err);
  }

  const logs: any = outputStream || errorStream;

  if (logs) {
    if (!outputStream) {
      outputStream = devnull();
    }

    if (!errorStream) {
      errorStream = devnull();
    }

    // dockerode bugs on windows. attach could not receive output and error, must use logs
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true
    });

    container.modem.demuxStream(logStream, outputStream, processorTransformFactory({
      serviceName: context.serviceName,
      functionName: context.functionName,
      errorStream
    }));
  }

  return {
    stop: async () => {
      await container.stop();
      containers.delete(container.id);
    },

    exec: async (cmd, { cwd = '', env = {}, outputStream = process.stdout, errorStream = process.stderr, verbose = false, context = {}, event = null } = {}) => {
      const stdin = event ? true : false;

      const options: any = {
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
      const encryptedOpts: any = encryptDockerOpts(opts);
      logger.debug(`docker exec opts: ${JSON.stringify(encryptedOpts, null, 4)}`);

      const exec = await container.exec(options);

      const stream = await exec.start({ hijack: true, stdin });

      // todo: have to wait, otherwise stdin may not be readable
      await new Promise(resolve => setTimeout(resolve, 30));

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
      } else {
        container.modem.demuxStream(stream, devnull(), errorStream);
      }

      return await waitForExec(exec);
    }
  };
}

export async function startInstallationContainer({ runtime, imageName, codeUri, targets, context }): Promise<any> {
  logger.debug(`runtime: ${runtime}`);
  logger.debug(`codeUri: ${codeUri}`);

  if (await isDockerToolBoxAndEnsureDockerVersion()) {
    throw new Error(`\nWe detected that you are using docker toolbox. For a better experience, please upgrade 'docker for windows'.\nYou can refer to Chinese doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation-zh.md#windows-%E5%AE%89%E8%A3%85-docker or English doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation.md.`);
  }

  if (!imageName) {
    imageName = await dockerOpts.resolveRuntimeToDockerImage(runtime, true);
    if (!imageName) {
      throw new Error(`invalid runtime name ${runtime}`);
    }
  }

  const codeMount = await resolveCodeUriToMount(codeUri, false);

  const installMounts = conventInstallTargetsToMounts(targets);
  const passwdMount = await resolvePasswdMount();
  const mounts = _.compact([codeMount, ...installMounts, passwdMount]);

  await pullImageIfNeed(imageName);

  const envs = addInstallTargetEnv({}, targets);
  const opts = dockerOpts.generateInstallOpts(imageName, mounts, envs);

  return await startContainer(opts);
}

function displaySboxTips(runtime) {
  logger.log(`\nWelcom to fc sbox environment.\n`, 'yellow');
  logger.log(`You can install system dependencies like this:`, 'yellow');
  logger.log(`fun-install apt-get install libxss1\n`, 'yellow');

  switch (runtime) {
  case 'nodejs6':
  case 'nodejs8':
  case 'nodejs10':
  case 'nodejs12':
    logger.log(`You can install node modules like this:`, 'yellow');
    logger.log(`fun-install npm install puppeteer\n`, 'yellow');
    break;
  case 'python2.7':
  case 'python3':
    logger.log(`You can install pip dependencies like this:`, 'yellow');
    logger.log(`fun-install pip install flask`, 'yellow');
    break;
  default:
    break;
  }
  logger.info('Type \'fun-install --help\' for more help\n');
}

export async function startSboxContainer({
  runtime, imageName,
  mounts, cmd, envs,
  isTty, isInteractive
}): Promise<void> {
  logger.debug(`runtime: ${runtime}`);
  logger.debug(`mounts: ${mounts}`);
  logger.debug(`isTty: ${isTty}`);
  logger.debug(`isInteractive: ${isInteractive}`);

  if (!imageName) {
    imageName = await dockerOpts.resolveRuntimeToDockerImage(runtime, true);
    if (!imageName) {
      throw new Error(`invalid runtime name ${runtime}`);
    }
  }

  logger.debug(`cmd: ${parseArgsStringToArgv(cmd || '')}`);

  const container = await createContainer(dockerOpts.generateSboxOpts({
    imageName,
    hostname: `fc-${runtime}`,
    mounts,
    envs,
    cmd: parseArgsStringToArgv(cmd || ''),
    isTty,
    isInteractive
  }));

  containers.add(container.id);

  await container.start();

  const stream = await container.attach({
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
  } else {
    if (isInteractive || process.platform === 'win32') {
      // 这种情况很诡异，收不到 stream 的 stdout，使用 log 绕过去。
      logStream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true
      });
      container.modem.demuxStream(logStream, process.stdout, process.stderr);
    } else {
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

    resize = async () => {
      const dimensions = {
        h: process.stdout.rows,
        w: process.stdout.columns
      };

      if (dimensions.h !== 0 && dimensions.w !== 0) {
        await container.resize(dimensions);
      }
    };

    await resize();
    process.stdout.on('resize', resize);

    // 在不加任何 cmd 的情况下 shell prompt 需要输出一些字符才会显示，
    // 这里输入一个空格+退格，绕过这个怪异的问题。
    stream.write(' \b');
  }

  await container.wait();

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
}

async function zipTo(archive: any, to: string): Promise<void> {

  await fs.ensureDir(to);

  await new Promise((resolve, reject) => {
    archive.pipe(tar.extract(to)).on('error', reject).on('finish', resolve);
  });
}

export async function copyFromImage(imageName: string, from: string, to: string): Promise<void> {
  const container = await docker.createContainer({
    Image: imageName
  });

  const archive = await container.getArchive({
    path: from
  });

  await zipTo(archive, to);

  await container.remove();
}

export function buildImage(dockerBuildDir: string, dockerfilePath: string, imageTag: string): Promise<any> {

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

export async function detectDockerVersion(serverVersion: string): Promise<void> {
  let cur = serverVersion.split('.');
  // 1.13.1
  if (Number.parseInt(cur[0]) === 1 && Number.parseInt(cur[1]) <= 13) {
    throw new Error(`\nWe detected that your docker version is ${serverVersion}, for a better experience, please upgrade the docker version.`);
  }
}
