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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCodeUriWithBuildPath = exports.detectTmpDir = exports.detectNasBaseDir = exports.getRootBaseDir = exports.DEFAULT_NAS_PATH_SUFFIX = exports.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const logger_1 = __importDefault(require("../common/logger"));
const lodash_1 = __importDefault(require("lodash"));
const runtime_1 = require("./common/model/runtime");
exports.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX = path.join('.s', 'build', 'artifacts');
exports.DEFAULT_NAS_PATH_SUFFIX = path.join('.s', 'nas');
const DEFAULT_LOCAL_TMP_PATH_SUFFIX = path.join('.s', 'tmp', 'local');
function getRootBaseDir(baseDir) {
    const idx = baseDir.indexOf(exports.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
    if (idx !== -1) { // exist
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
// export async function generateDevsPath(defaultDevsPath: string, devsPathGivenByUser?: string): Promise<string> {
//   let devsPath: string;
//   if (devsPathGivenByUser) {
//     devsPath = devsPathGivenByUser;
//   }
//   if (!devsPath) {
//     devsPath = defaultDevsPath;
//   }
//   if (!devsPath) {
//     throw new Error('Current folder not a serverless project\nThe folder must contains s.[yml|yaml].');
//   }
//   return devsPath;
// }
// async function detectDevsPath(defaultDevsPath: string, preferBuildTpl = true, showTip = true): Promise<string> {
//   let buildTemplate: string[] = [];
//   if (preferBuildTpl) {
//     buildTemplate = ['s.yml', 's.yaml'].map(f => {
//       return path.join(process.cwd(), '.s', 'build', 'artifacts', f);
//     });
//   }
//   let defaultTemplate: string[] = [];
//   if (defaultDevsPath) {
//     defaultTemplate.push(defaultDevsPath);
//   } else {
//     defaultTemplate = ['s.yml', 's.yaml']
//     .map((f) => path.join(process.cwd(), f));
//   }
//   const devsPath: string = await asyncFind([...buildTemplate, ...defaultTemplate], async (path) => {
//     return await fs.pathExists(path);
//   });
//   if (devsPath && showTip && !hasShownTip) {
//     logger.log(`using template: ${path.relative(process.cwd(), devsPath)}`, 'yellow');
//     hasShownTip = false;
//   }
//   return devsPath;
// }
// async function asyncFind(pathArrays, filter) {
//   for (let path of pathArrays) {
//     if (await filter(path)) {
//       return path;
//     }
//   }
//   return null;
// }
function detectTmpDir(devsPath, tmpDir) {
    if (tmpDir) {
        return tmpDir;
    }
    const baseDir = getBaseDir(devsPath);
    return path.join(baseDir, DEFAULT_LOCAL_TMP_PATH_SUFFIX);
}
exports.detectTmpDir = detectTmpDir;
function updateCodeUriWithBuildPath(baseDir, functionConfig, serviceName) {
    const buildBasePath = path.join(baseDir, exports.DEFAULT_BUILD_ARTIFACTS_PATH_SUFFIX);
    if (!fs.pathExistsSync(buildBasePath) || fs.lstatSync(buildBasePath).isFile() || runtime_1.isCustomContainerRuntime(functionConfig.runtime)) {
        return functionConfig;
    }
    const resolvedFunctionConfig = lodash_1.default.cloneDeep(functionConfig);
    resolvedFunctionConfig.codeUri = path.join(buildBasePath, serviceName, functionConfig.name);
    logger_1.default.info(`Using build codeUri: ${resolvedFunctionConfig.codeUri}.`);
    return resolvedFunctionConfig;
}
exports.updateCodeUriWithBuildPath = updateCodeUriWithBuildPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvZGV2cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLDZDQUErQjtBQUMvQiw4REFBc0M7QUFFdEMsb0RBQXVCO0FBQ3ZCLG9EQUFrRTtBQUVyRCxRQUFBLG1DQUFtQyxHQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNwRixRQUFBLHVCQUF1QixHQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3RFLE1BQU0sNkJBQTZCLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBSTlFLFNBQWdCLGNBQWMsQ0FBQyxPQUFlO0lBQzVDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsMkNBQW1DLENBQUMsQ0FBQztJQUNqRSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLFFBQVE7UUFDeEIsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztLQUNsQztJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFORCx3Q0FNQztBQUVELFNBQWdCLGdCQUFnQixDQUFDLFFBQWdCO0lBQy9DLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVyQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLCtCQUF1QixDQUFDLENBQUM7QUFDckQsQ0FBQztBQUpELDRDQUlDO0FBRUQsU0FBUyxVQUFVLENBQUMsUUFBZ0I7SUFDbEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQywyQ0FBbUMsQ0FBQyxDQUFDO0lBRWxFLElB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