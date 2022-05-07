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
    const startCommand = customDomainConfigList.map(cur => `s local start --custom-domain ${cur.domainName}`);
    const debugCommand = customDomainConfigList.map(cur => `s local start -d 3000 --custom-domain ${cur.domainName}`);
    const startTip = `${startCommand.join('\n* ')}`;
    const debugTip = `${debugCommand.join('\n* ')}`;
    logger_1.default.log(`\nTips：you can also use these commands to run/debug custom domain resources:\n
Start with customDomain: \n* ${startTip}

Debug with customDomain: \n* ${debugTip}\n`, 'yellow');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlwcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvdXRpbHMvdGlwcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDBDQUE0QjtBQUM1QixpRUFBeUM7QUFFekMsU0FBZ0IsNkJBQTZCLENBQUMsc0JBQTRDLEVBQUUsVUFBbUI7SUFDN0csSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsRUFBRTtRQUNyRCxzQkFBc0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0tBQ2hEO0FBQ0gsQ0FBQztBQUpELHNFQUlDO0FBRUQsU0FBUyxzQkFBc0IsQ0FBQyxzQkFBNEM7SUFFMUUsTUFBTSxZQUFZLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsaUNBQWlDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQzFHLE1BQU0sWUFBWSxHQUFHLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLHlDQUF5QyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUVsSCxNQUFNLFFBQVEsR0FBRyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztJQUNoRCxNQUFNLFFBQVEsR0FBRyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztJQUVoRCxnQkFBTSxDQUFDLEdBQUcsQ0FBQzsrQkFDa0IsUUFBUTs7K0JBRVIsUUFBUSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDdkQsQ0FBQyJ9