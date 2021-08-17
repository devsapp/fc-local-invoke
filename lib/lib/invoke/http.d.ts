import { ICredentials } from '../../common/entity';
export declare function normalizeRawHeaders(rawHeaders: any): {};
export declare function normalizeMultiValues(maps: any): {};
export declare function generateHttpParams(req: any, pathPrefix: any): string;
export declare function getHttpRawBody(req: any): Promise<any>;
export declare function validateSignature(req: any, res: any, method: any, creds: ICredentials): Promise<boolean>;
export declare function parseHttpTriggerHeaders(base64Headers: any): any;
export declare function filterFunctionResponseAndExecutionInfo(response: any): [any[], string];
export declare function parseResponse(responseString: any): any;
export declare function parseOutputStream(outputStream: any): any;
export declare function validateHeader(headerKey: any, headerValue: any): boolean;
export declare function getFcReqHeaders(headers: any, reqeustId: any, envs: any): {};
export declare function requestUntilServerUp(opts: any, timeout: any): Promise<any>;
export declare function generateInitRequestOpts(req: any, port: any, fcHeaders: any): {
    method: string;
    headers: any;
    uri: string;
    resolveWithFullResponse: boolean;
    qs: any;
    encoding: any;
};
export declare function generateInvokeRequestOpts(port: any, fcReqHeaders: any, event: any): any;
export declare function generateRequestOpts(req: any, port: any, fcReqHeaders: any, event: any): any;
