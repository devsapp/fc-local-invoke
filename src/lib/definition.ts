import { inquirer } from '@serverless-devs/core';
import yaml from 'js-yaml';
import { NasConfig } from './interface/fc-service';
import { TriggerConfig } from './interface/fc-trigger';
import { CustomDomainConfig, RouteConfig } from './interface/fc-custom-domain';
import * as _ from 'lodash';
import logger from '../common/logger';
import StdoutFormatter from './component/stdout-formatter';

export function isNasAutoConfig(nasConfig: NasConfig | string): boolean {
  if (_.isString(nasConfig) && nasConfig.toLowerCase() === 'auto') { return true; }
  return false;
}

export function getUserIdAndGroupId(nasConfig: NasConfig | string) {
  if (_.isEmpty(nasConfig)) { return {}; }

  if (_.isString(nasConfig) && nasConfig.toLowerCase() === 'auto') {
    return {
      userId: 10003,
      groupId: 10003
    };
  }
  return {
    // @ts-ignore
    userId: nasConfig.userId,
    // @ts-ignore
    groupId: nasConfig.groupId
  };
}

export function findHttpTrigger(triggerConfigList: TriggerConfig[]): TriggerConfig {
  for (const triggerConfig of triggerConfigList) {
    if (triggerConfig.type === 'http') {
      logger.info(StdoutFormatter.stdoutFormatter.using('trigger for start', ''));
      logger.log(yaml.dump(triggerConfig));
      return triggerConfig;
    }
  }

  return null;
}

export async function parseDomainRoutePath(domainRoutePath: string, customDomainConfigList: CustomDomainConfig[], httpTriggerPath: string) {
  let domainName = null;
  let routePath = null;

  // 由于默认是 customDomain，所以预留系统字段模拟fc系统路径
  if (domainRoutePath === 'system') {
    return [null, null];
  }
  if (!domainRoutePath) {
    if (_.isEmpty(customDomainConfigList)) {
      return [null, null];
    }
    if (customDomainConfigList.length === 1) {
      domainName = customDomainConfigList[0].domainName;
    } else {
      const domainNames = customDomainConfigList.map(({ domainName }): string => domainName);
      const systemKey = `system[2016-08-15] [${httpTriggerPath}]`;
      domainNames.unshift(systemKey);
      domainName = (await inquirer.prompt({
        type: 'list',
        name: 'domainName',
        message: 'Please select a domain name(system is the system path of FC): ',
        choices: domainNames,
      })).domainName;
      if (domainName === systemKey) {
        return [null, null];
      }
    }
    return [domainName, null];
  }

  const index = domainRoutePath.indexOf('/');
  if (index < 0) {
    domainName = domainRoutePath;
  } else {
    domainName = domainRoutePath.substring(0, index);
    routePath = domainRoutePath.substring(index);
  }
  return [domainName, routePath];
}

export function getRoutePathsByDomainPath(customDomainConfigList: CustomDomainConfig[], domainName: string, routePath: string): string[] {
  if (_.isEmpty(customDomainConfigList) || !domainName) { return []; }
  let customDomainConfig: CustomDomainConfig;
  for (const domain of customDomainConfigList) {
    if (domain.domainName === domainName) {
      customDomainConfig = domain;
      break;
    }
  }
  if (!customDomainConfig) { throw new Error(`Custom domain ${domainName} dose not exist in your s.yml/yaml`); }
  const routeConfigList: RouteConfig[] = customDomainConfig.routeConfigs;
  return getRoutePaths(routeConfigList, routePath);
}

function getRoutePaths(routeConfigList: RouteConfig[], routePath: string): string[] {
  if (routePath && !_.includes(routeConfigList.map((r) => r.path), routePath)) {
    throw new Error(`can't find ${routePath} in Routes definition`);
  }

  const routePaths: string[] = [];
  for (const routeConfig of routeConfigList) {
    routePaths.push(routeConfig.path);
  }

  return routePath ? routePaths.filter(f => { return f === routePath; }) : routePaths;
}


export function checkCustomDomainConfig(serviceName: string, functionName: string, customDomainConfigList: CustomDomainConfig[], domainName: string): void {
  const filteredCustomDomainConfig: CustomDomainConfig[] = customDomainConfigList.filter((c) => c.domainName === domainName);
  if (filteredCustomDomainConfig.length > 1) {
    throw new Error(`Duplicate custom domain: ${domainName} in your s.yml/yaml with service/function: ${serviceName}/${functionName}.`);
  }
  const customDomainConfig: CustomDomainConfig = filteredCustomDomainConfig[0];
  const serviceNamesInRoute: string[] = customDomainConfig.routeConfigs.map((r) => r.serviceName || serviceName);
  const functionNamesInRoute: string[] = customDomainConfig.routeConfigs.map((r) => r.functionName || functionName);
  if (!_.includes(serviceNamesInRoute, serviceName) || !_.includes(functionNamesInRoute, functionName)) {
    throw new Error(`can't find ${serviceName}/${functionName} in routeConfigs under domain: ${domainName}.`);
  }
}

export function includeHttpTrigger(triggerConfigList: TriggerConfig[]): boolean {
  for (const triggerConfig of triggerConfigList) {
    if (triggerConfig.type === 'http') { return true; }
  }
  return false;
}
