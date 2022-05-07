"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.eventPriority = exports.ensureFilesModified = exports.readLines = void 0;
const readline = __importStar(require("readline"));
const fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const devs_1 = require("../devs");
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("../../common/logger"));
const stdin_1 = require("./stdin");
const stdout_formatter_1 = __importDefault(require("../component/stdout-formatter"));
function readLines(fileName) {
    return new Promise((resolve, reject) => {
        const lines = [];
        readline.createInterface({ input: fs.createReadStream(fileName) })
            .on('line', line => lines.push(line))
            .on('close', () => resolve(lines))
            .on('error', reject);
    });
}
exports.readLines = readLines;
function ensureFilesModified(devsPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const modifiedTimes = yield getModifiedTimestamps(devsPath);
        if (!_.isEmpty(modifiedTimes)) {
            throw new Error(`
        ${Object.keys(modifiedTimes).join('\n\t')}\n` +
                `
Fc detected the above path have been modified. Please execute ‘s build’ to compile your functions.`);
        }
    });
}
exports.ensureFilesModified = ensureFilesModified;
function getModifiedTimestamps(tplPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (tplPath.indexOf(devs_1.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX) === -1) {
            return {};
        }
        const metaPath = path.resolve(path.dirname(tplPath), 'meta.json');
        if (!(yield fs.pathExists(metaPath))) {
            return {};
        }
        const metaObj = yield readJsonFromFile(metaPath);
        if (_.isEmpty(metaObj)) {
            return {};
        }
        return _.pickBy((metaObj.modifiedTimestamps || {}), (mtime, filePath) => {
            const lstat = fs.lstatSync(filePath);
            return mtime !== lstat.mtime.getTime().toString();
        });
    });
}
function readJsonFromFile(absFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        let obj;
        const str = yield fs.readFile(absFilePath, 'utf8');
        try {
            obj = JSON.parse(str);
        }
        catch (err) {
            throw new Error(`Unable to parse json file: ${absFilePath}.\nError: ${err}`);
        }
        return obj;
    });
}
function isEventString(argsData) {
    return argsData.event && !fs.pathExistsSync(argsData.event);
}
function eventPriority(argsData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (isEventString(argsData)) {
            return _.toString(argsData.event);
        }
        let eventFile;
        if (argsData['event-stdin']) {
            eventFile = '-';
        }
        else if (argsData['event-file']) {
            eventFile = path.resolve(process.cwd(), argsData['event-file']);
        }
        else if (argsData.event && fs.pathExistsSync(argsData.event)) {
            logger_1.default.warn(stdout_formatter_1.default.stdoutFormatter.warn('-e ${eventFile}', 'using -e to specify the event file path will be replaced by -f in the future.'));
            eventFile = path.resolve(process.cwd(), argsData.event);
        }
        return yield getEvent(eventFile);
    });
}
exports.eventPriority = eventPriority;
/**
 * Get event content from a file. It reads event from stdin if the file is "-".
 *
 * @param file the file from which to read the event content, or "-" to read from stdin.
 * @returns {Promise<String>}
 */
function getEvent(eventFile) {
    return __awaiter(this, void 0, void 0, function* () {
        let event = yield (0, stdin_1.getStdin)(); // read from pipes
        if (event && eventFile) {
            throw new Error('-e or stdin only one can be provided');
        }
        if (!eventFile) {
            return event;
        }
        return yield new Promise((resolve, reject) => {
            let input;
            if (eventFile === '-') { // read from stdin
                logger_1.default.info(`Reading event data from stdin, which can be ended with Enter then Ctrl+D
  (you can also pass it from file with -e)`);
                input = process.stdin;
            }
            else {
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
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvdXRpbHMvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQUFxQztBQUNyQyw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLGtDQUE4RDtBQUM5RCwyQ0FBNkI7QUFDN0IsaUVBQXlDO0FBQ3pDLG1DQUFtQztBQUNuQyxxRkFBNEQ7QUFFNUQsU0FBZ0IsU0FBUyxDQUFDLFFBQVE7SUFDaEMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7UUFFM0IsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUMsQ0FBQzthQUM3RCxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNwQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNqQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3pCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVRELDhCQVNDO0FBRUQsU0FBc0IsbUJBQW1CLENBQUMsUUFBUTs7UUFDaEQsTUFBTSxhQUFhLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU1RCxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUM3QixNQUFNLElBQUksS0FBSyxDQUFDO1VBQ1YsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFD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