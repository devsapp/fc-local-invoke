import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import { TriggerConfig } from '../interface/fc-trigger';
import Invoke from './invoke';
import { ICredentials } from "../../common/entity";
export default class HttpInvoke extends Invoke {
    private isAnonymous;
    private endpointPrefix;
    private _invokeInitializer;
    private runner;
    private watcher?;
    private limitedHostConfig?;
    constructor(creds: ICredentials, region: string, baseDir: string, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, triggerConfig?: TriggerConfig, debugPort?: number, debugIde?: any, tmpDir?: string, authType?: string, endpointPrefix?: string, debuggerPath?: any, debugArgs?: any, nasBaseDir?: string);
    _disableRunner(evt: any, name: any): void;
    beforeInvoke(): Promise<void>;
    _startRunner(): Promise<void>;
    initAndStartRunner(): Promise<void>;
    doInvoke(req: any, res: any): Promise<void>;
    afterInvoke(): Promise<void>;
    responseOfCustomContainer(res: any, resp: any): void;
    response(outputStream: any, errorStream: any, res: any): void;
}
