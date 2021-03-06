import * as ip from 'ip';
import * as fs from 'fs-extra';
import * as path from 'path';
import logger from '../common/logger';
const IDE_PYCHARM: string = 'pycharm';

export function getDebugOptions(argsData: any): any {
  const debugPort: number = argsData['debug-port'];
  logger.debug(`debugPort: ${debugPort}`);
  const debugIde: any = argsData['config'];
  logger.debug(`debugIde: ${debugIde}`);
  const debuggerPath: string = argsData['debugger-path'];
  logger.debug(`debuggerPath: ${debuggerPath}`);
  const debugArgs: any = argsData['debug-args'];
  logger.debug(`debugArgs: ${JSON.stringify(debugArgs)}`);

  return {
    debugPort,
    debugIde,
    debuggerPath,
    debugArgs
  }
}

export function generateDockerDebugOpts(runtime, debugPort, debugIde) {
  const exposedPort = `${debugPort}/tcp`;

  if (debugIde === IDE_PYCHARM) {
    if (!['python2.7', 'python3', 'python3.9'].includes(runtime)) {
      throw new Error(`${IDE_PYCHARM} debug config only support for runtime [python2.7, python3, python3.9]`);
    } else {
      return {};
    }
  } else if (runtime === 'php7.2') {
    return {};
  } else {
    return {
      ExposedPorts: {
        [exposedPort]: {}
      },
      HostConfig: {
        PortBindings: {
          [exposedPort]: [
            {
              'HostIp': '',
              'HostPort': `${debugPort}`
            }
          ]
        }
      }
    };
  }
}
export function generateDebugEnv(runtime, debugPort, debugIde) {
  const remoteIp = ip.address();

  switch (runtime) {
    case 'nodejs14':
    case 'nodejs12':
    case 'nodejs10':
    case 'nodejs8':
      return { 'DEBUG_OPTIONS': `--inspect-brk=0.0.0.0:${debugPort}` };
    case 'nodejs6':
      return { 'DEBUG_OPTIONS': `--debug-brk=${debugPort}` };
    case 'python2.7':
    case 'python3':
    case 'python3.9':
      if (debugIde === IDE_PYCHARM) {
        return {};
      }
      return { 'DEBUG_OPTIONS': `-m ptvsd --host 0.0.0.0 --port ${debugPort} --wait` };

    case 'java8':
      return { 'DEBUG_OPTIONS': `-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=${debugPort}` };
    case 'java11':
      return { 'DEBUG_OPTIONS': `-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=*:${debugPort}` };
    case 'php7.2':
      console.log(`using remote_ip ${remoteIp}`);
      return { 'XDEBUG_CONFIG': `remote_enable=1 remote_autostart=1 remote_port=${debugPort} remote_host=${remoteIp}` };
    case 'dotnetcore2.1':
      return { 'DEBUG_OPTIONS': 'true' };
    default:
      throw new Error(`${runtime} does not support debug mode`);
  }
}

export async function generateVscodeDebugConfig(serviceName, functionName, runtime, codePath, debugPort) {

  const stats = await fs.lstat(codePath);

  if (!stats.isDirectory()) {
    codePath = path.dirname(codePath);
  }

  switch (runtime) {
  case 'nodejs6':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'node',
          'request': 'attach',
          'address': 'localhost',
          'port': debugPort,
          'localRoot': `${codePath}`,
          'remoteRoot': '/code',
          'protocol': 'legacy',
          'stopOnEntry': false
        }
      ]
    };
  case 'nodejs14':
  case 'nodejs12':
  case 'nodejs10':
  case 'nodejs8':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'node',
          'request': 'attach',
          'address': 'localhost',
          'port': debugPort,
          'localRoot': `${codePath}`,
          'remoteRoot': '/code',
          'protocol': 'inspector',
          'stopOnEntry': false
        }
      ]
    };
  case 'python3':
  case 'python3.9':
  case 'python2.7':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'python',
          'request': 'attach',
          'host': 'localhost',
          'port': debugPort,
          'pathMappings': [
            {
              'localRoot': `${codePath}`,
              'remoteRoot': '/code'
            }
          ]
        }
      ]
    };
  case 'java8':
  case 'java11':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'java',
          'request': 'attach',
          'hostName': 'localhost',
          'port': debugPort
        }
      ]
    };
  case 'php7.2':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'php',
          'request': 'launch',
          'port': debugPort,
          'stopOnEntry': false,
          'pathMappings': {
            '/code': `${codePath}`
          },
          'ignore': [
            '/var/fc/runtime/**'
          ]
        }
      ]
    };
  case 'dotnetcore2.1':
    return {
      'version': '0.2.0',
      'configurations': [
        {
          'name': `fc/${serviceName}/${functionName}`,
          'type': 'coreclr',
          'request': 'attach',
          'processName': 'dotnet',
          'pipeTransport': {
            'pipeProgram': 'sh',
            'pipeArgs': [
              '-c',
              `docker exec -i $(docker ps -q -f publish=${debugPort}) \${debuggerCommand}`
            ],
            'debuggerPath': '/vsdbg/vsdbg',
            'pipeCwd': '${workspaceFolder}'
          },
          'windows': {
            'pipeTransport': {
              'pipeProgram': 'powershell',
              'pipeArgs': [
                '-c',
                `docker exec -i $(docker ps -q -f publish=${debugPort}) \${debuggerCommand}`
              ],
              'debuggerPath': '/vsdbg/vsdbg',
              'pipeCwd': '${workspaceFolder}'
            }
          },
          'sourceFileMap': {
            '/code': codePath
          }
        }

      ]
    };
  default:
    break;
  }

  logger.debug('CodePath: ' + codePath);
}
