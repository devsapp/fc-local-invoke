import logger from '../../common/logger';
import { TriggerConfig } from '../interface/fc-trigger';
import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import yaml from 'js-yaml';
import * as _ from 'lodash';
import { detectLibrary } from '../fc';
import { ensureTmpDir } from '../utils/path';
import HttpInvoke from '../invoke/http-invoke';
import ApiInvoke from '../invoke/api-invoke';
import { setCORSHeaders } from '../cors';
import {ICredentials} from "../../common/entity";

const SERVER_CLOSE_TIMEOUT: number = 3000;


export async function registerHttpTriggerByRoutes(creds: ICredentials, region: string, devsPath: string, baseDir: string, app: any, router: any, serverPort: number, httpTrigger: TriggerConfig, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, routePaths?: string[], domainName?: string, debugPort?: number, debugIde?: any, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string, eager?: boolean) {
  if (_.isEmpty(routePaths)) {
    await registerSingleHttpTrigger(creds, region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, null, domainName, debugPort, debugIde, eager, debuggerPath, debugArgs, nasBaseDir);
  } else {
    for (const routePath of routePaths) {
      await registerSingleHttpTrigger(creds, region, devsPath, baseDir, app, router, serverPort, httpTrigger, serviceConfig, functionConfig, routePath, domainName, debugPort, debugIde, eager, debuggerPath, debugArgs, nasBaseDir);
    }
  }
}

export async function registerSingleHttpTrigger(creds: ICredentials, region: string, devsPath: string, baseDir: string, app: any, router: any, serverPort: number, httpTrigger: TriggerConfig, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, routePath?: string, domainName?: string, debugPort?: number, debugIde?: string, eager = false, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string) {
  const serviceName: string = serviceConfig.name;
  const functionName: string = functionConfig.name;
  const triggerName: string = httpTrigger.name;
  logger.debug(`serviceName: ${serviceName}`);
  logger.debug(`functionName: ${functionName}`);
  logger.debug(`tiggerName: ${triggerName}`);
  logger.debug(`httpTrigger: ${yaml.dump(httpTrigger)}`);
  logger.debug(`domainName: ${domainName}`);
  logger.debug(`routePath: ${routePath}`);

  const isCustomDomain: any = routePath;
  const httpTriggerPrefix: string = `/2016-08-15/proxy/${serviceName}/${functionName}`;

  const customDomainPrefix: string = routePath;

  const endpointForRoute: string = isCustomDomain ? customDomainPrefix : `${httpTriggerPrefix}/*`;

  let endpointForDisplay = endpointForRoute;
  if (_.endsWith(endpointForDisplay, '*')) {
    endpointForDisplay = endpointForDisplay.substr(0, endpointForDisplay.length - 1);
  }

  const endpointPrefix = isCustomDomain ? '' : httpTriggerPrefix;

  const triggerConfig: any = httpTrigger.config;
  const httpMethods: string[] = triggerConfig.methods;
  const authType: string = triggerConfig.authType;

  const codeUri = functionConfig.codeUri;
  const runtime = functionConfig.runtime;

  logger.debug(`debug port: ${debugPort}`);

  await detectLibrary(codeUri, runtime, baseDir, functionName);

  const tmpDir: string = await ensureTmpDir(null, devsPath, serviceName, functionName);

  const httpInvoke = new HttpInvoke(creds, region, baseDir, serviceConfig, functionConfig, triggerConfig, debugPort, debugIde, tmpDir, authType, endpointPrefix, debuggerPath, debugArgs, nasBaseDir);
  if (eager) {
    await httpInvoke.initAndStartRunner();
  }
  app.use(setCORSHeaders);
  app.use(router);

  for (let method of httpMethods) {
    router[method.toLowerCase()](endpointForRoute, async (req, res) => {
      if (req.get('Upgrade') === 'websocket') {
        res.status(403).send('websocket not support');
        return;
      }

      // @ts-ignore
      await httpInvoke.invoke(req, res);
    });
  }
  printHttpTriggerTips(serverPort, serviceName, functionName, triggerName, endpointForDisplay, httpMethods, authType, domainName);
}

function printHttpTriggerTips(serverPort: number, serviceName: string, functionName: string, triggerName: string, endpoint: string, httpMethods: string[], authType: string, domainName: string) {
  const prefix = domainName ? `CustomDomain ${domainName}` : `HttpTrigger ${triggerName}`;
  logger.info(`${prefix} of ${serviceName}/${functionName} was registered`);
  logger.log('\turl: ' + `http://localhost:${serverPort}${endpoint}`, 'yellow');
  logger.log(`\tmethods: ` + httpMethods, 'yellow');
  logger.log(`\tauthType: ` + authType, 'yellow');
}

export function registerSigintForExpress(server) {
  var sockets = {}, nextSocketId = 0;

  // close express server
  // https://stackoverflow.com/questions/14626636/how-do-i-shutdown-a-node-js-https-server-immediately/14636625#14636625
  server.on('connection', function (socket) {
    let socketId = nextSocketId++;
    sockets[socketId] = socket;
    socket.on('close', function () {
      delete sockets[socketId];
    });
  });

  process.once('SIGINT', () => {

    console.log('begin to close server');

    // force close if gracefully closing failed
    // https://stackoverflow.com/a/36830072/6602338
    const serverCloseTimeout = setTimeout(() => {
      console.log('server close timeout, force to close server');

      server.emit('close');

      // if force close failed, exit directly
      setTimeout(() => {
        process.exit(-1); // eslint-disable-line
      }, SERVER_CLOSE_TIMEOUT);

    }, SERVER_CLOSE_TIMEOUT);

    // gracefully close server
    server.close(() => {
      clearTimeout(serverCloseTimeout);
    });

    for (let socketId in sockets) {
      if (!{}.hasOwnProperty.call(sockets, socketId)) { continue; }
      sockets[socketId].destroy();
    }
  });
}

export async function registerApis(creds: ICredentials, region: string, devsPath: string, baseDir: string, app: any, serverPort: number, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, debugPort?: number, debugIde?: any, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string) {
  const serviceName: string = serviceConfig.name;
  const functionName: string = functionConfig.name;

  const endpoint: string = `/2016-08-15/services/${serviceName}/functions/${functionName}/invocations`;

  const tmpDir: string = await ensureTmpDir(null, devsPath, serviceName, functionName);

  const apiInvoke = new ApiInvoke(creds, region, baseDir, serviceConfig, functionConfig, null, debugPort, debugIde, tmpDir, debuggerPath, debugArgs, nasBaseDir);

  const codeUri = functionConfig.codeUri;
  const runtime = functionConfig.runtime;
  await detectLibrary(codeUri, runtime, baseDir, functionName);

  app.post(endpoint, async (req, res) => {
    // @ts-ignore
    apiInvoke.invoke(req, res);
  });

  logsApi(serverPort, serviceName, functionName, endpoint);

  console.log();
}

function logsApi(serverPort, serviceName, functionName, endpoint) {
  logger.log(`API ${serviceName}/${functionName} was registered`, 'green');
  logger.log('\turl: ' + `http://localhost:${serverPort}${endpoint}/`, 'yellow');
}
