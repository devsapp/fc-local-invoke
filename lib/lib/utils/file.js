"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
            logger_1.default.warning(`Warning: Using -e to specify the event file path will be replaced by -f in the future.`);
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
        let event = yield stdin_1.getStdin(); // read from pipes
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvdXRpbHMvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbURBQXFDO0FBQ3JDLDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsa0NBQThEO0FBQzlELDJDQUE2QjtBQUM3QixpRUFBeUM7QUFDekMsbUNBQW1DO0FBRW5DLFNBQWdCLFNBQVMsQ0FBQyxRQUFRO0lBQ2hDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFDO1FBRTNCLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFDLENBQUM7YUFDN0QsRUFBRSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDcEMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDakMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFURCw4QkFTQztBQUVELFNBQXNCLG1CQUFtQixDQUFDLFFBQVE7O1FBQ2hELE1BQU0sYUFBYSxHQUFHLE1BQU0scUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFNUQsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQztVQUNWLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJO2dCQUNyRDttR0FD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