'use strict';
import Invoke from './invoke';
import * as docker from '../docker/docker'
import * as dockerOpts from '../docker/docker-opts';

import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import { TriggerConfig } from '../interface/fc-trigger';
import logger from '../../common/logger';
import {ICredentials} from "../../common/entity";
export default class EventStart extends Invoke {
  private envs: any;
  private opts: any;
  constructor(creds: ICredentials, region: string, baseDir: string, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, triggerConfig?: TriggerConfig, debugPort?: number, debugIde?: any, tmpDir?: string, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string) {
    super(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
  }

  async init() {
    await super.init();
    this.envs = await docker.generateDockerEnvs(this.creds, this.region, this.baseDir, this.serviceName,   this.serviceConfig, this.functionName, this.functionConfig,  this.debugPort, null, this.nasConfig, false, this.debugIde, this.debugArgs);
    this.containerName = dockerOpts.generateContainerName(this.serviceName, this.functionName, this.debugPort);

    let filters = dockerOpts.generateContainerNameFilter(this.containerName, true);
    let containers = await docker.listContainers({ filters });
    if (!containers || !containers.length) {
      filters = dockerOpts.generateContainerNameFilter(this.containerName);
      containers = await docker.listContainers({ filters });
    }
    if (containers && containers.length) {
      const jobs = [];
      for (let c of containers) {
        const container = await docker.getContainer(c.Id);
        jobs.push(container.stop());
        logger.debug(`stopping container ${c.Id}`);
      }
      await Promise.all(jobs);
      logger.debug('all containers stopped');
    }

    const cmd = docker.generateDockerCmd(this.runtime, true, this.functionConfig);
    this.opts = await dockerOpts.generateLocalStartOpts(this.runtime,
      this.containerName,
      this.mounts,
      cmd,
      this.envs,
      {
        debugPort: this.debugPort,
        dockerUser: this.dockerUser,
        debugIde: this.debugIde,
        imageName: this.imageName,
        caPort: this.functionConfig.caPort
      });

    const container = await docker.createAndRunContainer(this.opts);
    await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
      since: (new Date().getTime() / 1000)
    });
    console.log('Function container started successful.');
    // await this.showDebugIdeTips();
    await this.setDebugIdeConfig();
  }
}
