import { TriggerConfig } from '../interface/fc-trigger';
import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import { ICredentials } from "../../common/entity";
export declare function registerHttpTriggerByRoutes(creds: ICredentials, region: string, devsPath: string, baseDir: string, app: any, router: any, serverPort: number, httpTrigger: TriggerConfig, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, routePaths?: string[], domainName?: string, debugPort?: number, debugIde?: any, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string, eager?: boolean): Promise<void>;
export declare function registerSingleHttpTrigger(creds: ICredentials, region: string, devsPath: string, baseDir: string, app: any, router: any, serverPort: number, httpTrigger: TriggerConfig, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, routePath?: string, domainName?: string, debugPort?: number, debugIde?: string, eager?: boolean, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string): Promise<void>;
export declare function registerSigintForExpress(server: any): void;
export declare function registerApis(creds: ICredentials, region: string, devsPath: string, baseDir: string, app: any, serverPort: number, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, debugPort?: number, debugIde?: any, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string): Promise<void>;
