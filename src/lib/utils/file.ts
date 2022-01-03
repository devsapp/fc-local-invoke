import * as readline from 'readline';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import { DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX } from '../devs';
import * as path from 'path';
import logger from '../../common/logger';
import { getStdin } from './stdin';
import * as fcCore from '@serverless-devs/fc-core';

export function readLines(fileName): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];

    readline.createInterface({input: fs.createReadStream(fileName)})
      .on('line', line => lines.push(line))
      .on('close', () => resolve(lines))
      .on('error', reject);
  });
}

export async function ensureFilesModified(devsPath) {
  const modifiedTimes = await getModifiedTimestamps(devsPath);

  if (!_.isEmpty(modifiedTimes)) {
    throw new Error(`
        ${Object.keys(modifiedTimes).join('\n\t')}\n` +
`
Fc detected the above path have been modified. Please execute ‘s build’ to compile your functions.`);
  }
}

async function getModifiedTimestamps(tplPath) {
  if (tplPath.indexOf(DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX) === -1) { return {}; }

  const metaPath = path.resolve(path.dirname(tplPath), 'meta.json');

  if (!await fs.pathExists(metaPath)) { return {}; }

  const metaObj = await readJsonFromFile(metaPath);

  if (_.isEmpty(metaObj)) { return {}; }

  return _.pickBy((metaObj.modifiedTimestamps || {}), (mtime, filePath) => {
    const lstat = fs.lstatSync(filePath);
    return mtime !== lstat.mtime.getTime().toString();
  });
}

async function readJsonFromFile(absFilePath) {
  let obj;

  const str = await fs.readFile(absFilePath, 'utf8');
  try {

    obj = JSON.parse(str);
  } catch (err) {
    throw new Error(`Unable to parse json file: ${absFilePath}.\nError: ${err}`);
  }
  return obj;
}

function isEventString(argsData: any): boolean {
  return argsData.event && !fs.pathExistsSync(argsData.event);
}

export async function eventPriority(argsData: any): Promise<string> {
  if (isEventString(argsData)) { return _.toString(argsData.event); }

  let eventFile;

  if (argsData['event-stdin']) {
    eventFile = '-';
  } else if (argsData['event-file']) {
    eventFile = path.resolve(process.cwd(), argsData['event-file']);
  } else if (argsData.event && fs.pathExistsSync(argsData.event)) {
    logger.warning(fcCore.formatterOutput.warn('-e ${eventFile}', 'using -e to specify the event file path will be replaced by -f in the future.'));
    eventFile = path.resolve(process.cwd(), argsData.event);
  }

  return await getEvent(eventFile);
}


/**
 * Get event content from a file. It reads event from stdin if the file is "-".
 *
 * @param file the file from which to read the event content, or "-" to read from stdin.
 * @returns {Promise<String>}
 */
async function getEvent(eventFile): Promise<string> {
  let event = await getStdin(); // read from pipes

  if (event && eventFile) {
    throw new Error('-e or stdin only one can be provided');
  }

  if (!eventFile) { return event; }

  return await new Promise((resolve, reject) => {

    let input;

    if (eventFile === '-') { // read from stdin
      logger.info(`Reading event data from stdin, which can be ended with Enter then Ctrl+D
  (you can also pass it from file with -e)`);
      input = process.stdin;
    } else {
      input = fs.createReadStream(eventFile, {
        encoding: 'utf-8'
      });
    }
    const rl = readline.createInterface({
      input,
      output: process.stdout
    });

    event = '';
    rl.on('line', (line) => {
      event += line;
    });
    rl.on('close', () => {
      console.log();
      resolve(event);
    });

    rl.on('SIGINT', function () {

      reject(new Error('^C'));
    });
  });
}