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
const path_1 = __importDefault(require("path"));
const core_1 = require("@serverless-devs/core");
const logger_1 = __importDefault(require("./common/logger"));
const fs = __importStar(require("fs-extra"));
/**
 * 默认的bootstrap，环境变量3者生效顺序：环境变量>自定义参数>默认bootstrap
 * @param functionConfig FunctionConfig
 * @returns
 */
function default_1(functionConfig) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        // 存在环境变量则退出，不检测
        if (!core_1.lodash.isEmpty((_a = functionConfig.environmentVariables) === null || _a === void 0 ? void 0 : _a.AGENT_SCRIPT)) {
            return;
        }
        const codeUri = (functionConfig === null || functionConfig === void 0 ? void 0 : functionConfig.codeUri) || '';
        if (!core_1.lodash.isEmpty((_b = functionConfig.customRuntimeConfig) === null || _b === void 0 ? void 0 : _b.command)) {
            // 确保是文件夹
            const codeUriStat = yield fs.stat(codeUri);
            if (!codeUriStat.isDirectory()) {
                logger_1.default.warn(`${codeUri} is not a directory and cannot simulate startup`);
                return;
            }
            // 组装文件内容
            const { command, args } = functionConfig.customRuntimeConfig;
            let fileStr = `#!/bin/bash\n${command.join(' ')}`;
            if (!core_1.lodash.isEmpty(args)) {
                fileStr += ` ${args.join(' ')}`;
            }
            // 写入文件
            const filePath = path_1.default.join(codeUri, '.s', '.fc_local_gen_bootstrap');
            yield fs.remove(filePath); // 多次执行报错没有权限
            yield core_1.fse.outputFile(filePath, fileStr, { mode: 0x755 });
            // 写入环境变量
            functionConfig.environmentVariables = Object.assign(functionConfig.environmentVariables || {}, { AGENT_SCRIPT: '.s/.fc_local_gen_bootstrap' });
            return;
        }
        const bootstrapFile = path_1.default.join(codeUri, 'bootstrap');
        try {
            const { getFileEndOfLineSequence } = yield (0, core_1.loadComponent)('devsapp/fc-core');
            const fileEndOfLineSequence = yield getFileEndOfLineSequence(bootstrapFile);
            if (typeof fileEndOfLineSequence === 'string' && fileEndOfLineSequence !== 'LF') {
                logger_1.default.warn(`The bootstrap line ending sequence was detected as ${fileEndOfLineSequence}, possibly affecting the function call. The supported format is LF.`);
            }
        }
        catch (_ex) { /* 不阻塞主程序运行 */ }
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlci1jdXN0b20uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaGFuZGxlci1jdXN0b20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4QixnREFBd0U7QUFDeEUsNkRBQXFDO0FBRXJDLDZDQUErQjtBQUUvQjs7OztHQUlHO0FBQ0gsbUJBQThCLGNBQThCOzs7UUFDMUQsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxhQUFDLENBQUMsT0FBTyxDQUFDLE1BQUEsY0FBYyxDQUFDLG9CQUFvQiwwQ0FBRSxZQUFZLENBQUMsRUFBRTtZQUNqRSxPQUFPO1NBQ1I7UUFFRCxNQUFNLE9BQU8sR0FBRyxDQUFBLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSxPQUFPLEtBQUksRUFBRSxDQUFDO1FBQzlDLElBQUksQ0FBQyxhQUFDLENBQUMsT0FBTyxDQUFDLE1BQUEsY0FBYyxDQUFDLG1CQUFtQiwwQ0FBRSxPQUFPLENBQUMsRUFBRTtZQUMzRCxTQUFTO1lBQ1QsTUFBTSxXQUFXLEdBQUcsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQzlCLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxpREFBaUQsQ0FBQyxDQUFDO2dCQUN6RSxPQUFPO2FBQ1I7WUFDRCxTQUFTO1lBQ1QsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxjQUFjLENBQUMsbUJBQW1CLENBQUM7WUFDN0QsSUFBSSxPQUFPLEdBQUcsZ0JBQWdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxJQUFJLENBQUMsYUFBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDcEIsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFBO2FBQ2hDO1lBQ0QsT0FBTztZQUNQLE1BQU0sUUFBUSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1lBQ3JFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWE7WUFDeEMsTUFBTSxVQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUN4RCxTQUFTO1lBQ1QsY0FBYyxDQUFDLG9CQUFvQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQ2pELGNBQWMsQ0FBQyxvQkFBb0IsSUFBSSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsNEJBQTRCLEVBQUUsQ0FDMUYsQ0FBQztZQUNGLE9BQU87U0FDUjtRQUNELE1BQU0sYUFBYSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3RELElBQUk7WUFDRixNQUFNLEVBQUUsd0JBQXdCLEVBQUUsR0FBRyxNQUFNLElBQUEsb0JBQWEsRUFBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzVFLE1BQU0scUJBQXFCLEdBQUcsTUFBTSx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM1RSxJQUFJLE9BQU8scUJBQXFCLEtBQUssUUFBUSxJQUFJLHFCQUFxQixLQUFLLElBQUksRUFBRTtnQkFDL0UsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsc0RBQXNELHFCQUFxQixxRUFBcUUsQ0FBQyxDQUFDO2FBQy9KO1NBQ0Y7UUFBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLGNBQWMsRUFBRTs7Q0FDakM7QUF0Q0QsNEJBc0NDIn0=