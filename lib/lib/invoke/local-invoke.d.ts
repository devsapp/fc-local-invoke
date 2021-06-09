import Invoke from './invoke';
import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import { TriggerConfig } from '../interface/fc-trigger';
export default class LocalInvoke extends Invoke {
    private reuse;
    private envs;
    private cmd;
    private opts;
    constructor(region: string, baseDir: string, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, triggerConfig?: TriggerConfig, debugPort?: number, debugIde?: any, tmpDir?: string, debuggerPath?: any, debugArgs?: any, reuse?: boolean, nasBaseDir?: string);
    init(): Promise<void>;
    doInvoke(event: any, { outputStream, errorStream }?: {
        outputStream?: any;
        errorStream?: any;
    }): Promise<void>;
}
