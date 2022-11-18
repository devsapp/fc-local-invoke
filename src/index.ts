import logger from './common/logger';
import { InputProps, ICredentials, IProperties } from './common/entity';
import * as _ from 'lodash';
import Docker from 'dockerode';
import * as core from '@serverless-devs/core';
import { ServiceConfig } from './lib/interface/fc-service';
import { FunctionConfig } from './lib/interface/fc-function';
import { TriggerConfig } from './lib/interface/fc-trigger';
import { CustomDomainConfig } from './lib/interface/fc-custom-domain';
import { detectNasBaseDir, updateCodeUriWithBuildPath } from './lib/devs';
import { getDebugOptions } from './lib/debug';
import * as path from 'path';
import { ensureFilesModified, eventPriority } from './lib/utils/file';
import { findHttpTrigger, parseDomainRoutePath, getRoutePathsByDomainPath, checkCustomDomainConfig, includeHttpTrigger } from './lib/definition';
import { ensureTmpDir } from './lib/utils/path';
import EventStart from './lib/invoke/event-start';
import { showTipsWithDomainIfNecessary } from './lib/utils/tips';
import { registerHttpTriggerByRoutes, registerSigintForExpress, registerApis } from './lib/invoke/http-support';
import { detectLibrary } from './lib/fc';
import { isFalseValue } from './lib/utils/value';
import LocalInvoke from './lib/invoke/local-invoke';
import { COMPONENT_HELP_INFO, START_HELP_INFO, INVOKE_HELP_INFO } from './lib/static';
import * as fs from 'fs-extra';
import StdoutFormatter from './lib/component/stdout-formatter';
import express from 'express';
import { isCustomContainerRuntime, isCustomRuntime } from './lib/common/model/runtime';
import handlerCustom from './handler-custom';
import { loadLayer } from './lib/layer';

const app: any = express();

const MIN_SERVER_PORT = 7000;
const MAX_SERVER_PORT = 8000;

const DEFAULT_CA_PORT = 9000;
let DEFAULT_SERVER_PORT: number = parseInt(_.toString(Math.random() * (MAX_SERVER_PORT - MIN_SERVER_PORT + 1) + MIN_SERVER_PORT), 10);
const SUPPORTED_MODES: string[] = ['api', 'server', 'normal'];

export default class FcLocalInvokeComponent {
  async report(componentName: string, command: string, accountID?: string, access?: string): Promise<void> {
    let uid: string = accountID;
    if (!accountID && access) {
      const credentials: ICredentials = await core.getCredential(access);
      uid = credentials.AccountID;
    }
    try {
      core.reportComponent(componentName, {
        command,
        uid,
      });
    } catch (e) {
      logger.warn(StdoutFormatter.stdoutFormatter.warn('component report', `component name: ${componentName}, method: ${command}`, e.message));
    }
  }

  startExpress(targetApp: any, serverPort: number) {
    const server = targetApp.listen(serverPort, () => {
      console.log(`function compute app listening on port ${serverPort}!`);
      console.log();
    });

    registerSigintForExpress(server);
  }

  async handlerInputs(inputs: InputProps): Promise<any> {
    await StdoutFormatter.initStdout();
    const project = inputs?.project;
    const access: string = project?.access;
    const credentials: ICredentials = await core.getCredential(access);
    await this.report('fc-local-invoke', inputs?.command, credentials?.AccountID);

    const properties: IProperties = inputs?.props;
    const appName: string = inputs?.appName;
    // 去除 args 的行首以及行尾的空格
    const args: string = inputs?.args.replace(/(^\s*)|(\s*$)/g, '');
    const curPath: any = inputs?.path;
    const projectName: string = project?.projectName;
    const { region } = properties;

    const parsedArgs: { [key: string]: any } = core.commandParse(inputs, {
      boolean: ['help'],
      alias: { help: 'h' },
    });

    const argsData: any = parsedArgs?.data || {};
    if (argsData?.help) {
      return {
        region,
        credentials,
        curPath,
        args,
        access,
        isHelp: true,
      };
    }

    const devsPath: string = curPath.configPath;
    const nasBaseDir: string = detectNasBaseDir(devsPath);
    const baseDir: string = path.dirname(devsPath);

    const serviceConfig: ServiceConfig = properties?.service;
    const functionConfig: FunctionConfig = await updateCodeUriWithBuildPath(baseDir, properties?.function, serviceConfig.name);
    if (functionConfig && (isCustomContainerRuntime(functionConfig?.runtime) || isCustomRuntime(functionConfig?.runtime))) {
      functionConfig.caPort = functionConfig.caPort || DEFAULT_CA_PORT;
      DEFAULT_SERVER_PORT = _.isUndefined(functionConfig.caPort) ? DEFAULT_SERVER_PORT : _.toNumber(functionConfig.caPort) + 1;
    }
    const triggerConfigList: TriggerConfig[] = properties?.triggers;
    const customDomainConfigList: CustomDomainConfig[] = properties?.customDomains;

    const fcCore = await core.loadComponent('devsapp/fc-core');
    await fcCore.preExecute(new Docker(), argsData['clean-useless-image']);

    if (isCustomRuntime(functionConfig?.runtime)) {
      await handlerCustom(functionConfig);
    }

    await loadLayer({ // 加载 layer 的代码
      credentials,
      region,
      baseDir,
      layers: functionConfig.layers,
      runtime: functionConfig.runtime,
      serviceName: serviceConfig.name,
      functionName: functionConfig.name,
    });

    return {
      serviceConfig,
      functionConfig,
      triggerConfigList,
      customDomainConfigList,
      region,
      credentials,
      curPath,
      args,
      appName,
      projectName,
      devsPath,
      nasBaseDir,
      baseDir,
    };
  }

  /**
   * http 函数本地调试
   * @param inputs
   * @returns
   */
  async start(inputs: InputProps): Promise<any> {
    const {
      serviceConfig,
      functionConfig,
      triggerConfigList,
      customDomainConfigList,
      region,
      devsPath,
      nasBaseDir,
      baseDir,
      isHelp,
      credentials,
    } = await this.handlerInputs(inputs);
    if (isHelp) {
      core.help(START_HELP_INFO);
      return;
    }
    const parsedArgs: { [key: string]: any } = core.commandParse(inputs, {
      boolean: ['debug', 'help'],
      string: ['custom-domain', 'sdk-version'],
      alias: {
        help: 'h',
        config: 'c',
        'debug-port': 'd',
      },
    });
    const argsData: any = parsedArgs?.data || {};
    const nonOptionsArgs = parsedArgs.data?._ || [];

    if (_.isEmpty(functionConfig)) {
      logger.error('Please add function config in your s.yml/yaml and retry start.');
      return {
        status: 'failed',
      };
    }
    if (_.isEmpty(triggerConfigList)) {
      logger.error('Please local invoke non-http function with \'invoke\' method in fc-local-invoke component.');
      return {
        status: 'failed',
      };
    }
    if (functionConfig?.codeUri && !await fs.pathExists(functionConfig?.codeUri)) {
      logger.error(`Please make sure your codeUri: ${functionConfig.codeUri} exists and retry start.`);
      return {
        status: 'failed',
      };
    }

    const {
      debugPort,
      debugIde,
      debuggerPath,
      debugArgs,
    } = getDebugOptions(argsData);
    const userDefinedServerPort: number = (argsData && argsData['server-port']) ? _.toInteger(argsData['server-port']) : null;
    const sdkVersion = argsData['sdk-version'] || '';
    logger.debug(`sdkVersion: ${sdkVersion}`);

    // s start --custom auto 兼容 s start auto
    const invokeName: string = argsData?.['custom-domain'] || nonOptionsArgs[0];
    logger.debug(`invokeName: ${invokeName}`);
    // TODO: debug mode for dotnetcore

    const serviceName: string = serviceConfig.name;
    const functionName: string = functionConfig.name;
    const httpTriggerPath = `http://localhost/2016-08-15/proxy/${serviceName}/${functionName}`;

    await ensureFilesModified(devsPath);

    const httpTrigger: TriggerConfig = findHttpTrigger(triggerConfigList);
    if (_.isEmpty(httpTrigger)) {
      logger.error('Start method only for the function with the http trigger.');
      return;
    }
    const [domainName, routePath] = await parseDomainRoutePath(invokeName, customDomainConfigList, httpTriggerPath);

    const routePaths: string[] = getRoutePathsByDomainPath(customDomainConfigList, domainName, routePath);
    if (!_.isEmpty(routePaths)) {
      // 使用 customDomain 进行调试
      checkCustomDomainConfig(serviceName, functionName, customDomainConfigList, domainName);
    }

    const router = express.Router({
      strict: true,
    });
    if (functionConfig.runtime === 'go1') {
      logger.log('The local command for go1 runtime is in public test. If you have any questions, welcome to join DingTalk Group: 33947367', 'yellow');
    }

    const eager = !_.isNil(debugPort);
    await registerHttpTriggerByRoutes(credentials, region, devsPath, baseDir, app, router, userDefinedServerPort || DEFAULT_SERVER_PORT, httpTrigger, serviceConfig, functionConfig, routePaths, domainName, debugPort, debugIde, debuggerPath, debugArgs, nasBaseDir, eager, sdkVersion);
    this.startExpress(app, userDefinedServerPort || DEFAULT_SERVER_PORT);

    showTipsWithDomainIfNecessary(customDomainConfigList, domainName);
    return {
      status: 'succeed',
    };
  }

  /**
   * event 函数本地调试
   * @param inputs
   * @returns
   */
  async invoke(inputs: InputProps): Promise<any> {
    const {
      serviceConfig,
      functionConfig,
      triggerConfigList,
      region,
      devsPath,
      nasBaseDir,
      baseDir,
      projectName,
      isHelp,
      credentials,
    } = await this.handlerInputs(inputs);
    if (isHelp) {
      core.help(INVOKE_HELP_INFO);
      return;
    }
    const parsedArgs: { [key: string]: any } = core.commandParse(inputs, {
      boolean: ['debug'],
      alias: {
        help: 'h',
        config: 'c',
        mode: 'm',
        event: 'e',
        'event-file': 'f',
        'event-stdin': 's',
        'debug-port': 'd',
      },
    });
    const argsData: any = parsedArgs?.data || {};

    if (_.isEmpty(functionConfig)) {
      logger.error('Please add function config in your s.yml/yaml and retry start.');
      return {
        status: 'failed',
      };
    }
    if (!_.isEmpty(triggerConfigList) && includeHttpTrigger(triggerConfigList)) {
      logger.error('Please local invoke http function with \'start\' method in fc-local-invoke component.');
      return {
        status: 'failed',
      };
    }
    if (functionConfig?.codeUri && !await fs.pathExists(functionConfig?.codeUri)) {
      logger.error(`Please make sure your codeUri: ${functionConfig.codeUri} exists and retry start.`);
      return {
        status: 'failed',
      };
    }
    if (functionConfig.runtime === 'go1') {
      logger.log('The local command for go1 runtime is in public test. If you have any questions, welcome to join DingTalk Group: 33947367', 'yellow');
    }

    const {
      debugPort,
      debugIde,
      debuggerPath,
      debugArgs,
    } = getDebugOptions(argsData);
    const userDefinedServerPort: number = (argsData && argsData['server-port']) ? _.toInteger(argsData['server-port']) : null;

    // TODO: debug mode for dotnetcore

    const serviceName: string = serviceConfig?.name;
    const functionName: string = functionConfig?.name;
    const { mode } = argsData;

    if (mode && !SUPPORTED_MODES.includes(mode)) {
      const fcCore = await core.loadComponent('devsapp/fc-core');
      throw new fcCore.CatchableError(`Unsupported mode: ${mode}`);
    }

    await ensureFilesModified(devsPath);
    if (mode === 'api') {
      await registerApis(credentials, region, devsPath, baseDir, app, userDefinedServerPort || DEFAULT_SERVER_PORT, serviceConfig, functionConfig, debugPort, debugIde, debuggerPath, debugArgs, nasBaseDir);
      this.startExpress(app, userDefinedServerPort || DEFAULT_SERVER_PORT);
    } else if (mode == 'server') {
      const tmpDir = await ensureTmpDir(null, devsPath, serviceName, functionName);
      const eventStart = new EventStart(credentials, region, baseDir, serviceConfig, functionConfig, null, debugPort, debugIde, tmpDir, null, null, nasBaseDir);
      await eventStart.init();
      logger.log(`Invoke with server mode done, please open a new terminal and execute 's ${projectName} local invoke' to reuse the container.`, 'yellow');
      logger.log('If you want to quit the server, please press Ctrl^C', 'yellow');
    } else {
      const event: string = await eventPriority(argsData);
      logger.debug(`event content: ${event}`);
      const { codeUri } = functionConfig;
      const { runtime } = functionConfig;
      await detectLibrary(codeUri, runtime, baseDir, functionName);
      // env 'DISABLE_BIND_MOUNT_TMP_DIR' to disable bind mount of tmp dir.
      // libreoffice will be failed if /tmp directory is bind mount by docker.
      let absTmpDir: string;
      if (!process.env.DISABLE_BIND_MOUNT_TMP_DIR
        || isFalseValue(process.env.DISABLE_BIND_MOUNT_TMP_DIR)
      ) {
        absTmpDir = await ensureTmpDir(argsData['tmp-dir'], devsPath, serviceName, functionName);
      }
      logger.debug(`The temp directory mounted to /tmp is ${absTmpDir || 'null'}`);
      // Lazy loading to avoid stdin being taken over twice.
      let reuse = true;
      if (mode && mode === 'normal') {
        reuse = false;
      }
      logger.debug(`reuse flag is ${reuse}`);
      const localInvoke = new LocalInvoke(credentials, region, baseDir, serviceConfig, functionConfig, null, debugPort, debugIde, absTmpDir, debuggerPath, debugArgs, reuse, nasBaseDir);
      // @ts-ignore
      await localInvoke.invoke(event);
    }
    return {
      status: 'succeed',
      mode,
    };
  }

  async help(): Promise<void> {
    await this.report('fc-local-invoke', 'help');
    core.help(COMPONENT_HELP_INFO);
  }
}
