import * as path from 'path';
import * as fs from 'fs-extra';
import * as core from '@serverless-devs/core';
import logger from '../common/logger';
import { FunctionConfig } from './interface/fc-function';
import _ from 'lodash';
import { isCustomContainerRuntime } from './common/model/runtime';
import StdoutFormatter from './component/stdout-formatter';

export const DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX: string = path.join('.s', 'build', 'artifacts');
export const DEFAULT_NAS_PATH_SUFFIX: string = path.join('.s', 'nas');
const DEFAULT_LOCAL_TMP_PATH_SUFFIX: string = path.join('.s', 'tmp', 'local');



export function getRootBaseDir(baseDir: string): string {
  const idx = baseDir.indexOf(DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
  if (idx !== -1) { // exist
    return baseDir.substring(0, idx);
  }
  return baseDir;
}

export function detectNasBaseDir(devsPath: string): string {
  const baseDir = getBaseDir(devsPath);

  return path.join(baseDir, DEFAULT_NAS_PATH_SUFFIX);
}

function getBaseDir(devsPath: string): string {
  const idx = devsPath.indexOf(DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);

  if (idx !== -1) {
    const baseDir = devsPath.substring(0, idx);
    if (!baseDir) {
      return process.cwd();
    }
    return baseDir;
  }
  return path.resolve(path.dirname(devsPath));
}

export function detectTmpDir(devsPath: string, tmpDir?: string) {
  if (tmpDir) { return tmpDir; }

  const baseDir = getBaseDir(devsPath);
  return path.join(baseDir, DEFAULT_LOCAL_TMP_PATH_SUFFIX);
}

export async function updateCodeUriWithBuildPath(baseDir: string, functionConfig: FunctionConfig, serviceName: string): Promise<FunctionConfig> {
  const buildBasePath: string = path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
  if (!fs.pathExistsSync(buildBasePath) || fs.lstatSync(buildBasePath).isFile() || isCustomContainerRuntime(functionConfig.runtime)) {
    functionConfig.originalCodeUri = functionConfig.codeUri;
    return functionConfig;
  }

  const functionName = functionConfig.name;
  const buildCodeUri = path.join(buildBasePath, serviceName, functionName);

  await checkBuildAvailable(baseDir, serviceName, functionName);
  if (isInterpretedLanguage(functionConfig.runtime)) {
    const fcBuildLink = await core.loadComponent('devsapp/fc-build-link');
    await fcBuildLink.linkWithProps({
      serviceName,
      functionName,
      configDirPath: baseDir,
      codeUri: functionConfig.codeUri,
    });
  }

  const resolvedFunctionConfig: FunctionConfig = _.cloneDeep(functionConfig);
  resolvedFunctionConfig.originalCodeUri = functionConfig.codeUri;
  resolvedFunctionConfig.codeUri = buildCodeUri;
  logger.info(StdoutFormatter.stdoutFormatter.using('build codeUri', resolvedFunctionConfig.codeUri));
  return resolvedFunctionConfig;
}

/**
 * 检测 build 是否可用
 * @param serviceName 服务名称
 * @param functionName 函数名称
 */
 export async function checkBuildAvailable(baseDir, serviceName: string, functionName: string) {
  const statusId = `${serviceName}-${functionName}-build`;
  const statusPath = path.join(baseDir, '.s', 'fc-build');
  const { status } = await core.getState(statusId, statusPath) || {};
  if (status === 'unavailable') {
    throw new Error(`${serviceName}/${functionName} build status is unavailable.Please re-execute 's build'`);
  }
}

export function isInterpretedLanguage(runtime: string) {
  return runtime.startsWith('node') || runtime.startsWith('python') || runtime.startsWith('php');
}
