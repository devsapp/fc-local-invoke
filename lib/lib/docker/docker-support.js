'use strict';
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
exports.findPathsOutofSharedPaths = void 0;
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const USER_HOME = require('os').homedir();
const defaultFileSharingPaths = [
    '/Users',
    '/Volumes',
    '/private',
    '/tmp'
];
function getSharedPathsOfDockerForMac() {
    return __awaiter(this, void 0, void 0, function* () {
        const settingsPath = path.join(USER_HOME, 'Library/Group Containers/group.com.docker/settings.json');
        const fileData = yield fs.readFile(settingsPath, 'utf8');
        const settings = JSON.parse(fileData);
        if (settings.hasOwnProperty('filesharingDirectories')) {
            return settings.filesharingDirectories;
        }
        return defaultFileSharingPaths;
    });
}
function findPathsOutofSharedPaths(mounts) {
    return __awaiter(this, void 0, void 0, function* () {
        const dockerSharedPaths = yield getSharedPathsOfDockerForMac();
        let pathsOutofSharedPaths = [];
        for (let mount of mounts) {
            if (_.isEmpty(mount)) {
                continue;
            }
            const mountPath = mount.Source;
            let isMountPathSharedToDocker = false;
            for (let dockerSharedPath of dockerSharedPaths) {
                if (mountPath.startsWith(dockerSharedPath)) {
                    isMountPathSharedToDocker = true;
                    break;
                }
            }
            if (!isMountPathSharedToDocker) {
                pathsOutofSharedPaths.push(mountPath);
            }
        }
        return pathsOutofSharedPaths;
    });
}
exports.findPathsOutofSharedPaths = findPathsOutofSharedPaths;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9ja2VyLXN1cHBvcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2RvY2tlci9kb2NrZXItc3VwcG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7Ozs7Ozs7Ozs7OztBQUNiLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMvQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzVCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUMxQyxNQUFNLHVCQUF1QixHQUFHO0lBQzlCLFFBQVE7SUFDUixVQUFVO0lBQ1YsVUFBVTtJQUNWLE1BQU07Q0FDUCxDQUFDO0FBRUYsU0FBZSw0QkFBNEI7O1FBRXpDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHlEQUF5RCxDQUFDLENBQUM7UUFFckcsTUFBTSxRQUFRLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV6RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXRDLElBQUksUUFBUSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFO1lBQ3JELE9BQU8sUUFBUSxDQUFDLHNCQUFzQixDQUFDO1NBQ3hDO1FBQ0QsT0FBTyx1QkFBdUIsQ0FBQztJQUNqQyxDQUFDO0NBQUE7QUFFRCxTQUFzQix5QkFBeUIsQ0FBQyxNQUFNOztRQUNwRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sNEJBQTRCLEVBQUUsQ0FBQztRQUMvRCxJQUFJLHFCQUFxQixHQUFHLEVBQUUsQ0FBQztRQUMvQixLQUFLLElBQUksS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUN4QixJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQUUsU0FBUzthQUFFO1lBRW5DLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDL0IsSUFBSSx5QkFBeUIsR0FBRyxLQUFLLENBQUM7WUFDdEMsS0FBSyxJQUFJLGdCQUFnQixJQUFJLGlCQUFpQixFQUFFO2dCQUM5QyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtvQkFDMUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDO29CQUNqQyxNQUFNO2lCQUNQO2FBQ0Y7WUFDRCxJQUFJLENBQUMseUJBQXlCLEVBQUU7Z0JBQzlCLHFCQUFxQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUN2QztTQUNGO1FBQ0QsT0FBTyxxQkFBcUIsQ0FBQztJQUMvQixDQUFDO0NBQUE7QUFuQkQsOERBbUJDIn0=