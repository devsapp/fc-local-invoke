import * as _ from 'lodash';
import * as fs from 'fs-extra';
import * as core from '@serverless-devs/core';
import { addEnv } from '../env';
import logger from '../../common/logger';
import { getUserIdAndGroupId } from '../definition';
import nestedObjectAssign from 'nested-object-assign';
import { generateDockerDebugOpts } from '../debug';
import {isCustomContainerRuntime, isCustomRuntime} from '../common/model/runtime';
import { mark } from '../profile';

const NAS_UID: number = 10003;
const NAS_GID: number = 10003;

// Not Run stage:
//  for linux platform, it will always use process.uid and process.gid
//  for mac and windows platform, it will always use 0
// Run stage:
//  for linux platform, it will always use process.uid and process.gid
//  for mac and windows platform, it will use 10003 if no nasConfig, otherwise it will use nasConfig userId
export function resolveDockerUser({nasConfig, stage = 'run'}): string {
  let { userId, groupId } = getUserIdAndGroupId(nasConfig);

  if (process.platform === 'linux') {
    logger.debug('For linux platform, Fc will use host userId and groupId to build or run your functions');
    userId = process.getuid();
    groupId = process.getgid();
  } else {
    if (stage === 'run') {
      if (userId === -1 || userId === undefined) {
        userId = NAS_UID;
      }
      if (groupId === -1 || groupId === undefined) {
        groupId = NAS_GID;
      }
    } else {
      userId = 0;
      groupId = 0;
    }
  }

  return `${userId}:${groupId}`;
}

export function transformMountsForToolbox(mounts) {

  console.warn(`We detected that you are using docker toolbox. For a better experience, please upgrade 'docker for windows'.\nYou can refer to Chinese doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation-zh.md#windows-%E5%AE%89%E8%A3%85-docker or English doc https://github.com/alibaba/funcraft/blob/master/docs/usage/installation.md.\n`);

  if (Array.isArray(mounts)) {
    return mounts.map(m => {

      return transformSourcePathOfMount(m);
    });
  }
  return transformSourcePathOfMount(mounts);
}

function transformSourcePathOfMount(mountsObj) {

  if (!_.isEmpty(mountsObj)) {

    const replaceMounts = Object.assign({}, mountsObj);
    try {
      fs.ensureDirSync(mountsObj.Source);
    } catch (ex) { /* 不阻塞程序运行 */}
    // TODO: 需要在这个位置确保文件夹存在
    // C:\\Users\\image_crawler\\code -> /c/Users/image_crawler/code
    const sourcePath = mountsObj.Source.split(':').join('');
    const lowerFirstAndReplace = _.lowerFirst(sourcePath.split('\\').join('/'));
    replaceMounts.Source = '/' + lowerFirstAndReplace;
    return replaceMounts;
  }
  return {};
}

export async function generateLocalInvokeOpts(runtime, containerName, mounts, cmd, debugPort, envs, limitedHostConfig, dockerUser, debugIde) {
  const hostOpts = {
    HostConfig: {
      AutoRemove: true,
      Mounts: mounts,
      ...limitedHostConfig
    }
  };

  let debugOpts = {};

  if (debugPort) {
    debugOpts = generateDockerDebugOpts(runtime, debugPort, debugIde);
  }

  const ioOpts = {
    OpenStdin: true,
    Tty: false,
    StdinOnce: true,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true
  };

  const imageName = await resolveRuntimeToDockerImage(runtime);

  supportCustomBootstrapFile(runtime, envs);

  const opts = nestedObjectAssign(
    {
      Env: resolveDockerEnv(envs),
      Image: imageName,
      name: containerName,
      Cmd: cmd,
      User: dockerUser
    },
    ioOpts,
    hostOpts,
    debugOpts);

  const encryptedOpts: any = encryptDockerOpts(opts);
  logger.debug(`fc-docker docker options: ${JSON.stringify(encryptedOpts, null, '  ')}`);

  return opts;
}

export function generateContainerNameFilter(containerName: string, inited?: boolean): string {
  if (inited) {
    return `{"name": ["${containerName}-inited"]}`;
  }
  return `{"name": ["${containerName}"]}`;
}


export function generateContainerName(serviceName: string, functionName: string, debugPort?: number): string {
  return `fc-local-${serviceName}-${functionName}`.replace(/ /g, '')
    + (debugPort ? '-debug' : '-run');
}

export async function generateLocalStartOpts(runtime, name, mounts, cmd, envs, limitedHostConfig, { debugPort, dockerUser, debugIde = null, imageName, caPort = 9000 }) {
  if (isCustomContainerRuntime(runtime)) {
    return genCustomContainerLocalStartOpts(name, mounts, cmd, envs, limitedHostConfig,imageName, caPort);
  }

  return await genNonCustomContainerLocalStartOpts(runtime, name, mounts, cmd, debugPort, envs,limitedHostConfig, dockerUser, debugIde, caPort);
}

async function genNonCustomContainerLocalStartOpts(runtime, name, mounts, cmd, debugPort, envs, limitedHostConfig, dockerUser, debugIde,caPort = 9000) {

  const hostOpts = {
    HostConfig: {
      AutoRemove: true,
      Mounts: mounts,
      ...limitedHostConfig
    }
  };
  if (isCustomRuntime(runtime)) {
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
  if (debugPort && !isCustomRuntime(runtime)) {
    debugOpts = generateDockerDebugOpts(runtime, debugPort, debugIde);
  }

  const imageName = await resolveRuntimeToDockerImage(runtime);

  supportCustomBootstrapFile(runtime, envs);

  let ioOpts = {};
  if (isCustomRuntime(runtime)) {
    ioOpts = {
      OpenStdin: true,
      Tty: false,
      StdinOnce: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true
    };
  }
  const opts = nestedObjectAssign(
    {
      Env: resolveDockerEnv(envs),
      Image: imageName,
      name,
      Cmd: cmd,
      User: dockerUser,
      Entrypoint: [resolveMockScript(runtime)]
    },
    hostOpts,
    debugOpts,
    ioOpts);
  
  const encryptedOpts: any = encryptDockerOpts(opts);
  logger.debug(`docker options: ${JSON.stringify(encryptedOpts, null, '  ')}`);
  return opts;
}

export function encryptDockerOpts(dockerOpts: any): any {
  const encryptedOpts: any = _.cloneDeep(dockerOpts);
  if (encryptedOpts?.Env) {
    const encryptedEnv: any = encryptedOpts.Env.map((e: string) => {
      if (e.startsWith("FC_ACCESS_KEY_ID") || e.startsWith("FC_ACCESS_KEY_SECRET") || e.startsWith("FC_ACCOUNT_ID")) {
        const keyValueList: string[] = e.split('=');
        const encrptedVal: string = mark(keyValueList[1]);
        return `${keyValueList[0]}=${encrptedVal}`;
      } else {
        return e;
      }
    });
    encryptedOpts.Env = encryptedEnv;
  }
  return encryptedOpts;
}


// /**
//  * 支持通过 BOOTSTRAP_FILE 环境变量改变 bootstrap 文件名。
// **/
function supportCustomBootstrapFile(runtime, envs) {
  if (isCustomRuntime(runtime)) {
    if (envs['BOOTSTRAP_FILE']) {
      envs['AGENT_SCRIPT'] = envs['BOOTSTRAP_FILE'];
    }
  }
}

export function resolveMockScript(runtime: string): string {
  if(runtime=='python3.9'){
    return `/var/fc/runtime/python3/mock`;
  }
  return `/var/fc/runtime/${runtime}/mock`;
}

function genCustomContainerLocalStartOpts(name, mounts, cmd, envs, limitedHostConfig, imageName, caPort = 9000) {
  const exposedPort = `${caPort}/tcp`;
  const hostOpts = {
    ExposedPorts: {
      [exposedPort]: {}
    },
    HostConfig: {
      AutoRemove: true,
      Mounts: mounts,
      ...limitedHostConfig,
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

  const opts: any = {
    Env: resolveDockerEnv(envs, true),
    Image: imageName,
    name
  };
  // @ts-ignore
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
  const dockerOpts = nestedObjectAssign(opts, hostOpts, ioOpts);
  const encryptedOpts: any = encryptDockerOpts(dockerOpts)
  logger.debug(`docker options for custom container: ${JSON.stringify(encryptedOpts, null, '  ')}`);
  return dockerOpts;
}

export function resolveDockerEnv(envs = {}, isCustomContainer = false): string[] {
  if (isCustomContainer) {
    return _.map(envs || {}, (v, k) => `${k}=${v}`);
  }
  return _.map(addEnv(envs || {}), (v, k) => `${k}=${v}`);
}

export async function resolveRuntimeToDockerImage(runtime: string) {
  const fcCore = await core.loadComponent('devsapp/fc-core');
  return await fcCore.resolveRuntimeToDockerImage(runtime);
}
