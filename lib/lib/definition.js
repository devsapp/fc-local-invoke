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
exports.checkCustomDomainConfig = exports.getRoutePathsByDomainPath = exports.parseDomainRoutePath = exports.findHttpTrigger = exports.getUserIdAndGroupId = exports.isNasAutoConfig = void 0;
const _ = __importStar(require("lodash"));
const logger_1 = __importDefault(require("../common/logger"));
const js_yaml_1 = __importDefault(require("js-yaml"));
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
            logger_1.default.info(`Trigger for start is:\n${js_yaml_1.default.dump(triggerConfig)}`);
            return triggerConfig;
        }
    }
    return null;
}
exports.findHttpTrigger = findHttpTrigger;
function parseDomainRoutePath(domainRoutePath) {
    let domainName = null;
    let routePath = null;
    if (!domainRoutePath) {
        return [];
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
    const serviceNamesInRoute = customDomainConfig.routeConfigs.map((r) => r.serviceName);
    const functionNamesInRoute = customDomainConfig.routeConfigs.map((r) => r.functionName);
    if (!_.includes(serviceNamesInRoute, serviceName) || !_.includes(functionNamesInRoute, functionName)) {
        throw new Error(`can't find ${serviceName}/${functionName} in routeConfigs under domain: ${domainName}.`);
    }
}
exports.checkCustomDomainConfig = checkCustomDomainConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvZGVmaW5pdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EsMENBQTRCO0FBQzVCLDhEQUFzQztBQUN0QyxzREFBMkI7QUFFM0IsU0FBZ0IsZUFBZSxDQUFDLFNBQTZCO0lBQzNELElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLEtBQUssTUFBTSxFQUFFO1FBQUUsT0FBTyxJQUFJLENBQUM7S0FBRTtJQUNqRixPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFIRCwwQ0FHQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLFNBQTZCO0lBQy9ELElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUFFLE9BQU8sRUFBRSxDQUFDO0tBQUU7SUFFeEMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxNQUFNLEVBQUU7UUFDL0QsT0FBTztZQUNMLE1BQU0sRUFBRSxLQUFLO1lBQ2IsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO0tBQ0g7SUFDRCxPQUFPO1FBQ0wsYUFBYTtRQUNiLE1BQU0sRUFBRSxTQUFTLENBQUMsTUFBTTtRQUN4QixhQUFhO1FBQ2IsT0FBTyxFQUFFLFNBQVMsQ0FBQyxPQUFPO0tBQzNCLENBQUM7QUFDSixDQUFDO0FBZkQsa0RBZUM7QUFFRCxTQUFnQixlQUFlLENBQUMsaUJBQWtDO0lBQ2hFLEtBQUssTUFBTSxhQUFhLElBQUksaUJBQWlCLEVBQUU7UUFDN0MsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtZQUNqQyxnQkFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsaUJBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVB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