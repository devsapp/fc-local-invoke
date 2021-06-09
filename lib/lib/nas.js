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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMountPoint = exports.convertNasConfigToNasMappings = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const definition_1 = require("./definition");
function convertNasConfigToNasMappings(nasBaseDir, nasConfig, serviceName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!nasConfig) {
            return [];
        }
        const isNasAuto = definition_1.isNasAutoConfig(nasConfig);
        if (isNasAuto) { // support 'NasConfig: Auto'
            const nasDir = path.join(nasBaseDir, 'auto-default');
            const localNasDir = path.join(nasDir, serviceName);
            if (!(yield fs.pathExists(localNasDir))) {
                yield fs.ensureDir(localNasDir);
            }
            return [{
                    localNasDir,
                    remoteNasDir: '/mnt/auto'
                }];
        }
        const mountPoints = nasConfig.mountPoints;
        return yield convertMountPointsToNasMappings(nasBaseDir, mountPoints);
    });
}
exports.convertNasConfigToNasMappings = convertNasConfigToNasMappings;
function convertMountPointsToNasMappings(nasBaseDir, mountPoints) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!mountPoints) {
            return [];
        }
        const nasMappings = [];
        for (let mountPoint of mountPoints) {
            const nasMapping = yield convertMountPointToNasMapping(nasBaseDir, mountPoint);
            nasMappings.push(nasMapping);
        }
        return nasMappings;
    });
}
function convertMountPointToNasMapping(nasBaseDir, mountPoint) {
    return __awaiter(this, void 0, void 0, function* () {
        const { mountSource, mountDir, serverPath } = resolveMountPoint(mountPoint);
        const nasDir = path.join(nasBaseDir, serverPath);
        if (!(yield fs.pathExists(nasDir))) {
            yield fs.ensureDir(nasDir);
        }
        const localNasDir = path.join(nasDir, mountSource);
        // The mounted nas directory must exist.
        if (!(yield fs.pathExists(localNasDir))) {
            yield fs.ensureDir(localNasDir);
        }
        return {
            localNasDir,
            remoteNasDir: mountDir
        };
    });
}
function resolveMountPoint(mountPoint) {
    return {
        serverPath: mountPoint.serverAddr,
        mountSource: mountPoint.nasDir,
        mountDir: mountPoint.fcDir // /mnt/auto
    };
}
exports.resolveMountPoint = resolveMountPoint;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9uYXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDJDQUE2QjtBQUM3Qiw2Q0FBK0I7QUFDL0IsNkNBQStDO0FBRS9DLFNBQXNCLDZCQUE2QixDQUFDLFVBQWtCLEVBQUUsU0FBb0IsRUFBRSxXQUFtQjs7UUFDL0csSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUFFLE9BQU8sRUFBRSxDQUFDO1NBQUU7UUFFOUIsTUFBTSxTQUFTLEdBQUcsNEJBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU3QyxJQUFJLFNBQVMsRUFBRSxFQUFFLDRCQUE0QjtZQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUVyRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztZQUVuRCxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRTtnQkFDdkMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ2pDO1lBRUQsT0FBTyxDQUFDO29CQUNOLFdBQVc7b0JBQ1gsWUFBWSxFQUFFLFdBQVc7aUJBQzFCLENBQUMsQ0FBQztTQUNKO1FBQ0QsTUFBTSxXQUFXLEdBQWlCLFNBQVMsQ0FBQyxXQUFXLENBQUM7UUFFeEQsT0FBTyxNQUFNLCtCQUErQixDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN4RSxDQUFDO0NBQUE7QUF0QkQsc0VBc0JDO0FBRUQsU0FBZSwrQkFBK0IsQ0FBQyxVQUFrQixFQUFFLFdBQXlCOztRQUMxRixJQUFJLENBQUMsV0FBVyxFQUFFO1lBQUUsT0FBTyxFQUFFLENBQUM7U0FBRTtRQUVoQyxNQUFNLFdBQVcsR0FBZSxFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLFVBQVUsSUFBSSxXQUFXLEVBQUU7WUFDbEMsTUFBTSxVQUFVLEdBQUcsTUFBTSw2QkFBNkIsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFFL0UsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUM5QjtRQUVELE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7Q0FBQTtBQUVELFNBQWUsNkJBQTZCLENBQUMsVUFBa0IsRUFBRSxVQUFzQjs7UUFDckYsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFNUUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFakQsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUU7WUFDbEMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzVCO1FBRUQsTUFBTSxXQUFXLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFM0Qsd0NBQXdDO1FBQ3hDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNqQztRQUVELE9BQU87WUFDTCxXQUFXO1lBQ1gsWUFBWSxFQUFFLFFBQVE7U0FDdkIsQ0FBQztJQUNKLENBQUM7Q0FBQTtBQUVELFNBQWdCLGlCQUFpQixDQUFDLFVBQXNCO0lBQ3RELE9BQU87UUFDTCxVQUFVLEVBQUUsVUFBVSxDQUFDLFVBQVU7UUFDakMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxNQUFNO1FBQzlCLFFBQVEsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFRLFlBQVk7S0FDL0MsQ0FBQztBQUNKLENBQUM7QUFORCw4Q0FNQyJ9