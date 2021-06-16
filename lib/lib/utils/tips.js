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
exports.showTipsWithDomainIfNecessary = void 0;
const _ = __importStar(require("lodash"));
const logger_1 = __importDefault(require("../../common/logger"));
function showTipsWithDomainIfNecessary(customDomainConfigList, domainName) {
    if (!domainName && !_.isEmpty(customDomainConfigList)) {
        showLocalStartNextTips(customDomainConfigList);
    }
}
exports.showTipsWithDomainIfNecessary = showTipsWithDomainIfNecessary;
function showLocalStartNextTips(customDomainConfigList) {
    const startCommand = customDomainConfigList.map(cur => `s local start ${cur.domainName}`);
    const debugCommand = customDomainConfigList.map(cur => `s local start -d 3000 ${cur.domainName}`);
    const startTip = `${startCommand.join('\n* ')}`;
    const debugTip = `${debugCommand.join('\n* ')}`;
    logger_1.default.log(`\nTips：you can also use these commands to run/debug custom domain resources:\n
Start with customDomain: \n* ${startTip}

Debug with customDomain: \n* ${debugTip}\n`, 'yellow');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlwcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvdXRpbHMvdGlwcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMENBQTRCO0FBQzVCLGlFQUF5QztBQUV6QyxTQUFnQiw2QkFBNkIsQ0FBQyxzQkFBNEMsRUFBRSxVQUFtQjtJQUM3RyxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1FBQ3JELHNCQUFzQixDQUFDLHNCQUFzQixDQUFDLENBQUM7S0FDaEQ7QUFDSCxDQUFDO0FBSkQsc0VBSUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLHNCQUE0QztJQUUxRSxNQUFNLFlBQVksR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDMUYsTUFBTSxZQUFZLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMseUJBQXlCLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBRWxHLE1BQU0sUUFBUSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0lBQ2hELE1BQU0sUUFBUSxHQUFHLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0lBRWhELGdCQUFNLENBQUMsR0FBRyxDQUFDOytCQUNrQixRQUFROzsrQkFFUixRQUFRLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN2RCxDQUFDIn0=