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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addEnv = exports.resolveLibPathsFromLdConf = void 0;
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
    '/python/lib/python3.6/site-packages',
    '/python/lib/python3.9/site-packages',
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
    '/python/lib/python3.6/site-packages',
    '/python/lib/python3.9/site-packages',
];
const funPaths = [
    '/python/bin',
    '/node_modules/.bin'
];
function resolveLibPathsFromLdConf(baseDir, codeUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const envs = {};
        if (!codeUri) {
            return envs;
        }
        const confdPath = path.resolve(baseDir, codeUri, '.s/root/etc/ld.so.conf.d');
        if (!(yield fs.pathExists(confdPath))) {
            return envs;
        }
        const stats = yield fs.lstat(confdPath);
        if (stats.isFile()) {
            return envs;
        }
        const libPaths = yield resolveLibPaths(confdPath);
        if (!_.isEmpty(libPaths)) {
            envs['LD_LIBRARY_PATH'] = libPaths.map(path => `/code/.s/root${path}`).join(':');
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
            .map((f) => __awaiter(this, void 0, void 0, function* () { return yield (0, file_1.readLines)(path.join(confdPath, f)); })));
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
function addEnv(envVars, appendConfig) {
    const nasConfig = appendConfig === null || appendConfig === void 0 ? void 0 : appendConfig.nasConfig;
    const layers = appendConfig === null || appendConfig === void 0 ? void 0 : appendConfig.layers;
    const runtime = appendConfig === null || appendConfig === void 0 ? void 0 : appendConfig.runtime;
    const envs = Object.assign({}, envVars);
    const prefix = '/code/.s';
    envs['LD_LIBRARY_PATH'] = generateLibPath(envs, prefix);
    envs['PATH'] = generatePath(envs, prefix);
    envs['NODE_PATH'] = generateNodePaths(envs, '/code');
    const defaultPythonPath = `${prefix}/python`;
    if (!envs['PYTHONUSERBASE']) {
        envs['PYTHONUSERBASE'] = defaultPythonPath;
    }
    if (!_.isEmpty(layers)) {
        const genEnv = genLayerEnvs(envs, runtime);
        Object.assign(envs, genEnv);
    }
    if (nasConfig) {
        return appendNasEnvs(envs, nasConfig);
    }
    return envs;
}
exports.addEnv = addEnv;
function genLayerEnvs(envs, runtime) {
    const { NODE_PATH = '', PYTHONUSERBASE } = envs;
    if (runtime.startsWith('node')) {
        envs.NODE_PATH = `${NODE_PATH}:/opt/nodejs/${runtime.replace('nodejs', 'node')}/node_modules:/opt/nodejs/node_modules`;
    }
    else if (runtime === 'python2.7') {
        envs['PYTHONUSERBASE'] = `${PYTHONUSERBASE}:/opt/python/lib/python2.7/site-packages:/opt/python`;
    }
    else if (runtime === 'python3') {
        envs['PYTHONUSERBASE'] = `${PYTHONUSERBASE}:/opt/python/lib/python3.6/site-packages:/opt/python`;
    }
    else if (runtime === 'python3.9') {
        envs['PYTHONUSERBASE'] = `${PYTHONUSERBASE}:/opt/python/lib/python3.9/site-packages:/opt/python`;
    }
    return envs;
}
function appendNasEnvs(envs, nasConfig) {
    const isNasAuto = (0, definition_1.isNasAutoConfig)(nasConfig);
    var nasEnvs;
    if (isNasAuto) {
        const mountDir = '/mnt/auto';
        nasEnvs = appendNasMountPointEnv(envs, mountDir);
    }
    else {
        const mountPoints = nasConfig.mountPoints;
        _.forEach(mountPoints, (mountPoint) => {
            const { mountDir } = (0, nas_1.resolveMountPoint)(mountPoint);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9lbnYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSwwQ0FBNEI7QUFDNUIsNkNBQStDO0FBQy9DLCtCQUEwQztBQUMxQywyQ0FBNkI7QUFDN0IsNkNBQStCO0FBQy9CLHVDQUF5QztBQUV6QyxNQUFNLE9BQU8sR0FBYTtJQUN4QixnQkFBZ0I7SUFDaEIsVUFBVTtJQUNWLDJCQUEyQjtJQUMzQixZQUFZO0lBQ1osTUFBTTtJQUNOLHVCQUF1QjtJQUN2QixxQ0FBcUM7SUFDckMscUNBQXFDO0lBQ3JDLHFDQUFxQztDQUN0QyxDQUFDO0FBRUYsTUFBTSxNQUFNLEdBQWE7SUFDdkIsT0FBTztJQUNQLFdBQVc7SUFDWCxnQkFBZ0I7Q0FDakIsQ0FBQztBQUVGLE1BQU0sUUFBUSxHQUFhO0lBQ3pCLGdCQUFnQjtJQUNoQixpQkFBaUI7SUFDakIsVUFBVTtJQUNWLFdBQVc7SUFDWCxPQUFPO0lBQ1AsTUFBTTtDQUNQLENBQUM7QUFFRixNQUFNLE9BQU8sR0FBYTtJQUN4QixPQUFPO0lBQ1AseUJBQXlCO0NBQzFCLENBQUM7QUFHRixNQUFNLFdBQVcsR0FBYTtJQUM1QixxQ0FBcUM7SUFDckMscUNBQXFDO0lBQ3JDLHFDQUFxQztDQUN0QyxDQUFDO0FBRUYsTUFBTSxRQUFRLEdBQWE7SUFDekIsYUFBYTtJQUNiLG9CQUFvQjtDQUNyQixDQUFDO0FBRUYsU0FBc0IseUJBQXlCLENBQUMsT0FBZSxFQUFFLE9BQWU7O1FBQzlFLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsT0FBTyxFQUFFO1lBQUUsT0FBTyxJQUFJLENBQUM7U0FBRTtRQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUU3RSxJ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