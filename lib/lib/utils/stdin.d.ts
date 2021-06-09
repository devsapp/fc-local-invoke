/// <reference types="node" />
export declare function getStdin(): Promise<string>;
export declare namespace getStdin {
    var buffer: () => Promise<Buffer>;
}
