'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRequestOpts = exports.generateInvokeRequestOpts = exports.generateInitRequestOpts = exports.requestUntilServerUp = exports.getFcReqHeaders = exports.validateHeader = exports.parseOutputStream = exports.parseResponse = exports.filterFunctionResponseAndExecutionInfo = exports.parseHttpTriggerHeaders = exports.validateSignature = exports.getHttpRawBody = exports.generateHttpParams = exports.normalizeMultiValues = exports.normalizeRawHeaders = void 0;
const time_1 = require("../time");
const logger_1 = __importDefault(require("../../common/logger"));
const getRawBody = require('raw-body');
const FC = require('@alicloud/fc2');
const { parseHeaders, parseStatusLine } = require('http-string-parser');
const rp = require('request-promise');
// rp.debug = true;
// https://stackoverflow.com/questions/14313183/javascript-regex-how-do-i-check-if-the-string-is-ascii-only
/* eslint-disable */
const headerFieldRe = new RegExp('^[\x00-\x7F]+$');
/* eslint-enable */
function normalizeRawHeaders(rawHeaders) {
    const normalizedHeaders = {};
    if (rawHeaders && Array.isArray(rawHeaders)) {
        for (let i = 0; i < rawHeaders.length; i += 2) {
            const key = rawHeaders[i];
            const value = rawHeaders[i + 1];
            const values = normalizedHeaders[key];
            if (values) {
                values.push(value);
            }
            else {
                normalizedHeaders[key] = [value];
            }
        }
    }
    return normalizedHeaders;
}
exports.normalizeRawHeaders = normalizeRawHeaders;
// { key1: value1, key2: [value2, value3] } to { key1: [value1], key2: [value2, value3] }
function normalizeMultiValues(maps) {
    if (maps) {
        return Object.entries(maps)
            .reduce((acc, [key, val]) => Object.assign(acc, { [key]: Array.isArray(val) ? val : [val] }), {});
    }
    return {};
}
exports.normalizeMultiValues = normalizeMultiValues;
function generateHttpParams(req, pathPrefix) {
    const requestURI = req.originalUrl;
    const method = req.method;
    const path = req.path.substring(pathPrefix.length);
    const clientIP = req.ip;
    const host = req.hostname;
    // for nodejs and python and php
    // http://nodejs.cn/api/http.html#http_message_rawheaders
    const headersMap = normalizeRawHeaders(req.rawHeaders);
    const queriesMap = normalizeMultiValues(req.query);
    const params = {
        requestURI,
        method,
        path,
        clientIP,
        queriesMap,
        headersMap,
        host
    };
    const encodedParams = Buffer.from(JSON.stringify(params)).toString('base64');
    return encodedParams;
}
exports.generateHttpParams = generateHttpParams;
function getHttpRawBody(req) {
    return __awaiter(this, void 0, void 0, function* () {
        // will return buffer when encoding not specified for raw-body
        const headers = (req === null || req === void 0 ? void 0 : req.headers) || {};
        const event = yield getRawBody(req, {
            length: headers['content-length']
        });
        return event;
    });
}
exports.getHttpRawBody = getHttpRawBody;
function validateSignature(req, res, method, creds) {
    return __awaiter(this, void 0, void 0, function* () {
        const signature = FC.getSignature(creds === null || creds === void 0 ? void 0 : creds.AccessKeyID, creds === null || creds === void 0 ? void 0 : creds.AccessKeySecret, method, req.path, req.headers, req.queries);
        const clientSignature = req.headers['authorization'];
        if (signature !== clientSignature) {
            res.status(500);
            res.send(JSON.stringify({ message: `Signature doesn't match, request signature is ${clientSignature}, but server signature is ${signature}` }));
            return false;
        }
        return true;
    });
}
exports.validateSignature = validateSignature;
function parseHttpTriggerHeaders(base64Headers) {
    let headers = {};
    if (base64Headers) {
        const rawHeaders = Buffer.from(base64Headers, 'base64').toString();
        headers = JSON.parse(rawHeaders);
    }
    return headers;
}
exports.parseHttpTriggerHeaders = parseHttpTriggerHeaders;
function filterFunctionResponseAndExecutionInfo(response) {
    let responseBegin = false;
    let executionInfoBegin = false;
    const httpResponse = [];
    let executionInfo = '';
    logger_1.default.debug('response is');
    for (let line of response) {
        logger_1.default.debug(line);
        if (line.startsWith('--------------------response begin-----------------')) {
            responseBegin = true;
            continue;
        }
        else if (line.startsWith('--------------------response end-----------------')) {
            responseBegin = false;
            continue;
        }
        else if (line.startsWith('--------------------execution info begin-----------------')) {
            executionInfoBegin = true;
            continue;
        }
        else if (line.startsWith('--------------------execution info end-----------------')) {
            executionInfoBegin = false;
            continue;
        }
        if (responseBegin) {
            httpResponse.push(line);
        }
        else if (executionInfoBegin) {
            executionInfo = line;
        }
        else {
            console.log(line);
        }
    }
    return [httpResponse, executionInfo];
}
exports.filterFunctionResponseAndExecutionInfo = filterFunctionResponseAndExecutionInfo;
// copied from http-string-parser library
// only change:
// use \r\n instead of \r?\n in responseString.split
// see https://stackoverflow.com/a/27966412/6602338
// see http.test.js "test image response"
function parseResponse(responseString) {
    var headerLines, line, lines, parsedStatusLine, response;
    response = {};
    lines = responseString.split(/\r\n/);
    parsedStatusLine = parseStatusLine(lines.shift());
    response['protocolVersion'] = parsedStatusLine['protocol'];
    response['statusCode'] = parsedStatusLine['statusCode'];
    response['statusMessage'] = parsedStatusLine['statusMessage'];
    headerLines = [];
    while (lines.length > 0) {
        line = lines.shift();
        if (line === '') {
            break;
        }
        headerLines.push(line);
    }
    response['headers'] = parseHeaders(headerLines);
    response['body'] = lines.join('\r\n');
    return response;
}
exports.parseResponse = parseResponse;
function parseOutputStream(outputStream) {
    // 这里的 outputStream 包含 mock.sh 原始内容，以及 base64 后的 curl 的 response，因此可以直接按照 utf8 toString
    const response = outputStream.toString().split('\n');
    const [functionResponse, executionRawInfo] = filterFunctionResponseAndExecutionInfo(response);
    const functionBase64Response = functionResponse.join('\n');
    // 这里将 curl 的 response 按照 base64 解码，得到元数据
    // 然后通过使用 binary 将 body 中的二进制数据编码，后面 parser 内部会调用 toString，转换成 binary 后，可以安全地进行 parse 了。
    const rawResponse = Buffer.from(functionBase64Response, 'base64').toString('binary');
    const parsedResponse = parseResponse(rawResponse);
    // 将 binary 的 body 转换回来
    const body = Buffer.from(parsedResponse.body, 'binary');
    // parse requestId
    const executionInfo = {};
    if (executionInfo) {
        const rawExecutionInfo = Buffer.from(executionRawInfo, 'base64').toString();
        const infos = rawExecutionInfo.split('\n');
        executionInfo.requestId = infos[0];
        executionInfo.billedTime = infos[1];
        executionInfo.memoryLimit = infos[2];
        executionInfo.memoryUsage = infos[3];
        logger_1.default.debug(`exectionInfo: ${JSON.stringify(executionInfo, null, '  ')}`);
    }
    return Object.assign({
        statusCode: parsedResponse.statusCode,
        headers: parsedResponse.headers,
        body
    }, executionInfo);
}
exports.parseOutputStream = parseOutputStream;
function validateHeader(headerKey, headerValue) {
    if (!headerKey.trim() || !headerFieldRe.test(headerKey)) {
        return false;
    }
    if (typeof headerValue === 'string') {
        return headerFieldRe.test(headerValue);
    }
    else if (Array.isArray(headerValue)) {
        for (let value of headerValue) {
            if (!headerFieldRe.test(value)) {
                return false;
            }
        }
    }
    else {
        return false;
    }
    return true;
}
exports.validateHeader = validateHeader;
function getFcReqHeaders(headers, reqeustId, envs) {
    const fcHeaders = {};
    // fcHeaders['connection'] = headers['connection'] ? headers['connection'] : 'keep-alive';
    fcHeaders['content-type'] = headers['content-type'] ? headers['content-type'] : 'application/octet-stream';
    fcHeaders['x-fc-request-id'] = headers['x-fc-request-id'] ? headers['x-fc-request-id'] : reqeustId;
    fcHeaders['x-fc-function-name'] = headers['x-fc-function-name'] ? headers['x-fc-function-name'] : envs['FC_FUNCTION_NAME'] || 'fc-docker';
    fcHeaders['x-fc-function-memory'] = headers['x-fc-function-memory'] ? headers['x-fc-function-memory'] : envs['FC_MEMORY_SIZE'];
    fcHeaders['x-fc-function-timeout'] = headers['x-fc-function-timeout'] ? headers['x-fc-function-timeout'] : envs['FC_TIMEOUT'];
    fcHeaders['x-fc-initialization-timeout'] = headers['x-fc-initialization-timeout'] ? headers['x-fc-initialization-timeout'] : envs['FC_INITIALIZATION_TIMEOUT'];
    fcHeaders['x-fc-function-initializer'] = headers['x-fc-function-initializer'] ? headers['x-fc-function-initializer'] : envs['FC_INITIALIZER'];
    fcHeaders['x-fc-function-handler'] = headers['x-fc-function-handler'] ? headers['x-fc-function-handler'] : envs['FC_HANDLER'];
    fcHeaders['x-fc-access-key-id'] = headers['x-fc-access-key-id'] ? headers['x-fc-access-key-id'] : envs['FC_ACCESS_KEY_ID'];
    fcHeaders['x-fc-access-key-secret'] = headers['x-fc-access-key-secret'] ? headers['x-fc-access-key-secret'] : envs['FC_ACCESS_KEY_SECRET'];
    fcHeaders['x-fc-security-token'] = headers['x-fc-security-token'] ? headers['x-fc-security-token'] : envs['FC_SECURITY_TOKEN'];
    fcHeaders['x-fc-region'] = headers['x-fc-region'] ? headers['x-fc-region'] : envs['FC_REGION'];
    fcHeaders['x-fc-account-id'] = headers['x-fc-account-id'] ? headers['x-fc-account-id'] : envs['FC_ACCOUNT_ID'];
    fcHeaders['x-fc-service-name'] = headers['x-fc-service-name'] ? headers['x-fc-service-name'] : envs['FC_SERVICE_NAME'];
    fcHeaders['x-fc-service-logproject'] = headers['x-fc-service-logproject'] ? headers['x-fc-service-logproject'] : envs['FC_SERVICE_LOG_PROJECT'];
    fcHeaders['x-fc-service-logstore'] = headers['x-fc-service-logstore'] ? headers['x-fc-service-logstore'] : envs['FC_SERVICE_LOG_STORE'];
    return fcHeaders;
}
exports.getFcReqHeaders = getFcReqHeaders;
function requestUntilServerUp(opts, timeout) {
    return __awaiter(this, void 0, void 0, function* () {
        var serverEstablished = false;
        // 重试请求间的间隔时间，单位 ms
        const intervalPerReq = 500;
        var retryTimes = (timeout * 1000) / intervalPerReq;
        var resp = {};
        while (!serverEstablished) {
            try {
                resp = yield rp(opts);
                serverEstablished = true;
            }
            catch (error) {
                if ((error.message.indexOf('socket hang up') !== -1 || !error.response) && retryTimes >= 0) {
                    retryTimes--;
                    yield time_1.sleep(500);
                    continue;
                }
                else {
                    if (retryTimes < 0) {
                        logger_1.default.log(`Retry request to container for ${timeout}s, please make your function timeout longer`, 'red');
                    }
                    if (error.response && error.response.statusCode) {
                        resp = {
                            statusCode: error.response.statusCode,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                'errorMessage': error.message
                            }
                        };
                    }
                    else {
                        logger_1.default.log(`Fc Error: ${error}`, 'red');
                        resp = {
                            statusCode: 500,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                'errorMessage': error.message
                            }
                        };
                    }
                    break;
                }
            }
        }
        return resp;
    });
}
exports.requestUntilServerUp = requestUntilServerUp;
function generateInitRequestOpts(req, port, fcHeaders) {
    const opts = {
        method: 'POST',
        headers: fcHeaders,
        uri: `http://localhost:${port}/initialize`,
        resolveWithFullResponse: true,
        qs: req.query || {}
    };
    return opts;
}
exports.generateInitRequestOpts = generateInitRequestOpts;
function generateInvokeRequestOpts(port, fcReqHeaders, event) {
    const opts = {
        method: 'POST',
        headers: fcReqHeaders,
        uri: `http://localhost:${port}/invoke`,
        resolveWithFullResponse: true
    };
    if (event.toString('utf8') !== '') {
        opts.body = event;
    }
    logger_1.default.debug(`local invoke request options: ${JSON.stringify(opts, null, '  ')}`);
    return opts;
}
exports.generateInvokeRequestOpts = generateInvokeRequestOpts;
function generateRequestOpts(req, port, fcReqHeaders, event) {
    const method = req.method;
    const opts = {
        method: method,
        headers: fcReqHeaders,
        uri: `http://localhost:${port}${req.originalUrl}`,
        resolveWithFullResponse: true,
        qs: req.query
    };
    if (event.toString('utf8') !== '') {
        opts.body = event;
    }
    logger_1.default.debug(`local start request options: ${JSON.stringify(opts, null, '  ')}`);
    return opts;
}
exports.generateRequestOpts = generateRequestOpts;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvaW52b2tlL2h0dHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7QUFHYixrQ0FBZ0M7QUFDaEMsaUVBQXlDO0FBQ3pDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN2QyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFcEMsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUN4RSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUN0QyxtQkFBbUI7QUFHbkIsMkdBQTJHO0FBQzNHLG9CQUFvQjtBQUNwQixNQUFNLGFBQWEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ25ELG1CQUFtQjtBQUVuQixTQUFnQixtQkFBbUIsQ0FBQyxVQUFVO0lBQzVDLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxDQUFDO0lBRTdCLElBQUksVUFBVSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFFM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM3QyxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUVoQyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QyxJQUFJLE1BQU0sRUFBRTtnQkFDVixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FB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