import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs-extra';
import logger from '../common/logger';

// TODO: python runtime .egg-info and .dist-info
const runtimeTypeMapping: any = {
  'nodejs6': ['node_modules', '.s/root'],
  'nodejs8': ['node_modules', '.s/root'],
  'nodejs10': ['node_modules', '.s/root'],
  'nodejs12': ['node_modules', '.s/root'],
  'nodejs14': ['node_modules', '.s/root'],
  'python2.7': ['.s/python', '.s/root'],
  'python3': ['.s/python', '.s/root'],
  'php7.2': ['extension', 'vendor', '.s/root']
};

async function detectLibraryFolders(dirName, libraryFolders, wrap, functionName) {
  if (_.isEmpty(libraryFolders)) { return; }

  for (const libraryFolder of libraryFolders) {
    const libraryPath = path.join(dirName, libraryFolder);
    if (await fs.pathExists(libraryPath)) {
      logger.warning(`${wrap}Fc detected that the library directory '${libraryFolder}' is not included in function '${functionName}' CodeUri.\n\t\tPlease make sure if it is the right configuration. if yes, ignore please.`);
      return;
    }
  }
}

export async function detectLibrary(codeUri, runtime, baseDir, functionName, wrap = '') {
  if (codeUri) {
    const absoluteCodePath = path.resolve(baseDir, codeUri);

    const stats = await fs.lstat(absoluteCodePath);
    if (stats.isFile()) {
      let libraryFolders = runtimeTypeMapping[runtime];

      await detectLibraryFolders(path.dirname(absoluteCodePath), libraryFolders, wrap, functionName);
    }
  }
}
