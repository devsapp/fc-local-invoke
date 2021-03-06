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
  if (idx !== -1) {
    // exist
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
  if (tmpDir) {
    return tmpDir;
  }

  const baseDir = getBaseDir(devsPath);
  return path.join(baseDir, DEFAULT_LOCAL_TMP_PATH_SUFFIX);
}

export async function updateCodeUriWithBuildPath(baseDir: string, functionConfig: FunctionConfig, serviceName: string): Promise<FunctionConfig> {
  const buildBasePath: string = path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
  if (!fs.pathExistsSync(buildBasePath) || fs.lstatSync(buildBasePath).isFile() || isCustomContainerRuntime(functionConfig.runtime)) {
    functionConfig.originalCodeUri = functionConfig.codeUri;
    if (functionConfig.codeUri) {
      functionConfig.codeUri = path.join(baseDir, functionConfig.codeUri);
    }
    return functionConfig;
  }

  const functionName = functionConfig.name;
  const buildCodeUri = path.join(buildBasePath, serviceName, functionName);

  const fcCore = await core.loadComponent('devsapp/fc-core');
  await fcCore.buildLink({
    serviceName,
    functionName,
    runtime: functionConfig.runtime,
    configDirPath: baseDir,
    codeUri: functionConfig.codeUri,
  });

  const resolvedFunctionConfig: FunctionConfig = _.cloneDeep(functionConfig);
  resolvedFunctionConfig.originalCodeUri = functionConfig.codeUri;
  resolvedFunctionConfig.codeUri = buildCodeUri;
  logger.info(StdoutFormatter.stdoutFormatter.using('build codeUri', resolvedFunctionConfig.codeUri));
  return resolvedFunctionConfig;
}
