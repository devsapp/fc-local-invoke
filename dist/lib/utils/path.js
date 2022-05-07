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
exports.ensureTmpDir = void 0;
const path = __importStar(require("path"));
const core = __importStar(require("@serverless-devs/core"));
const devs_1 = require("../devs");
const fs = __importStar(require("fs-extra"));
function ensureTmpDir(tmpDir, devsPath, serviceName, functionName) {
    return __awaiter(this, void 0, void 0, function* () {
        const absTmpDir = tmpDir ? path.resolve(tmpDir) : path.resolve((0, devs_1.detectTmpDir)(devsPath), serviceName, functionName);
        if (yield fs.pathExists(absTmpDir)) {
            const stats = yield fs.lstat(absTmpDir);
            if (stats.isFile()) {
                const fcCore = yield core.loadComponent('devsapp/fc-core');
                throw new fcCore.CatchableError(`'${absTmpDir}' should be a directory.`);
            }
        }
        else {
            yield fs.ensureDir(absTmpDir, {
                mode: parseInt('0777', 8)
            });
        }
        return absTmpDir;
    });
}
exports.ensureTmpDir = ensureTmpDir;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvdXRpbHMvcGF0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qiw0REFBOEM7QUFDOUMsa0NBQXVDO0FBQ3ZDLDZDQUErQjtBQUUvQixTQUFzQixZQUFZLENBQUMsTUFBYyxFQUFFLFFBQWdCLEVBQUUsV0FBbUIsRUFBRSxZQUFvQjs7UUFFNUcsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUEsbUJBQVksRUFBQyxRQUFRLENBQUMsRUFBRSxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFbEgsSUFBSSxNQUFNLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFFbEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXhDLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNsQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDM0QsTUFBTSxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxTQUFTLDBCQUEwQixDQUFDLENBQUM7YUFDMUU7U0FDRjthQUFNO1lBQ0wsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRTtnQkFDNUIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2FBQzFCLENBQUMsQ0FBQztTQUNKO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztDQUFBO0FBbkJELG9DQW1CQyJ9