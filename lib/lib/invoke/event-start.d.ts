import Invoke from './invoke';
import { ServiceConfig } from '../interface/fc-service';
import { FunctionConfig } from '../interface/fc-function';
import { TriggerConfig } from '../interface/fc-trigger';
export default class EventStart extends Invoke {
    private envs;
    private opts;
    constructor(region: string, baseDir: string, serviceConfig: ServiceConfig, functionConfig: FunctionConfig, triggerConfig?: TriggerConfig, debugPort?: number, debugIde?: any, tmpDir?: string, debuggerPath?: string, debugArgs?: any, nasBaseDir?: string);
    init(): Promise<void>;
}
