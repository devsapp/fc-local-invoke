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
exports.updateCodeUriWithBuildPath = exports.detectTmpDir = exports.detectNasBaseDir = exports.getRootBaseDir = exports.DEFAULT_NAS_PATH_SUFFIX = exports.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const core = __importStar(require("@serverless-devs/core"));
const logger_1 = __importDefault(require("../common/logger"));
const lodash_1 = __importDefault(require("lodash"));
const runtime_1 = require("./common/model/runtime");
const stdout_formatter_1 = __importDefault(require("./component/stdout-formatter"));
exports.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX = path.join('.s', 'build', 'artifacts');
exports.DEFAULT_NAS_PATH_SUFFIX = path.join('.s', 'nas');
const DEFAULT_LOCAL_TMP_PATH_SUFFIX = path.join('.s', 'tmp', 'local');
function getRootBaseDir(baseDir) {
    const idx = baseDir.indexOf(exports.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
    if (idx !== -1) {
        // exist
        return baseDir.substring(0, idx);
    }
    return baseDir;
}
exports.getRootBaseDir = getRootBaseDir;
function detectNasBaseDir(devsPath) {
    const baseDir = getBaseDir(devsPath);
    return path.join(baseDir, exports.DEFAULT_NAS_PATH_SUFFIX);
}
exports.detectNasBaseDir = detectNasBaseDir;
function getBaseDir(devsPath) {
    const idx = devsPath.indexOf(exports.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
    if (idx !== -1) {
        const baseDir = devsPath.substring(0, idx);
        if (!baseDir) {
            return process.cwd();
        }
        return baseDir;
    }
    return path.resolve(path.dirname(devsPath));
}
function detectTmpDir(devsPath, tmpDir) {
    if (tmpDir) {
        return tmpDir;
    }
    const baseDir = getBaseDir(devsPath);
    return path.join(baseDir, DEFAULT_LOCAL_TMP_PATH_SUFFIX);
}
exports.detectTmpDir = detectTmpDir;
function updateCodeUriWithBuildPath(baseDir, functionConfig, serviceName) {
    return __awaiter(this, void 0, void 0, function* () {
        const buildBasePath = path.join(baseDir, exports.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
        if (!fs.pathExistsSync(buildBasePath) || fs.lstatSync(buildBasePath).isFile() || (0, runtime_1.isCustomContainerRuntime)(functionConfig.runtime)) {
            functionConfig.originalCodeUri = functionConfig.codeUri;
            if (functionConfig.codeUri) {
                functionConfig.codeUri = path.join(baseDir, functionConfig.codeUri);
            }
            return functionConfig;
        }
        const functionName = functionConfig.name;
        const buildCodeUri = path.join(buildBasePath, serviceName, functionName);
        const fcCore = yield core.loadComponent('devsapp/fc-core');
        yield fcCore.buildLink({
            serviceName,
            functionName,
            runtime: functionConfig.runtime,
            configDirPath: baseDir,
            codeUri: functionConfig.codeUri,
        });
        const resolvedFunctionConfig = lodash_1.default.cloneDeep(functionConfig);
        resolvedFunctionConfig.originalCodeUri = functionConfig.codeUri;
        resolvedFunctionConfig.codeUri = buildCodeUri;
        logger_1.default.info(stdout_formatter_1.default.stdoutFormatter.using('build codeUri', resolvedFunctionConfig.codeUri));
        return resolvedFunctionConfig;
    });
}
exports.updateCodeUriWithBuildPath = updateCodeUriWithBuildPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvZGV2cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qiw2Q0FBK0I7QUFDL0IsNERBQThDO0FBQzlDLDhEQUFzQztBQUV0QyxvREFBdUI7QUFDdkIsb0RBQWtFO0FBQ2xFLG9GQUEyRDtBQUU5QyxRQUFBLG1DQUFtQyxHQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNwRixRQUFBLHVCQUF1QixHQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3RFLE1BQU0sNkJBQTZCLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRTlFLFNBQWdCLGNBQWMsQ0FBQyxPQUFlO0lBQzVDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsMkNBQW1DLENBQUMsQ0FBQztJQUNqRSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUNkLFFBQVE7UUFDUixPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ2xDO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQVBELHdDQU9DO0FBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsUUFBZ0I7SUFDL0MsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXJDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsK0JBQXVCLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBSkQsNENBSUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxRQUFnQjtJQUNsQyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLDJDQUFtQyxDQUFDLENBQUM7SUFFbEUsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDZCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osT0FBTyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7U0FDdEI7UUFDRCxPQUFPLE9BQU8sQ0FBQztLQUNoQjtJQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUVELFNBQWdCLFlBQVksQ0FBQyxRQUFnQixFQUFFLE1BQWU7SUFDNUQsSUFBSSxNQUFNLEVBQUU7UUFDVixPQUFPLE1BQU0sQ0FBQztLQUNmO0lBRUQsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztBQUMzRCxDQUFDO0FBUEQsb0NBT0M7QUFFRCxTQUFzQiwwQkFBMEIsQ0FBQyxPQUFlLEVBQUUsY0FBOEIsRUFBRSxXQUFtQjs7UUFDbkgsTUFBTSxhQUFhLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsMkNBQW1DLENBQUMsQ0FBQztRQUN0RixJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLElBQUEsa0NBQXdCLEVBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ2pJLGNBQWMsQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQztZQUN4RCxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUU7Z0JBQzFCLGNBQWMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3JFO1lBQ0QsT0FBTyxjQUFjLENBQUM7U0FDdkI7UUFFRCxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDO1FBQ3pDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUV6RSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMzRCxNQUFNLE1BQU0sQ0FBQyxTQUFTLENBQUM7WUFDckIsV0FBVztZQUNYLFlBQVk7WUFDWixPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU87WUFDL0IsYUFBYSxFQUFFLE9BQU87WUFDdEIsT0FBTyxFQUFFLGNBQWMsQ0FBQyxPQUFPO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sc0JBQXNCLEdBQW1CLGdCQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNFLHNCQUFzQixDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDO1FBQ2hFLHNCQUFzQixDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUM7UUFDOUMsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsMEJBQWUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3BHLE9BQU8sc0JBQXNCLENBQUM7SUFDaEMsQ0FBQztDQUFBO0FBM0JELGdFQTJCQyJ9