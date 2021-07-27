import Invoke from './invoke';
import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import { TriggerConfig } from '../interface/fc-trigger';
import { ICredentials } from "../../common/entity";
export default class ApiInvoke extends Invoke {
    private envs;
    private cmd;
    constructor(creds: ICredentials, region: string, baseDir: string, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, triggerConfig?: TriggerConfig, debugPort?: number, debugIde?: any, tmpDir?: string, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string);
    init(): Promise<void>;
    doInvoke(req: any, res: any): Promise<void>;
    responseOfCustomContainer(res: any, resp: any): void;
    response(outputStream: any, errorStream: any, res: any): void;
}
