import { FunctionConfig } from './interface/fc-function';
export declare const DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX: string;
export declare const DEFAULT_NAS_PATH_SUFFIX: string;
export declare function getRootBaseDir(baseDir: string): string;
export declare function detectNasBaseDir(devsPath: string): string;
export declare function detectTmpDir(devsPath: string, tmpDir?: string): string;
export declare function updateCodeUriWithBuildPath(baseDir: string, functionConfig: FunctionConfig, serviceName: string): Promise<FunctionConfig>;
/**
 * 检测 build 是否可用
 * @param serviceName 服务名称
 * @param functionName 函数名称
 */
export declare function checkBuildAvailable(baseDir: any, serviceName: string, functionName: string): Promise<void>;
export declare function isInterpretedLanguage(runtime: string): boolean;
