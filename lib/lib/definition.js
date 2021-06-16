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
exports.includeHttpTrigger = exports.checkCustomDomainConfig = exports.getRoutePathsByDomainPath = exports.parseDomainRoutePath = exports.findHttpTrigger = exports.getUserIdAndGroupId = exports.isNasAutoConfig = void 0;
const _ = __importStar(require("lodash"));
const logger_1 = __importDefault(require("../common/logger"));
const js_yaml_1 = __importDefault(require("js-yaml"));
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
            logger_1.default.info(stdout_formatter_1.default.stdoutFormatter.using('trigger for start', js_yaml_1.default.dump(triggerConfig)));
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
function includeHttpTrigger(triggerConfigList) {
    for (const triggerConfig of triggerConfigList) {
        if (triggerConfig.type === 'http') {
            return true;
        }
    }
    return false;
}
exports.includeHttpTrigger = includeHttpTrigger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvZGVmaW5pdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EsMENBQTRCO0FBQzVCLDhEQUFzQztBQUN0QyxzREFBMkI7QUFDM0Isb0ZBQTJEO0FBRTNELFNBQWdCLGVBQWUsQ0FBQyxTQUE2QjtJQUMzRCxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLFdBQVcsRUFBRSxLQUFLLE1BQU0sRUFBRTtRQUFFLE9BQU8sSUFBSSxDQUFDO0tBQUU7SUFDakYsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBSEQsMENBR0M7QUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxTQUE2QjtJQUMvRCxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFBRSxPQUFPLEVBQUUsQ0FBQztLQUFFO0lBRXhDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLEtBQUssTUFBTSxFQUFFO1FBQy9ELE9BQU87WUFDTCxNQUFNLEVBQUUsS0FBSztZQUNiLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQztLQUNIO0lBQ0QsT0FBTztRQUNMLGFBQWE7UUFDYixNQUFNLEVBQUUsU0FBUyxDQUFDLE1BQU07UUFDeEIsYUFBYTtRQUNiLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTztLQUMzQixDQUFDO0FBQ0osQ0FBQztBQWZELGtEQWVDO0FBRUQsU0FBZ0IsZUFBZSxDQUFDLGlCQUFrQztJQUNoRSxLQUFLLE1BQU0sYUFBYSxJQUFJLGlCQUFpQixFQUFFO1FBQzdDLElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7WUFDakMsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsMEJBQWUsQ0FBQyxlQUFlLENBQUMsS0FBSyxD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