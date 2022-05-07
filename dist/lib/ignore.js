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
exports.isIgnoredInCodeUri = exports.isIgnored = void 0;
const fs = __importStar(require("fs-extra"));
const git_ignore_parser_1 = __importDefault(require("git-ignore-parser"));
const ignore_1 = __importDefault(require("ignore"));
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("../common/logger"));
const ignoredFile = ['.git', '.svn', '.env', '.DS_Store', 'template.packaged.yml', '.nas.yml', '.s/nas', '.s/tmp', '.s/package', 's.yml', 's.yaml'];
function isIgnored(baseDir, runtime, actualCodeUri, ignoreRelativePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const ignoreFilePath = path.join(baseDir, '.fcignore');
        const fileContent = yield getIgnoreContent(ignoreFilePath);
        const fileContentList = fileContent.split('\n');
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
        const ignoredPaths = (0, git_ignore_parser_1.default)(`${[...ignoredFile, ...ignoreDependencies, ...fileContentList].join('\n')}`);
        logger_1.default.debug(`ignoredPaths is: ${ignoredPaths}`);
        const ig = (0, ignore_1.default)().add(ignoredPaths);
        return function (f) {
            const relativePath = path.relative(actualCodeUri, f);
            if (relativePath === '') {
                return false;
            }
            return ig.ignores(relativePath);
        };
    });
}
exports.isIgnored = isIgnored;
function isIgnoredInCodeUri(actualCodeUri, runtime) {
    return __awaiter(this, void 0, void 0, function* () {
        const ignoreFilePath = path.join(actualCodeUri, '.fcignore');
        const fileContent = yield getIgnoreContent(ignoreFilePath);
        const fileContentList = fileContent.split('\n');
        const ignoreDependencies = selectIgnored(runtime);
        // const ignoreList = await generateIgnoreFileFromNasYml(baseDir);
        const ignoredPaths = (0, git_ignore_parser_1.default)(`${[...ignoredFile, ...ignoreDependencies, ...fileContentList].join('\n')}`);
        logger_1.default.debug(`ignoredPaths is: ${ignoredPaths}`);
        const ig = (0, ignore_1.default)().add(ignoredPaths);
        return function (f) {
            const relativePath = path.relative(actualCodeUri, f);
            if (relativePath === '') {
                return false;
            }
            return ig.ignores(relativePath);
        };
    });
}
exports.isIgnoredInCodeUri = isIgnoredInCodeUri;
function getIgnoreContent(ignoreFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        let fileContent = '';
        if (fs.existsSync(ignoreFilePath)) {
            fileContent = yield fs.readFile(ignoreFilePath, 'utf8');
        }
        return fileContent;
    });
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
        case 'python3.9':
            return ['node_modules'];
        case 'php7.2':
            return ['node_modules', '.s/python'];
        default:
            return [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9pZ25vcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2Q0FBK0I7QUFDL0IsMEVBQXVDO0FBQ3ZDLG9EQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsOERBQXNDO0FBRXRDLE1BQU0sV0FBVyxHQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLHVCQUF1QixFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFFOUosU0FBc0IsU0FBUyxDQUFDLE9BQWUsRUFBRSxPQUFlLEVBQUUsYUFBcUIsRUFBRSxrQkFBMkI7O1FBQ2xILE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRXZELE1BQU0sV0FBVyxHQUFXLE1BQU0sZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkUsTUFBTSxlQUFlLEdBQWEsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRCxzQ0FBc0M7UUFDdEMsaUdBQWlHO1FBQ2pHLHVEQUF1RDtRQUN2RCxJQUFJLGtCQUFrQixFQUFFO1lBQ3RCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUMvQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUM1RTtTQUNGO1FBQ0QsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEQsa0VBQWtFO1FB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