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
exports.isIgnored = void 0;
const fs = __importStar(require("fs-extra"));
const git_ignore_parser_1 = __importDefault(require("git-ignore-parser"));
const ignore_1 = __importDefault(require("ignore"));
const path = __importStar(require("path"));
const ignoredFile = ['.git', '.svn', '.env', '.DS_Store', 'template.packaged.yml', '.nas.yml', '.s/nas', '.s/tmp', '.s/package', 's.yml', 's.yaml'];
function isIgnored(baseDir, runtime) {
    return __awaiter(this, void 0, void 0, function* () {
        const ignoreFilePath = `${baseDir}/.fcignore`;
        const fileContent = yield getIgnoreContent(ignoreFilePath);
        const ignoreDependencies = selectIgnored(runtime);
        const ignoredPaths = git_ignore_parser_1.default(`${[...ignoredFile, ...ignoreDependencies].join('\n')}\n${fileContent}`);
        const ig = ignore_1.default().add(ignoredPaths);
        return function (f) {
            const relativePath = path.relative(baseDir, f);
            if (relativePath === '') {
                return false;
            }
            return ig.ignores(relativePath);
        };
    });
}
exports.isIgnored = isIgnored;
;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9pZ25vcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQjtBQUMvQiwwRUFBdUM7QUFDdkMsb0RBQTRCO0FBQzVCLDJDQUE2QjtBQUU3QixNQUFNLFdBQVcsR0FBYSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBRTlKLFNBQXNCLFNBQVMsQ0FBQyxPQUFlLEVBQUUsT0FBZ0I7O1FBRS9ELE1BQU0sY0FBYyxHQUFHLEdBQUcsT0FBTyxZQUFZLENBQUM7UUFFOUMsTUFBTSxXQUFXLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUzRCxNQUFNLGtCQUFrQixHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUdsRCxNQUFNLFlBQVksR0FBRywyQkFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFdBQVcsRUFBRSxHQUFHLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFckcsTUFBTSxFQUFFLEdBQUcsZ0JBQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0QyxPQUFPLFVBQVUsQ0FBQztZQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUvQyxJQUFJLFlBQVksS0FBSyxFQUFFLEVBQUU7Z0JBQUUsT0FBTyxLQUFLLENBQUM7YUFBRTtZQUMxQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUFBO0FBbEJELDhCQWtCQztBQUFBLENBQUM7QUFFRixTQUFlLGdCQUFnQixDQUFDLGNBQWM7O1FBQzVDLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUVyQixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDakMsV0FBVyxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDekQ7UUFDRCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFFRCxTQUFTLGFBQWEsQ0FBQyxPQUFPO0lBQzVCLFFBQVEsT0FBTyxFQUFFO1FBQ2pCLEtBQUssU0FBUyxDQUFDO1FBQ2YsS0FBSyxTQUFTLENBQUM7UUFDZixLQUFLLFVBQVUsQ0FBQztRQUNoQixLQUFLLFVBQVU7WUFFYixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkIsS0FBSyxXQUFXLENBQUM7UUFDakIsS0FBSyxTQUFTO1lBRVosT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFCLEtBQUssUUFBUTtZQUVYLE9BQU8sQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDdkM7WUFDRSxPQUFPLEVBQUUsQ0FBQztLQUNYO0FBQ0gsQ0FBQyJ9