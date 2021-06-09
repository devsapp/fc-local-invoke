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
exports.addEnv = exports.resolveLibPathsFromLdConf = exports.addInstallTargetEnv = void 0;
const _ = __importStar(require("lodash"));
const definition_1 = require("./definition");
const nas_1 = require("./nas");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const file_1 = require("./utils/file");
const sysLibs = [
    '/usr/local/lib',
    '/usr/lib',
    '/usr/lib/x86_64-linux-gnu',
    '/usr/lib64',
    '/lib',
    '/lib/x86_64-linux-gnu',
    '/python/lib/python2.7/site-packages',
    '/python/lib/python3.6/site-packages'
];
const fcLibs = [
    '/code',
    '/code/lib',
    '/usr/local/lib'
];
const sysPaths = [
    '/usr/local/bin',
    '/usr/local/sbin',
    '/usr/bin',
    '/usr/sbin',
    '/sbin',
    '/bin'
];
const fcPaths = [
    '/code',
    '/code/node_modules/.bin'
];
const pythonPaths = [
    '/python/lib/python2.7/site-packages',
    '/python/lib/python3.6/site-packages'
];
const funPaths = [
    '/python/bin',
    '/node_modules/.bin'
];
// This method is only used for fun install target attribue.
//
// In order to be able to use the dependencies installed in the previous step,
// such as the model serving example, fun need to configure the corresponding environment variables
// so that the install process can go through.
//
// However, if the target specifies a directory other than nas, code,
// it will not be successful by deploy, so this is an implicit rule.
//
// For fun-install, don't need to care about this rule because it has Context information for nas.
// Fun will set all environment variables before fun-install is executed.
function addInstallTargetEnv(envVars, targets) {
    const envs = Object.assign({}, envVars);
    if (!targets) {
        return envs;
    }
    _.forEach(targets, (target) => {
        const { containerPath } = target;
        const prefix = containerPath;
        const targetPathonPath = pythonPaths.map(p => `${prefix}${p}`).join(':');
        if (envs['PYTHONPATH']) {
            envs['PYTHONPATH'] = `${envs['PYTHONPATH']}:${targetPathonPath}`;
        }
        else {
            envs['PYTHONPATH'] = targetPathonPath;
        }
    });
    return envs;
}
exports.addInstallTargetEnv = addInstallTargetEnv;
function resolveLibPathsFromLdConf(baseDir, codeUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const envs = {};
        if (!codeUri) {
            return envs;
        }
        const confdPath = path.resolve(baseDir, codeUri, '.fun/root/etc/ld.so.conf.d');
        if (!(yield fs.pathExists(confdPath))) {
            return envs;
        }
        const stats = yield fs.lstat(confdPath);
        if (stats.isFile()) {
            return envs;
        }
        const libPaths = yield resolveLibPaths(confdPath);
        if (!_.isEmpty(libPaths)) {
            envs['LD_LIBRARY_PATH'] = libPaths.map(path => `/code/.fun/root${path}`).join(':');
        }
        return envs;
    });
}
exports.resolveLibPathsFromLdConf = resolveLibPathsFromLdConf;
function resolveLibPaths(confdPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fs.existsSync(confdPath)) {
            return [];
        }
        const confLines = yield Promise.all(fs.readdirSync(confdPath, 'utf-8')
            .filter(f => f.endsWith('.conf'))
            .map((f) => __awaiter(this, void 0, void 0, function* () { return yield file_1.readLines(path.join(confdPath, f)); })));
        return _.flatten(confLines)
            .reduce((lines, line) => {
            // remove the first and last blanks and leave only the middle
            const found = line.match(/^\s*(\/.*)\s*$/);
            if (found && found[1].startsWith('/')) {
                lines.push(found[1]);
            }
            return lines;
        }, []);
    });
}
function addEnv(envVars, nasConfig) {
    const envs = Object.assign({}, envVars);
    const prefix = '/code/.s';
    envs['LD_LIBRARY_PATH'] = generateLibPath(envs, prefix);
    envs['PATH'] = generatePath(envs, prefix);
    envs['NODE_PATH'] = generateNodePaths(envs, '/code');
    const defaultPythonPath = `${prefix}/python`;
    if (!envs['PYTHONUSERBASE']) {
        envs['PYTHONUSERBASE'] = defaultPythonPath;
    }
    if (nasConfig) {
        return appendNasEnvs(envs, nasConfig);
    }
    return envs;
}
exports.addEnv = addEnv;
function appendNasEnvs(envs, nasConfig) {
    const isNasAuto = definition_1.isNasAutoConfig(nasConfig);
    var nasEnvs;
    if (isNasAuto) {
        const mountDir = '/mnt/auto';
        nasEnvs = appendNasMountPointEnv(envs, mountDir);
    }
    else {
        const mountPoints = nasConfig.mountPoints;
        _.forEach(mountPoints, (mountPoint) => {
            const { mountDir } = nas_1.resolveMountPoint(mountPoint);
            nasEnvs = appendNasMountPointEnv(envs, mountDir);
        });
    }
    return nasEnvs;
}
function appendNasMountPointEnv(envs, mountDir) {
    envs['LD_LIBRARY_PATH'] = generateLibPath(envs, mountDir);
    envs['PATH'] = generatePath(envs, mountDir);
    envs['NODE_PATH'] = generateNodePaths(envs, mountDir);
    const nasPythonPaths = generatePythonPaths(mountDir);
    if (envs['PYTHONPATH']) {
        envs['PYTHONPATH'] = `${envs['PYTHONPATH']}:${nasPythonPaths}`;
    }
    else {
        envs['PYTHONPATH'] = nasPythonPaths;
    }
    // TODO: add other runtime envs
    return envs;
}
function generatePythonPaths(prefix) {
    return pythonPaths.map(p => `${prefix}${p}`).join(':');
}
function generateNodePaths(envs, prefix) {
    const defaultPath = `/usr/local/lib/node_modules`;
    const customPath = `${prefix}/node_modules`;
    let path;
    if (envs['NODE_PATH']) {
        path = `${envs['NODE_PATH']}:${customPath}:${defaultPath}`;
    }
    else {
        path = `${customPath}:${defaultPath}`;
    }
    return duplicateRemoval(path);
}
function generateLibPath(envs, prefix) {
    let libPath = _.union(sysLibs.map(p => `${prefix}/root${p}`), fcLibs).join(':');
    if (envs['LD_LIBRARY_PATH']) {
        libPath = `${envs['LD_LIBRARY_PATH']}:${libPath}`;
    }
    return duplicateRemoval(libPath);
}
function generatePath(envs, prefix) {
    let path = _.union(sysPaths.map(p => `${prefix}/root${p}`), fcPaths, funPaths.map(p => `${prefix}${p}`), sysPaths).join(':');
    if (envs['PATH']) {
        path = `${envs['PATH']}:${path}`;
    }
    return duplicateRemoval(path);
}
function duplicateRemoval(str) {
    const spliceValue = str.split(':');
    return _.union(spliceValue).join(':');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9lbnYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDBDQUE0QjtBQUM1Qiw2Q0FBK0M7QUFDL0MsK0JBQTBDO0FBQzFDLDJDQUE2QjtBQUM3Qiw2Q0FBK0I7QUFDL0IsdUNBQXlDO0FBRXpDLE1BQU0sT0FBTyxHQUFhO0lBQ3hCLGdCQUFnQjtJQUNoQixVQUFVO0lBQ1YsMkJBQTJCO0lBQzNCLFlBQVk7SUFDWixNQUFNO0lBQ04sdUJBQXVCO0lBQ3ZCLHFDQUFxQztJQUNyQyxxQ0FBcUM7Q0FDdEMsQ0FBQztBQUVGLE1BQU0sTUFBTSxHQUFhO0lBQ3ZCLE9BQU87SUFDUCxXQUFXO0lBQ1gsZ0JBQWdCO0NBQ2pCLENBQUM7QUFFRixNQUFNLFFBQVEsR0FBYTtJQUN6QixnQkFBZ0I7SUFDaEIsaUJBQWlCO0lBQ2pCLFVBQVU7SUFDVixXQUFXO0lBQ1gsT0FBTztJQUNQLE1BQU07Q0FDUCxDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQWE7SUFDeEIsT0FBTztJQUNQLHlCQUF5QjtDQUMxQixDQUFDO0FBR0YsTUFBTSxXQUFXLEdBQWE7SUFDNUIscUNBQXFDO0lBQ3JDLHFDQUFxQztDQUN0QyxDQUFDO0FBRUYsTUFBTSxRQUFRLEdBQWE7SUFDekIsYUFBYTtJQUNiLG9CQUFvQjtDQUNyQixDQUFDO0FBRUYsNERBQTREO0FBQzVELEVBQUU7QUFDRiw4RUFBOEU7QUFDOUUsbUdBQW1HO0FBQ25HLDhDQUE4QztBQUM5QyxFQUFFO0FBQ0YscUVBQXFFO0FBQ3JFLG9FQUFvRTtBQUNwRSxFQUFFO0FBQ0Ysa0dBQWtHO0FBQ2xHLHlFQUF5RTtBQUN6RSxTQUFnQixtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsT0FBTztJQUNsRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FB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