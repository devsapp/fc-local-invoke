import { NasConfig } from './interface/fc-service';
export declare function addInstallTargetEnv(envVars: any, targets: any): any;
export declare function resolveLibPathsFromLdConf(baseDir: string, codeUri: string): Promise<any>;
export declare function addEnv(envVars: any, nasConfig?: NasConfig): any;
