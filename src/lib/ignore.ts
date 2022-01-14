import * as fs from 'fs-extra';
import parser from 'git-ignore-parser';
import ignore from 'ignore';
import * as path from 'path';
import logger from '../common/logger';

const ignoredFile: string[] = ['.git', '.svn', '.env', '.DS_Store', 'template.packaged.yml', '.nas.yml', '.s/nas', '.s/tmp', '.s/package', 's.yml', 's.yaml'];

export async function isIgnored(baseDir: string, runtime: string, actualCodeUri: string, ignoreRelativePath?: string): Promise<Function> {
  const ignoreFilePath = path.join(baseDir, '.fcignore');

  const fileContent: string = await getIgnoreContent(ignoreFilePath);
  const fileContentList: string[] = fileContent.split('\n');
  // 对于 build 后的构建物，会将 codeUri 中包含的子目录消除
  // 例如 codeUri: ./code，则 build 后，生成的 codeUri 为 ./.s/build/artifacts/${serviceName}/${functionName}
  // 因此需要将 .fcjgnore 中的路径对原始 codeUri 求相对路径后作为新的 ignore 内容
  if (ignoreRelativePath) {
    for (let i = 0; i < fileContentList.length; i++) {
      fileContentList[i] = path.relative(ignoreRelativePath, fileContentList[i]);
    }
  }
  const ignoreDependencies = selectIgnored(runtime);
  // const ignoreList = await generateIgnoreFileFromNasYml(baseDir);

  const ignoredPaths = parser(`${[...ignoredFile, ...ignoreDependencies, ...fileContentList].join('\n')}`);
  logger.debug(`ignoredPaths is: ${ignoredPaths}`);
  const ig = ignore().add(ignoredPaths);

  return function (f) {
    const relativePath = path.relative(actualCodeUri, f);
    if (relativePath === '') { return false; }
    return ig.ignores(relativePath);
  };
}

export async function isIgnoredInCodeUri(actualCodeUri: string, runtime: string): Promise<Function> {
  const ignoreFilePath = path.join(actualCodeUri, '.fcignore');

  const fileContent: string = await getIgnoreContent(ignoreFilePath);
  const fileContentList: string[] = fileContent.split('\n');
  const ignoreDependencies = selectIgnored(runtime);
  // const ignoreList = await generateIgnoreFileFromNasYml(baseDir);

  const ignoredPaths = parser(`${[...ignoredFile, ...ignoreDependencies, ...fileContentList].join('\n')}`);
  logger.debug(`ignoredPaths is: ${ignoredPaths}`);
  const ig = ignore().add(ignoredPaths);

  return function (f) {
    const relativePath = path.relative(actualCodeUri, f);
    if (relativePath === '') { return false; }
    return ig.ignores(relativePath);
  };
}


async function getIgnoreContent(ignoreFilePath) {
  let fileContent = '';

  if (fs.existsSync(ignoreFilePath)) {
    fileContent = await fs.readFile(ignoreFilePath, 'utf8');
  }
  return fileContent;
}

function selectIgnored(runtime) {
  switch (runtime) {
  case 'nodejs6':
  case 'nodejs8':
  case 'nodejs10':
  case 'nodejs12':
  case 'nodejs14':

    return ['.s/python'];
  case 'python2.7':
  case 'python3':

    return ['node_modules'];
  case 'php7.2':

    return ['node_modules', '.s/python'];
  default:
    return [];
  }
}
