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
exports.includeHttpTrigger = exports.checkCustomDomainConfig = exports.getRoutePathsByDomainPath = exports.parseDomainRoutePath = exports.findHttpTrigger = exports.getUserIdAndGroupId = exports.isNasAutoConfig = void 0;
const core_1 = require("@serverless-devs/core");
const js_yaml_1 = __importDefault(require("js-yaml"));
const _ = __importStar(require("lodash"));
const logger_1 = __importDefault(require("../common/logger"));
const stdout_formatter_1 = __importDefault(require("./component/stdout-formatter"));
function isNasAutoConfig(nasConfig) {
    if (_.isString(nasConfig) && nasConfig.toLowerCase() === 'auto') {
        return true;
    }
    return false;
}
exports.isNasAutoConfig = isNasAutoConfig;
function getUserIdAndGroupId(nasConfig) {
    if (_.isEmpty(nasConfig)) {
        return {};
    }
    if (_.isString(nasConfig) && nasConfig.toLowerCase() === 'auto') {
        return {
            userId: 10003,
            groupId: 10003
        };
    }
    return {
        // @ts-ignore
        userId: nasConfig.userId,
        // @ts-ignore
        groupId: nasConfig.groupId
    };
}
exports.getUserIdAndGroupId = getUserIdAndGroupId;
function findHttpTrigger(triggerConfigList) {
    for (const triggerConfig of triggerConfigList) {
        if (triggerConfig.type === 'http') {
            logger_1.default.info(stdout_formatter_1.default.stdoutFormatter.using('trigger for start', ''));
            logger_1.default.log(js_yaml_1.default.dump(triggerConfig));
            return triggerConfig;
        }
    }
    return null;
}
exports.findHttpTrigger = findHttpTrigger;
function parseDomainRoutePath(domainRoutePath, customDomainConfigList, httpTriggerPath) {
    return __awaiter(this, void 0, void 0, function* () {
        let domainName = null;
        let routePath = null;
        // 由于默认是 customDomain，所以预留系统字段模拟fc系统路径
        if (domainRoutePath === 'system') {
            return [null, null];
        }
        if (!domainRoutePath) {
            if (_.isEmpty(customDomainConfigList)) {
                return [null, null];
            }
            if (customDomainConfigList.length === 1) {
                domainName = customDomainConfigList[0].domainName;
            }
            else {
                const domainNames = customDomainConfigList.map(({ domainName }) => domainName);
                const systemKey = `system [${httpTriggerPath}]`;
                domainNames.unshift(systemKey);
                domainName = (yield core_1.inquirer.prompt({
                    type: 'list',
                    name: 'domainName',
                    message: 'Please select a domain name(system is the system path of FC): ',
                    choices: domainNames,
                })).domainName;
                if (domainName === systemKey) {
                    return [null, null];
                }
            }
            return [domainName, null];
        }
        const index = domainRoutePath.indexOf('/');
        if (index < 0) {
            domainName = domainRoutePath;
        }
        else {
            domainName = domainRoutePath.substring(0, index);
            routePath = domainRoutePath.substring(index);
        }
        return [domainName, routePath];
    });
}
exports.parseDomainRoutePath = parseDomainRoutePath;
function getRoutePathsByDomainPath(customDomainConfigList, domainName, routePath) {
    if (_.isEmpty(customDomainConfigList) || !domainName) {
        return [];
    }
    let customDomainConfig;
    for (const domain of customDomainConfigList) {
        if (domain.domainName === domainName) {
            customDomainConfig = domain;
            break;
        }
    }
    if (!customDomainConfig) {
        throw new Error(`Custom domain ${domainName} dose not exist in your s.yml/yaml`);
    }
    const routeConfigList = customDomainConfig.routeConfigs;
    return getRoutePaths(routeConfigList, routePath);
}
exports.getRoutePathsByDomainPath = getRoutePathsByDomainPath;
function getRoutePaths(routeConfigList, routePath) {
    if (routePath && !_.includes(routeConfigList.map((r) => r.path), routePath)) {
        throw new Error(`can't find ${routePath} in Routes definition`);
    }
    const routePaths = [];
    for (const routeConfig of routeConfigList) {
        routePaths.push(routeConfig.path);
    }
    return routePath ? routePaths.filter(f => { return f === routePath; }) : routePaths;
}
function checkCustomDomainConfig(serviceName, functionName, customDomainConfigList, domainName) {
    const filteredCustomDomainConfig = customDomainConfigList.filter((c) => c.domainName === domainName);
    if (filteredCustomDomainConfig.length > 1) {
        throw new Error(`Duplicate custom domain: ${domainName} in your s.yml/yaml with service/function: ${serviceName}/${functionName}.`);
    }
    const customDomainConfig = filteredCustomDomainConfig[0];
    const serviceNamesInRoute = customDomainConfig.routeConfigs.map((r) => r.serviceName || serviceName);
    const functionNamesInRoute = customDomainConfig.routeConfigs.map((r) => r.functionName || functionName);
    if (!_.includes(serviceNamesInRoute, serviceName) || !_.includes(functionNamesInRoute, functionName)) {
        throw new Error(`can't find ${serviceName}/${functionName} in routeConfigs under domain: ${domainName}.`);
    }
}
exports.checkCustomDomainConfig = checkCustomDomainConfig;
function includeHttpTrigger(triggerConfigList) {
    for (const triggerConfig of triggerConfigList) {
        if (triggerConfig.type === 'http') {
            return true;
        }
    }
    return false;
}
exports.includeHttpTrigger = includeHttpTrigger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvZGVmaW5pdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUFpRDtBQUNqRCxzREFBMkI7QUFJM0IsMENBQTRCO0FBQzVCLDhEQUFzQztBQUN0QyxvRkFBMkQ7QUFFM0QsU0FBZ0IsZUFBZSxDQUFDLFNBQTZCO0lBQzNELElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLEtBQUssTUFBTSxFQUFFO1FBQUUsT0FBTyxJQUFJLENBQUM7S0FBRTtJQUNqRixPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFIRCwwQ0FHQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLFNBQTZCO0lBQy9ELElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUFFLE9BQU8sRUFBRSxDQUFDO0tBQUU7SUFFeEMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxNQUFNLEVBQUU7UUFDL0QsT0FBTztZQUNMLE1BQU0sRUFBRSxLQUFLO1lBQ2IsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO0tBQ0g7SUFDRCxPQUFPO1FBQ0wsYUFBYTtRQUNiLE1BQU0sRUFBRSxTQUFTLENBQUMsTUFBTTtRQUN4QixhQUFhO1FBQ2IsT0FBTyxFQUFFLFNBQVMsQ0FBQyxPQUFPO0tBQzNCLENBQUM7QUFDSixDQUFDO0FBZkQsa0RBZUM7QUFFRCxTQUFnQixlQUFlLENBQUMsaUJBQWtDO0lBQ2hFLEtBQUssTUFBTSxhQUFhLElBQUksaUJBQWlCLEVBQUU7UUFDN0MsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtZQUNqQyxnQkFBTSxDQUFDLElBQUksQ0FBQyww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