export declare function resolveDockerUser({ nasConfig, stage }: {
    nasConfig: any;
    stage?: string;
}): string;
export declare function transformMountsForToolbox(mounts: any): any;
export declare function generateLocalInvokeOpts(runtime: any, containerName: any, mounts: any, cmd: any, debugPort: any, envs: any, limitedHostConfig: any, dockerUser: any, debugIde: any): Promise<any>;
export declare function generateContainerNameFilter(containerName: string, inited?: boolean): string;
export declare function generateContainerName(serviceName: string, functionName: string, debugPort?: number): string;
export declare function generateLocalStartOpts(runtime: any, name: any, mounts: any, cmd: any, envs: any, limitedHostConfig: any, { debugPort, dockerUser, debugIde, imageName, caPort }: {
    debugPort: any;
    dockerUser: any;
    debugIde?: any;
    imageName: any;
    caPort?: number;
}): Promise<any>;
export declare function encryptDockerOpts(dockerOpts: any): any;
export declare function resolveMockScript(runtime: string): string;
export declare function resolveDockerEnv(envs?: {}, isCustomContainer?: boolean): string[];
export declare function resolveRuntimeToDockerImage(runtime: string): Promise<any>;
