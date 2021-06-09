export interface FunctionConfig {
    name: string;
    description?: string;
    caPort?: number;
    customContainerConfig?: CustomContainerConfig;
    handler: string;
    memorySize?: number;
    runtime: string;
    timeout?: number;
    environmentVariables?: {
        [key: string]: any;
    };
    initializationTimeout?: number;
    initializer?: string;
    instanceConcurrency?: number;
    instanceType?: string;
    codeUri?: string;
}
export interface CustomContainerConfig {
    image: string;
    command?: string;
    args?: string;
}
