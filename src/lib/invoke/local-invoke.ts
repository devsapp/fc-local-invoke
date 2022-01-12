'use strict';
import Invoke from './invoke';
import * as core from '@serverless-devs/core';
import docker = require('../docker/docker');
import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import { TriggerConfig } from '../interface/fc-trigger';
import dockerOpts = require('../docker/docker-opts');
import { getFcReqHeaders, generateInitRequestOpts, requestUntilServerUp, generateInvokeRequestOpts } from './http';
import { v4 as uuidv4 } from 'uuid';
import { isCustomContainerRuntime, isCustomRuntime } from '../common/model/runtime';
import logger from '../../common/logger';
import { ICredentials } from '../../common/entity';

export default class LocalInvoke extends Invoke {
  private reuse: boolean;
  private envs: any;
  private cmd: string[];
  private opts: any;
  constructor(
    creds: ICredentials,
    region: string,
    baseDir: string,
    serviceConfig: ServiceConfig,
    functionConfig: FunctionConfig,
    triggerConfig?: TriggerConfig,
    debugPort?: number,
    debugIde?: any,
    tmpDir?: string,
    debuggerPath?: any,
    debugArgs?: any,
    reuse?: boolean,
    nasBaseDir?: string,
  ) {
    super(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
    this.reuse = reuse;
  }

  async init() {
    await super.init();
    this.envs = await docker.generateDockerEnvs(
      this.creds,
      this.region,
      this.baseDir,
      this.serviceName,
      this.serviceConfig,
      this.functionName,
      this.functionConfig,
      this.debugPort,
      null,
      this.nasConfig,
      false,
      this.debugIde,
      this.debugArgs,
    );
    this.cmd = docker.generateDockerCmd(this.runtime, false, this.functionConfig, false);

    let limitedHostConfig;
    try {
      limitedHostConfig = await this.fcCore.genContainerResourcesLimitConfig(this.functionConfig.memorySize);
      logger.debug(limitedHostConfig);
    } catch (err) {
      logger.debug(err);
      logger.warning("Try to generate the container's resource limit configuration but failed. The default configuration of docker will be used.");
      limitedHostConfig = {
        CpuPeriod: null,
        CpuQuota: null,
        Memory: null,
        Ulimits: null,
      };
    }

    if (isCustomContainerRuntime(this.runtime) || isCustomRuntime(this.runtime)) {
      this.opts = await dockerOpts.generateLocalStartOpts(this.runtime, this.containerName, this.mounts, this.cmd, this.envs, limitedHostConfig, {
        debugPort: this.debugPort,
        dockerUser: this.dockerUser,
        debugIde: this.debugIde,
        imageName: this.imageName,
        caPort: this.functionConfig.caPort,
      });
    } else {
      this.opts = await dockerOpts.generateLocalInvokeOpts(
        this.runtime,
        this.containerName,
        this.mounts,
        this.cmd,
        this.debugPort,
        this.envs,
        limitedHostConfig,
        this.dockerUser,
        this.debugIde,
      );
    }
  }

  async doInvoke(event, { outputStream = null, errorStream = null } = {}) {
    let invokeInitializer = true;
    let containerUp = false;
    if (this.reuse) {
      const containerName = dockerOpts.generateContainerName(this.serviceName, this.functionName, this.debugPort);
      let filters = dockerOpts.generateContainerNameFilter(containerName, true);
      let containers = await docker.listContainers({ filters });
      if (containers && containers.length) {
        invokeInitializer = false;
      } else {
        filters = dockerOpts.generateContainerNameFilter(containerName);
        containers = await docker.listContainers({ filters });
      }
      if (containers && containers.length) {
        const container = await docker.getContainer(containers[0].Id);
        if (isCustomContainerRuntime(this.runtime) || isCustomRuntime(this.runtime)) {
          if (this.functionConfig.initializer && invokeInitializer) {
            await docker.renameContainer(container, containerName + '-inited');
          }

          containerUp = true;
        } else {
          let limitedHostConfig;
          try {
            const fcCommon = await core.loadComponent('devsapp/fc-common');
            limitedHostConfig = await fcCommon.genContainerResourcesLimitConfig(this.functionConfig.memorySize);
            logger.debug(limitedHostConfig);
          } catch (err) {
            logger.debug(err);
            logger.warning(
              "Try to generate the container's resource limit configuration but failed. The default configuration of docker will be used.",
            );
            limitedHostConfig = {
              CpuPeriod: null,
              CpuQuota: null,
              Memory: null,
              Ulimits: null,
            };
          }
          const cmd = [
            dockerOpts.resolveMockScript(this.runtime),
            ...docker.generateDockerCmd(this.runtime, false, this.functionConfig, false, invokeInitializer, event),
          ];
          const opts = await dockerOpts.generateLocalInvokeOpts(
            this.runtime,
            this.containerName,
            this.mounts,
            cmd,
            this.debugPort,
            this.envs,
            limitedHostConfig,
            this.dockerUser,
            this.debugIde,
          );
          await docker.execContainer(container, opts, outputStream, errorStream);
          if (invokeInitializer) {
            await docker.renameContainer(container, containerName + '-inited');
          }
          return;
        }
      }
    }
    if (isCustomContainerRuntime(this.runtime) || isCustomRuntime(this.runtime)) {
      let container;
      if (!containerUp) {
        const containerRunner = await docker.runContainer(this.opts, outputStream, errorStream, {
          serviceName: this.serviceName,
          functionName: this.functionName,
        });
        container = containerRunner.container;
      }
      // send request
      const fcReqHeaders = getFcReqHeaders({}, uuidv4(), this.envs);
      if (this.functionConfig.initializer && invokeInitializer) {
        logger.info('Initializing...');
        const initRequestOpts = generateInitRequestOpts({}, this.functionConfig.caPort, fcReqHeaders);

        const initResp = await requestUntilServerUp(initRequestOpts, this.functionConfig.initializationTimeout || 3);
        invokeInitializer = false;
        logger.log(initResp.body);
        logger.debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
      }

      const requestOpts = generateInvokeRequestOpts(this.functionConfig.caPort, fcReqHeaders, event);

      const respOfCustomContainer = await requestUntilServerUp(requestOpts, this.functionConfig.timeout || 3);
      logger.log(respOfCustomContainer.body);
      // exit container
      if (!containerUp) {
        await docker.exitContainer(container);
      }
    } else {
      await docker.run(this.opts, event, outputStream, errorStream, {
        serviceName: this.serviceName,
        functionName: this.functionName,
      });
    }
  }
}
