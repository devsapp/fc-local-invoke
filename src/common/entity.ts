import { ServiceConfig } from '../lib/interface/fc-service';
import { FunctionConfig } from '../lib/interface/fc-function';
import { TriggerConfig } from '../lib/interface/fc-trigger';
import { CustomDomainConfig } from '../lib/interface/fc-custom-domain';

export interface ICredentials {
    AccountID?: string,
    AccessKeyID?: string,
    AccessKeySecret?: string,
    SecurityToken?: string,
}

export interface InputProps {
  props: IProperties, // 用户自定义输入
  credentials: ICredentials, // 用户秘钥
  appName: string, // 
  project: {
    component: string, // 组件名（支持本地绝对路径）
    access: string, // 访问秘钥名
    projectName: string, // 项目名
  },
  command: string, // 执行指令
  args: string, // 命令行 扩展参数
  path: {
    configPath: string // 配置路径
  }
}

export interface IProperties {
  region: string;
  service: ServiceConfig;
  function: FunctionConfig;
  triggers: TriggerConfig[];
  customDomains: CustomDomainConfig[];
}