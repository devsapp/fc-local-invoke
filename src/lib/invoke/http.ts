'use strict';

import { getProfile } from '../profile';
import { ICredentials } from '../../common/entity'
import { sleep } from '../time';
import logger from '../../common/logger';
const getRawBody = require('raw-body');
const FC = require('@alicloud/fc2');

const { parseHeaders, parseStatusLine } = require('http-string-parser');
const rp = require('request-promise');
// rp.debug = true;


// https://stackoverflow.com/questions/14313183/javascript-regex-how-do-i-check-if-the-string-is-ascii-only
/* eslint-disable */
const headerFieldRe = new RegExp('^[\x00-\x7F]+$');
/* eslint-enable */

export function normalizeRawHeaders(rawHeaders) {
  const normalizedHeaders = {};

  if (rawHeaders && Array.isArray(rawHeaders)) {

    for (let i = 0; i < rawHeaders.length; i += 2) {
      const key = rawHeaders[i];
      const value = rawHeaders[i + 1];

      const values = normalizedHeaders[key];
      if (values) {
        values.push(value);
      } else {
        normalizedHeaders[key] = [value];
      }
    }
  }

  return normalizedHeaders;
}

// { key1: value1, key2: [value2, value3] } to { key1: [value1], key2: [value2, value3] }
export function normalizeMultiValues(maps) {

  if (maps) {
    return Object.entries(maps)
      .reduce((acc, [key, val]) =>
        Object.assign(acc, { [key]: Array.isArray(val) ? val : [val] }), 
      {});
  }

  return {};
}

export function generateHttpParams(req, pathPrefix) {
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

export async function getHttpRawBody(req) {
  // will return buffer when encoding not specified for raw-body
  const headers: any = req?.headers || {};
  const event = await getRawBody(req, {
    length: headers['content-length']
  });

  return event;
}

export async function validateSignature(req, res, method) {
  const profile: ICredentials = await getProfile();
  const signature = FC.getSignature(profile.AccessKeyID, profile.AccessKeySecret, method, req.path, req.headers, req.queries);
  const clientSignature = req.headers['authorization'];

  if (signature !== clientSignature) {
    res.status(500);
    res.send(JSON.stringify({message: `Signature doesn't match, request signature is ${clientSignature}, but server signature is ${signature}`}));
    return false;
  }

  return true;
}

export function parseHttpTriggerHeaders(base64Headers): any {
  let headers: any = {};

  if (base64Headers) {
    const rawHeaders = Buffer.from(base64Headers, 'base64').toString();
    headers = JSON.parse(rawHeaders);
  }

  return headers;
}

export function filterFunctionResponseAndExecutionInfo(response): [any[], string] {
  let responseBegin = false;
  let executionInfoBegin = false;

  const httpResponse = [];
  let executionInfo = '';

  logger.debug('response is');
  for (let line of response) {
    logger.debug(line);
    if (line.startsWith('--------------------response begin-----------------')) {
      responseBegin = true;
      continue;
    } else if (line.startsWith('--------------------response end-----------------')) {
      responseBegin = false;
      continue;
    } else if (line.startsWith('--------------------execution info begin-----------------')) {
      executionInfoBegin = true;
      continue;
    } else if (line.startsWith('--------------------execution info end-----------------')) {
      executionInfoBegin = false;
      continue;
    }

    if (responseBegin) {
      httpResponse.push(line);
    } else if (executionInfoBegin) {
      executionInfo = line;
    } else {
      console.log(line);
    }
  }

  return [httpResponse, executionInfo];
}

// copied from http-string-parser library
// only change: 
// use \r\n instead of \r?\n in responseString.split
// see https://stackoverflow.com/a/27966412/6602338
// see http.test.js "test image response"
export function parseResponse(responseString) {
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

export function parseOutputStream(outputStream) {
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

  const executionInfo: any = {};

  if (executionInfo) {
    const rawExecutionInfo = Buffer.from(executionRawInfo, 'base64').toString();
    const infos = rawExecutionInfo.split('\n');

    executionInfo.requestId = infos[0];
    executionInfo.billedTime = infos[1];
    executionInfo.memoryLimit = infos[2];
    executionInfo.memoryUsage = infos[3];

    logger.debug(`exectionInfo: ${JSON.stringify(executionInfo, null, '  ')}`);
  }

  return Object.assign({
    statusCode: parsedResponse.statusCode,
    headers: parsedResponse.headers,
    body
  }, executionInfo);
}

export function validateHeader(headerKey, headerValue) {

  if (!headerKey.trim() || !headerFieldRe.test(headerKey)) {
    return false;
  }

  if (typeof headerValue === 'string') {
    return headerFieldRe.test(headerValue);
  } else if (Array.isArray(headerValue)) {
    for (let value of headerValue) {
      if (!headerFieldRe.test(value)) { return false; }
    }
  } else { return false; }

  return true;
}

export function getFcReqHeaders(headers, reqeustId, envs) {
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

export async function requestUntilServerUp(opts, timeout): Promise<any> {
  var serverEstablished = false;
  // 重试请求间的间隔时间，单位 ms
  const intervalPerReq = 500;
  var retryTimes = (timeout * 1000) / intervalPerReq;
  var resp = {};
  while (!serverEstablished) {
    try {
      resp = await rp(opts);
      serverEstablished = true;
    } catch (error) {
      if ((error.message.indexOf('socket hang up') !== -1 || !error.response) && retryTimes >= 0) {
        retryTimes--;
        await sleep(500);
        continue;
      } else {
        if (retryTimes < 0) {
          logger.log(`Retry request to container for ${timeout}s, please make your function timeout longer`, 'red');
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
        } else {
          logger.log(`Fc Error: ${error}`, 'red');
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
}

export function generateInitRequestOpts(req, port, fcHeaders) {
  
  const opts = {
    method: 'POST',
    headers: fcHeaders,
    uri: `http://localhost:${port}/initialize`,
    resolveWithFullResponse: true,
    qs: req.query || {}
  };
  return opts;
}

export function generateInvokeRequestOpts(port, fcReqHeaders, event) {
  const opts: any = {
    method: 'POST',
    headers: fcReqHeaders,
    uri: `http://localhost:${port}/invoke`,
    resolveWithFullResponse: true
  };
  if (event.toString('utf8') !== '') {
    opts.body = event;
  }
  logger.debug(`local invoke request options: ${JSON.stringify(opts, null, '  ')}`);
  return opts;
}

export function generateRequestOpts(req, port, fcReqHeaders, event) {
  const method = req.method;

  const opts: any = {
    method: method,
    headers: fcReqHeaders,
    uri: `http://localhost:${port}${req.originalUrl}`,
    resolveWithFullResponse: true,
    qs: req.query
  };
  if (event.toString('utf8') !== '') {
    opts.body = event;
  }
  logger.debug(`local start request options: ${JSON.stringify(opts, null, '  ')}`);
  return opts;
}