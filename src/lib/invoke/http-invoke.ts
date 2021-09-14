'use strict';

import AsyncLock from 'async-lock';
const lock: any = new AsyncLock();
import watch from 'node-watch';

import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import { TriggerConfig } from '../interface/fc-trigger';
import * as streams from 'memory-streams';
import * as rimraf from 'rimraf';
import Invoke from './invoke';
import * as docker from '../docker/docker';
import * as dockerOpts from '../docker/docker-opts';
import { startContainer } from '../docker/docker';
import { validateSignature, parseOutputStream, getHttpRawBody, generateHttpParams, parseHttpTriggerHeaders, validateHeader, getFcReqHeaders, requestUntilServerUp, generateInitRequestOpts, generateRequestOpts } from './http';
import { v4 as uuidv4 } from 'uuid';
import {isCustomContainerRuntime, isCustomRuntime} from '../common/model/runtime';
import logger from '../../common/logger';
import {ICredentials} from "../../common/entity";

const FC_HTTP_PARAMS: string = 'x-fc-http-params';

const isWin = process.platform === 'win32';

function is2xxStatusCode(statusCode) {
  return statusCode && statusCode.startsWith('2');
}

export default class HttpInvoke extends Invoke {
  private isAnonymous: boolean;
  private endpointPrefix: string;
  private _invokeInitializer: boolean;
  private runner: any;
  private watcher?: any;
  constructor(creds: ICredentials, region: string, baseDir: string, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, triggerConfig?: TriggerConfig, debugPort?: number, debugIde?: any, tmpDir?: string, authType?: string, endpointPrefix?: string, debuggerPath?: any, debugArgs?: any, nasBaseDir?: string) {
    super(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);

    this.isAnonymous = authType === 'ANONYMOUS' || authType === 'anonymous';
    this.endpointPrefix = endpointPrefix;
    this._invokeInitializer = true;
    process.on('SIGINT', () => {
      this.cleanUnzippedCodeDir();
    });
  }

  _disableRunner(evt, name) {
    let oldRunner = null;
    let tmpCodeDir = this.unzippedCodeDir;

    lock.acquire('invoke', (done) => {
      if (!this.runner) {
        done();
        return;
      }

      logger.info(`Detect code changes, file is ${name}, event is ${evt}, auto reloading...`);

      oldRunner = this.runner;

      this.runner = null;
      this.containerName = docker.generateRamdomContainerName();
      this._invokeInitializer = true;

      setTimeout(() => {
        this.init().then(() => {
          logger.info('Reloading success, stop old container background...');
          done();
        });
      }, 500); // for mvn, jar will be writen done after a while
    }, (err, ret) => {
      logger.debug('stop container after lock released');

      // https://github.com/alibaba/funcraft/issues/527
      require('promise.prototype.finally').shim();

      oldRunner.stop().catch(reason => {
        logger.error(`stop container error, reason is ${reason}`);
      }).finally(() => {
        // release lock
        logger.info('Stopping old container successfully\n');

        if (tmpCodeDir) {
          rimraf.sync(tmpCodeDir);
          logger.info(`Clean tmp code dir ${tmpCodeDir} successfully.\n`);
        }
      });
    });
  }

  async beforeInvoke() {
    if (!this.debugPort) {
      // reuse container
      if (!this.runner) {

        logger.debug('runner not created, acquire beforeInvoke lock');

        await lock.acquire('invoke', async () => {

          if (!this.runner) {
            logger.debug('acquire invoke lock success, ready to create runner');

            if (!this.watcher && !isCustomContainerRuntime(this.runtime)) {
              // add file ignore when auto reloading
              const ign = await this.getCodeIgnore();
              this.watcher = watch(this.codeUri, {
                recursive: true, persistent: false, filter: (f) => {
                  return ign && !ign(f);
                }
              }, (evt, name) => {
                if (this.runner) {
                  this._disableRunner(evt, name);
                } else {
                  logger.debug('detect code changes, but no runner found, ignore....');
                }
              });
            }

            await this._startRunner();
          } else {
            logger.debug('acquire invoke lock success, but runner already created, skipping...');
          }
        });
      }
    }
  }

  async _startRunner() {
    const envs = await docker.generateDockerEnvs(this.creds, this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, null, this.nasConfig, true, this.debugIde, this.debugArgs);
    const cmd = docker.generateDockerCmd(this.runtime, true, this.functionConfig);

    const opts = await dockerOpts.generateLocalStartOpts(this.runtime,
      this.containerName,
      this.mounts,
      cmd,
      envs,
      {
        debugPort: this.debugPort,
        dockerUser: this.dockerUser,
        imageName: this.imageName,
        caPort: this.functionConfig.caPort
      });
    this.runner = await startContainer(opts, process.stdout, process.stderr, {
      serviceName: this.serviceName,
      functionName: this.functionName
    });
  }

  async initAndStartRunner() {
    await this.init();
    await this._startRunner();
    await this.setDebugIdeConfig();
  }

  async doInvoke(req, res) {
    // only one invoke can be processed
    await lock.acquire('invoke', async () => {
      logger.debug('http doInvoke, aquire invoke lock success, processing...');
      const outputStream = new streams.WritableStream();
      const errorStream = new streams.WritableStream();
      const event = await getHttpRawBody(req);
      const httpParams = generateHttpParams(req, this.endpointPrefix);

      const envs = await docker.generateDockerEnvs(this.creds, this.region, this.baseDir, this.serviceName, this.serviceConfig, this.functionName, this.functionConfig, this.debugPort, httpParams, this.nasConfig, true, this.debugIde);

      if (this.debugPort && !this.runner) {
        // don't reuse container
        const cmd = docker.generateDockerCmd(this.runtime, false, this.functionConfig, true);

        this.containerName = docker.generateRamdomContainerName();

        const opts = await dockerOpts.generateLocalInvokeOpts(
          this.runtime,
          this.containerName,
          this.mounts,
          cmd,
          this.debugPort,
          envs,
          this.dockerUser,
          this.debugIde
        );

        await docker.run(opts,
          event,
          outputStream, errorStream);
        this.response(outputStream, errorStream, res);
      } else {
        // reuse container
        logger.debug('http doInvoke, acquire invoke lock');
        if (isCustomContainerRuntime(this.runtime) || isCustomRuntime(this.runtime)) {
          const fcReqHeaders = getFcReqHeaders(req.headers, uuidv4(), envs);
          if (this.functionConfig.initializer && this._invokeInitializer) {
            logger.info('Initializing...');
            const initRequestOpts = generateInitRequestOpts(req, this.functionConfig.caPort, fcReqHeaders);

            const initResp = await requestUntilServerUp(initRequestOpts, this.functionConfig.initializationTimeout || 3);
            this._invokeInitializer = false;
            logger.info(`Initializing done. StatusCode of response is ${initResp.statusCode}`);
            logger.debug(`Response of initialization is: ${JSON.stringify(initResp)}`);
          }
          const requestOpts = generateRequestOpts(req, this.functionConfig.caPort, fcReqHeaders, event);

          const respOfCustomContainer = await requestUntilServerUp(requestOpts, this.functionConfig.timeout || 3);
          this.responseOfCustomContainer(res, respOfCustomContainer);
        } else {
          const cmd = [dockerOpts.resolveMockScript(this.runtime), ...docker.generateDockerCmd(this.runtime, false, this.functionConfig, true, this._invokeInitializer, isWin ? event : null)];

          logger.debug(`http doInvoke, cmd is : ${cmd}`);

          if (!this.isAnonymous) {
            // check signature
            if (!await validateSignature(req, res, req.method, this.creds)) { return; }
          }

          try {
            await this.runner.exec(cmd, {
              env: envs,
              outputStream,
              errorStream,
              verbose: true,
              context: {
                serviceName: this.serviceName,
                functionName: this.functionName
              },
              event: !isWin ? event : null
            });

            this._invokeInitializer = false;
          } catch (error) {
            logger.log(`Fc Error: ${errorStream.toString()}`, 'red');

            // errors for runtime error
            // for example, when using nodejs, use response.send(new Error('haha')) will lead to runtime error
            // and container will auto exit, exec will receive no message
            res.status(500);
            res.setHeader('Content-Type', 'application/json');

            res.send({
              'errorMessage': `Process exited unexpectedly before completing request`
            });

            // for next invoke
            this.runner = null;
            this.containerName = docker.generateRamdomContainerName();
            if (error.indexOf && error.indexOf('exited with code 137') > -1) { // receive signal SIGKILL http://tldp.org/LDP/abs/html/exitcodes.html
              logger.debug(error);
            } else {
              logger.error(error);
            }
            return;
          }
          this.response(outputStream, errorStream, res);
        }
        logger.debug('http doInvoke exec end, begin to response');
      }

    });
  }

  async afterInvoke() {

  }


  responseOfCustomContainer(res, resp) {
    var { statusCode, headers, body } = resp;
    res.status(statusCode);
    res.set(headers);
    res.send(body);
  }

  // responseHttpTriggers
  response(outputStream, errorStream, res) {
    // todo: real-time processing ?
    const errorResponse = errorStream.toString();

    const { statusCode, headers, body, billedTime, memoryUsage } = parseOutputStream(outputStream);

    if (isCustomRuntime(this.runtime)) {
      res.status(statusCode);
      res.set(headers);
      res.send(body);
    } else { // non custom http request
      // it's function status code and is not http trigger response status code
      if (is2xxStatusCode(statusCode)) {
        const base64HttpParams = headers[FC_HTTP_PARAMS];

        const httpParams = parseHttpTriggerHeaders(base64HttpParams) || {};

        res.status(httpParams.status || statusCode);

        const httpParamsHeaders = httpParams.headersMap || httpParams.headers || headers;
        for (const headerKey in httpParamsHeaders) {
          if (!{}.hasOwnProperty.call(httpParamsHeaders, headerKey)) { continue; }

          const headerValue = httpParamsHeaders[headerKey];

          if (validateHeader(headerKey, headerValue)) {
            res.setHeader(headerKey, headerValue);
          }
        }
        res.send(body);

        if (errorResponse) {
          logger.log(errorResponse, 'red');
        }

      } else {
        logger.log(errorResponse, 'red');
        logger.log(body, 'red');

        res.status(statusCode || 500);
        res.setHeader('Content-Type', 'application/json');

        if (body) {
          res.send(body);
        } else {
          res.send({
            'errorMessage': `Process exited unexpectedly before completing request (duration: ${billedTime}ms, maxMemoryUsage: ${memoryUsage}MB)`
          });
        }
      }
    }
  }
}
