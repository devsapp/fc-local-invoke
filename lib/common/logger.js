"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const i18n_1 = __importDefault(require("./i18n"));
const core_1 = require("@serverless-devs/core");
class ComponentLogger {
    static setContent(content) {
        ComponentLogger.CONTENT = content;
    }
    static log(m, color) {
        core_1.Logger.log(i18n_1.default.__(m) || m, color);
    }
    static info(m) {
        core_1.Logger.info(ComponentLogger.CONTENT, i18n_1.default.__(m) || m);
    }
    static debug(m) {
        core_1.Logger.debug(ComponentLogger.CONTENT, i18n_1.default.__(m) || m);
    }
    static error(m) {
        core_1.Logger.error(ComponentLogger.CONTENT, i18n_1.default.__(m) || m);
    }
    static warning(m) {
        core_1.Logger.warn(ComponentLogger.CONTENT, i18n_1.default.__(m) || m);
    }
    static success(m) {
        core_1.Logger.log(i18n_1.default.__(m) || m, 'green');
    }
}
exports.default = ComponentLogger;
ComponentLogger.CONTENT = 'FC-LOCAL-INVOKE';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbW1vbi9sb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFDQSxrREFBMEI7QUFDMUIsZ0RBQStDO0FBRS9DLE1BQXFCLGVBQWU7SUFFaEMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPO1FBQ3JCLGVBQWUsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQ3RDLENBQUM7SUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUE2RztRQUN2SCxhQUFNLENBQUMsR0FBRyxDQUFDLGNBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDVCxhQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsY0FBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ1YsYUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLGNBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNWLGFBQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxjQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDWixhQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsY0FBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBR0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ1osYUFBTSxDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6QyxDQUFDOztBQTNCTCxrQ0E2QkM7QUE1QlUsdUJBQU8sR0FBRyxpQkFBaUIsQ0FBQyJ9