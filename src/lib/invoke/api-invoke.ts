'use strict';

import Invoke from './invoke';
import * as docker from '../docker/docker'
import * as dockerOpts from '../docker/docker-opts';
import * as core from '@serverless-devs/core';
import { parseOutputStream, getFcReqHeaders, validateSignature, getHttpRawBody, generateInitRequestOpts, requestUntilServerUp, generateInvokeRequestOpts } from './http';
import {isCustomContainerRuntime, isCustomRuntime} from '../common/model/runtime';

import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import { TriggerConfig } from '../interface/fc-trigger';
import logger from '../../common/logger';
import { v4 as uuidv4 } from 'uuid';
import * as streams from 'memory-streams';
import {ICredentials} from "../../common/entity";

export default class ApiInvoke extends Invoke {
  private envs: any;
  private cmd: string[];
  constructor(creds: ICredentials, region: string, baseDir: string, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, triggerConfig?: TriggerConfig, debugPort?: number, debugIde?: any, tmpDir?: string, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string) {
    super(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);
  }

  async init() {
    await super.init();
    this.envs = await docker.generateDockerEnvs(this.creds, this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig,  this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);
  }

  async doInvoke(req, res) {
    const containerName = docker.generateRamdomContainerName();
    const event = await getHttpRawBody(req);
    var invokeInitializer = false;
    if (this.functionConfig.initializer) { invokeInitializer = true; }

    this.cmd = docker.generateDockerCmd(this.runtime, false, this.functionConfig, true, invokeInitializer);
    const outputStream = new streams.WritableStream();
    const errorStream = new streams.WritableStream();

    let limitedHostConfig;
    try {
      const fcCore = await core.loadComponent('devsapp/fc-core');
      limitedHostConfig = await fcCore.genContainerResourcesLimitConfig(this.functionConfig.memorySize);
      logger.debug(limitedHostConfig);
    } catch (err) {
      logger.debug(err);
      logger.warn("Try to generate the container's resource limit configuration but failed. The default configuration of docker will be used.");
      limitedHostConfig = {
        CpuPeriod: null,
        CpuQuota: null,
        Memory: null,
        Ulimits: null,
      };
    }

    // check signature
    if (!await validateSignature(req, res, req.method, this.creds)) { return; }
    if (isCustomContainerRuntime(this.runtime) || isCustomRuntime(this.runtime)) {
      const opts = await dockerOpts.generateLocalStartOpts(this.runtime,
        containerName,
        this.mounts,
        this.cmd,
        this.envs,
        limitedHostConfig,
        {
          debugPort: this.debugPort,
          dockerUser: this.dockerUser,
          debugIde: this.debugIde,
          imageName: this.imageName,
          caPort: this.functionConfig.caPort
        }
      );
      const containerRunner = await docker.runContainer(opts, outputStream, errorStream, {
        serviceName: this.serviceName,
        functionName: this.functionName
      });

      const container = containerRunner.container;

      // send request
      const fcReqHeaders = getFcReqHeaders({}, uuidv4(), this.envs);
      if (this.functionConfig.initializer) {
        console.log('Initializing...');
        const initRequestOpts = generateInitRequestOpts({}, this.functionConfig.caPort, fcReqHeaders);

        const initResp = await requestUntilServerUp(initRequestOpts, this.functionConfig.initializationTimeout || 3);
        console.log(initResp.body);
        logger.debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
      }

      const requestOpts = generateInvokeRequestOpts(this.functionConfig.caPort, fcReqHeaders, event);

      const respOfCustomContainer = await requestUntilServerUp(requestOpts, this.functionConfig.timeout || 3);

      // exit container
      this.responseOfCustomContainer(res, respOfCustomContainer);
      await docker.exitContainer(container);
    } else {
      const opts = await dockerOpts.generateLocalInvokeOpts(this.runtime,
        containerName,
        this.mounts,
        this.cmd,
        this.debugPort,
        this.envs,
        limitedHostConfig,
        this.dockerUser,
        this.debugIde);
      await docker.run(opts,
        event,
        outputStream,
        errorStream);

      this.response(outputStream, errorStream, res);
    }
  }
  responseOfCustomContainer(res, resp) {
    var { statusCode, headers, body } = resp;
    res.status(statusCode);
    res.set(headers);
    res.send(body);
  }
  // responseApi
  response(outputStream, errorStream, res) {
    const errorResponse = errorStream.toString();
    // 当容器的输出为空异常时
    if (outputStream.toString() === '') {
      logger.warn('Warning: outputStream of CA container is empty');
    }

    let { statusCode, body, requestId, billedTime, memoryUsage } = parseOutputStream(outputStream);

    const headers = {
      'content-type': 'application/octet-stream',
      'x-fc-request-id': requestId,
      'x-fc-invocation-duration': billedTime,
      'x-fc-invocation-service-version': 'LATEST',
      'x-fc-max-memory-usage': memoryUsage,
      'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version'
    };

    if (statusCode) {
      res.status(statusCode);
    } else {
      res.status(500);
    }


    // todo: fix body 后面多个换行的 bug
    if (errorResponse) { // process HandledInvocationError and UnhandledInvocationError
      headers['content-type'] = 'application/json';

      logger.error(errorResponse);

      if (body.toString()) {
        headers['x-fc-error-type'] = 'HandledInvocationError';
      } else {
        headers['x-fc-error-type'] = 'UnhandledInvocationError';
        body = {
          'errorMessage': `Process exited unexpectedly before completing request (duration: ${billedTime}ms, maxMemoryUsage: ${memoryUsage}MB)`
        };
      }
    }

    res.set(headers);
    res.send(body);
  }
}
