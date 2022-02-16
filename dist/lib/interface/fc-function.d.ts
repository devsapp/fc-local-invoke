export interface FunctionConfig {
    name: string;
    description?: string;
    caPort?: number;
    customContainerConfig?: CustomContainerConfig;
    customRuntimeConfig?: CustomRuntimeConfig;
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
    originalCodeUri?: string;
}
export interface CustomRuntimeConfig {
    command: string[];
    args?: string[];
}
export interface CustomContainerConfig {
    image: string;
    command?: string;
    args?: string;
}
