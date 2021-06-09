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
exports.detectLibrary = void 0;
const _ = __importStar(require("lodash"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const logger_1 = __importDefault(require("../common/logger"));
// TODO: python runtime .egg-info and .dist-info
const runtimeTypeMapping = {
    'nodejs6': ['node_modules', '.fun/root'],
    'nodejs8': ['node_modules', '.fun/root'],
    'nodejs10': ['node_modules', '.fun/root'],
    'nodejs12': ['node_modules', '.fun/root'],
    'python2.7': ['.fun/python', '.fun/root'],
    'python3': ['.fun/python', '.fun/root'],
    'php7.2': ['extension', 'vendor', '.fun/root']
};
function detectLibraryFolders(dirName, libraryFolders, wrap, functionName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (_.isEmpty(libraryFolders)) {
            return;
        }
        for (const libraryFolder of libraryFolders) {
            const libraryPath = path.join(dirName, libraryFolder);
            if (yield fs.pathExists(libraryPath)) {
                logger_1.default.warning(`${wrap}Fc detected that the library directory '${libraryFolder}' is not included in function '${functionName}' CodeUri.\n\t\tPlease make sure if it is the right configuration. if yes, ignore please.`);
                return;
            }
        }
    });
}
function detectLibrary(codeUri, runtime, baseDir, functionName, wrap = '') {
    return __awaiter(this, void 0, void 0, function* () {
        if (codeUri) {
            const absoluteCodePath = path.resolve(baseDir, codeUri);
            const stats = yield fs.lstat(absoluteCodePath);
            if (stats.isFile()) {
                let libraryFolders = runtimeTypeMapping[runtime];
                yield detectLibraryFolders(path.dirname(absoluteCodePath), libraryFolders, wrap, functionName);
            }
        }
    });
}
exports.detectLibrary = detectLibrary;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL2ZjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLDZDQUErQjtBQUMvQiw4REFBc0M7QUFFdEMsZ0RBQWdEO0FBQ2hELE1BQU0sa0JBQWtCLEdBQVE7SUFDOUIsU0FBUyxFQUFFLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztJQUN4QyxTQUFTLEVBQUUsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDO0lBQ3hDLFVBQVUsRUFBRSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUM7SUFDekMsVUFBVSxFQUFFLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztJQUN6QyxXQUFXLEVBQUUsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDO0lBQ3pDLFNBQVMsRUFBRSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUM7SUFDdkMsUUFBUSxFQUFFLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUM7Q0FDL0MsQ0FBQztBQUVGLFNBQWUsb0JBQW9CLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsWUFBWTs7UUFDN0UsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQUUsT0FBTztTQUFFO1FBRTFDLEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFO1lBQzFDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3RELElBQUksTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUNwQyxnQkFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksMkNBQTJDLGFBQWEsa0NBQWtDLFlBQVksMkZBQTJGLENBQUMsQ0FBQztnQkFDek4sT0FBTzthQUNSO1NBQ0Y7SUFDSCxDQUFDO0NBQUE7QUFFRCxTQUFzQixhQUFhLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksR0FBRyxFQUFFOztRQUNwRixJQUFJLE9BQU8sRUFBRTtZQUNYLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFeEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDL0MsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2xCLElBQUksY0FBYyxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUVqRCxNQUFNLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQ2hHO1NBQ0Y7SUFDSCxDQUFDO0NBQUE7QUFYRCxzQ0FXQyJ9