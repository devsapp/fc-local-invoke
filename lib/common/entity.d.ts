import { ServiceConfig } from '../lib/interface/fc-service';
import { FunctionConfig } from '../lib/interface/fc-function';
import { TriggerConfig } from '../lib/interface/fc-trigger';
import { CustomDomainConfig } from '../lib/interface/fc-custom-domain';
export interface ICredentials {
    AccountID?: string;
    AccessKeyID?: string;
    AccessKeySecret?: string;
    SecurityToken?: string;
}
export interface InputProps {
    props: IProperties;
    credentials: ICredentials;
    appName: string;
    project: {
        component: string;
        access: string;
        projectName: string;
    };
    command: string;
    args: string;
    path: {
        configPath: string;
    };
}
export interface IProperties {
    region: string;
    service: ServiceConfig;
    function: FunctionConfig;
    triggers: TriggerConfig[];
    customDomains: CustomDomainConfig[];
}
