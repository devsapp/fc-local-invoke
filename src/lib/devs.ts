import * as path from 'path';
import * as fs from 'fs-extra';
import logger from '../common/logger';
import { FunctionConfig } from './interface/fc-function';
import _ from 'lodash';
import { isCustomContainerRuntime } from './common/model/runtime';

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

// export async function generateDevsPath(defaultDevsPath: string, devsPathGivenByUser?: string): Promise<string> {
//   let devsPath: string;
//   if (devsPathGivenByUser) {
//     devsPath = devsPathGivenByUser;
//   }
//   if (!devsPath) {
//     devsPath = defaultDevsPath;
//   }
//   if (!devsPath) {
//     throw new Error('Current folder not a serverless project\nThe folder must contains s.[yml|yaml].');
//   }
//   return devsPath;
// }

// async function detectDevsPath(defaultDevsPath: string, preferBuildTpl = true, showTip = true): Promise<string> {

//   let buildTemplate: string[] = [];

//   if (preferBuildTpl) {
//     buildTemplate = ['s.yml', 's.yaml'].map(f => {
//       return path.join(process.cwd(), '.s', 'build', 'artifacts', f);
//     });
//   }
//   let defaultTemplate: string[] = [];
//   if (defaultDevsPath) {
//     defaultTemplate.push(defaultDevsPath);
//   } else {
//     defaultTemplate = ['s.yml', 's.yaml']
//     .map((f) => path.join(process.cwd(), f));
//   }

//   const devsPath: string = await asyncFind([...buildTemplate, ...defaultTemplate], async (path) => {
//     return await fs.pathExists(path);
//   });

//   if (devsPath && showTip && !hasShownTip) {
//     logger.log(`using template: ${path.relative(process.cwd(), devsPath)}`, 'yellow');
//     hasShownTip = false;
//   }

//   return devsPath;
// }

// async function asyncFind(pathArrays, filter) {
//   for (let path of pathArrays) {
//     if (await filter(path)) {
//       return path;
//     }
//   }

//   return null;
// }

export function detectTmpDir(devsPath: string, tmpDir?: string) {
  if (tmpDir) { return tmpDir; }

  const baseDir = getBaseDir(devsPath);
  return path.join(baseDir, DEFAULT_LOCAL_TMP_PATH_SUFFIX);
}

export function updateCodeUriWithBuildPath(baseDir: string, functionConfig: FunctionConfig, serviceName: string): FunctionConfig {
  const buildBasePath: string = path.join(baseDir, DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
  if (!fs.pathExistsSync(buildBasePath) || fs.lstatSync(buildBasePath).isFile() || isCustomContainerRuntime(functionConfig.runtime)) {
    return functionConfig;
  }
  const resolvedFunctionConfig: FunctionConfig = _.cloneDeep(functionConfig);
  resolvedFunctionConfig.codeUri = path.join(buildBasePath, serviceName, functionConfig.name);
  logger.info(`Using build codeUri: ${resolvedFunctionConfig.codeUri}.`)
  return resolvedFunctionConfig;
}