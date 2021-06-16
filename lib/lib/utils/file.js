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
            logger_1.default.warning(stdout_formatter_1.default.stdoutFormatter.warn('-e ${eventFile}', 'using -e to specify the event file path will be replaced by -f in the future.'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvdXRpbHMvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbURBQXFDO0FBQ3JDLDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsa0NBQThEO0FBQzlELDJDQUE2QjtBQUM3QixpRUFBeUM7QUFDekMsbUNBQW1DO0FBQ25DLHFGQUE0RDtBQUU1RCxTQUFnQixTQUFTLENBQUMsUUFBUTtJQUNoQyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztRQUUzQixRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBQyxDQUFDO2FBQzdELEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ2pDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBVEQsOEJBU0M7QUFFRCxTQUFzQixtQkFBbUIsQ0FBQyxRQUFROztRQUNoRCxNQUFNLGFBQWEsR0FBRyxNQUFNLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTVELElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUM7VUFDVixNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFB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