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
exports.detectLibrary = void 0;
const _ = __importStar(require("lodash"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const logger_1 = __importDefault(require("../common/logger"));
// TODO: python runtime .egg-info and .dist-info
const runtimeTypeMapping = {
    'nodejs6': ['node_modules', '.s/root'],
    'nodejs8': ['node_modules', '.s/root'],
    'nodejs10': ['node_modules', '.s/root'],
    'nodejs12': ['node_modules', '.s/root'],
    'nodejs14': ['node_modules', '.s/root'],
    'python2.7': ['.s/python', '.s/root'],
    'python3': ['.s/python', '.s/root'],
    'python3.9': ['.s/python', '.s/root'],
    'php7.2': ['extension', 'vendor', '.s/root']
};
function detectLibraryFolders(dirName, libraryFolders, wrap, functionName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (_.isEmpty(libraryFolders)) {
            return;
        }
        for (const libraryFolder of libraryFolders) {
            const libraryPath = path.join(dirName, libraryFolder);
            if (yield fs.pathExists(libraryPath)) {
                logger_1.default.warn(`${wrap}Fc detected that the library directory '${libraryFolder}' is not included in function '${functionName}' CodeUri.\n\t\tPlease make sure if it is the right configuration. if yes, ignore please.`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL2ZjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3Qiw2Q0FBK0I7QUFDL0IsOERBQXNDO0FBRXRDLGdEQUFnRDtBQUNoRCxNQUFNLGtCQUFrQixHQUFRO0lBQzlCLFNBQVMsRUFBRSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUM7SUFDdEMsU0FBUyxFQUFFLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQztJQUN0QyxVQUFVLEVBQUUsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDO0lBQ3ZDLFVBQVUsRUFBRSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUM7SUFDdkMsVUFBVSxFQUFFLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQztJQUN2QyxXQUFXLEVBQUUsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDO0lBQ3JDLFNBQVMsRUFBRSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUM7SUFDbkMsV0FBVyxFQUFFLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQztJQUNyQyxRQUFRLEVBQUUsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztDQUM3QyxDQUFDO0FBRUYsU0FBZSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxZQUFZOztRQUM3RSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFBRSxPQUFPO1NBQUU7UUFFMUMsS0FBSyxNQUFNLGFBQWEsSUFBSSxjQUFjLEVBQUU7WUFDMUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDdEQsSUFBSSxNQUFNLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQ3BDLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSwyQ0FBMkMsYUFBYSxrQ0FBa0MsWUFBWSwyRkFBMkYsQ0FBQyxDQUFDO2dCQUN0TixPQUFPO2FBQ1I7U0FDRjtJQUNILENBQUM7Q0FBQTtBQUVELFNBQXNCLGFBQWEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsSUFBSSxHQUFHLEVBQUU7O1FBQ3BGLElBQUksT0FBTyxFQUFFO1lBQ1gsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUV4RCxNQUFNLEtBQUssR0FBRyxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUMvQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDbEIsSUFBSSxjQUFjLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRWpELE1BQU0sb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7YUFDaEc7U0FDRjtJQUNILENBQUM7Q0FBQTtBQVhELHNDQVdDIn0=