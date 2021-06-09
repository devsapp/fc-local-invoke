"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultProfilePath = exports.getProfileFile = exports.getConfig = void 0;
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const i18n_1 = require("i18n");
function getConfig(key) {
    const profile = getProfileFile();
    return profile[key];
}
exports.getConfig = getConfig;
function getProfileFile() {
    let profileResult = {};
    try {
        const profileFilePath = getDefaultProfilePath();
        profileResult = js_yaml_1.default.load(fs_1.default.readFileSync(profileFilePath, 'utf8')) || {};
    }
    catch (e) {
        console.log(e);
    }
    return profileResult;
}
exports.getProfileFile = getProfileFile;
function getDefaultProfilePath() {
    return path_1.default.join(os_1.default.homedir(), '.s', 'set-config.yml');
}
exports.getDefaultProfilePath = getDefaultProfilePath;
const i18n = new i18n_1.I18n({
    locales: ['en', 'zh'],
    directory: path_1.default.join(__dirname, '..', '..', 'locales'),
});
const locale = getConfig('locale');
if (locale) {
    i18n.setLocale(locale);
}
else {
    i18n.setLocale('en');
}
exports.default = i18n;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tb24vaTE4bi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw0Q0FBb0I7QUFDcEIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixzREFBMkI7QUFDM0IsK0JBQTRCO0FBRTVCLFNBQWdCLFNBQVMsQ0FBQyxHQUFXO0lBQ2pDLE1BQU0sT0FBTyxHQUFHLGNBQWMsRUFBRSxDQUFDO0lBQ2pDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUFIRCw4QkFHQztBQUdELFNBQWdCLGNBQWM7SUFDMUIsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFBO0lBQ3RCLElBQUk7UUFDQSxNQUFNLGVBQWUsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO1FBQ2hELGFBQWEsR0FBRyxpQkFBSSxDQUFDLElBQUksQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztLQUM3RTtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNsQjtJQUVELE9BQU8sYUFBYSxDQUFDO0FBQ3pCLENBQUM7QUFWRCx3Q0FVQztBQUdELFNBQWdCLHFCQUFxQjtJQUNqQyxPQUFPLGNBQUksQ0FBQyxJQUFJLENBQUMsWUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzNELENBQUM7QUFGRCxzREFFQztBQUVELE1BQU0sSUFBSSxHQUFHLElBQUksV0FBSSxDQUFDO0lBQ2xCLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDckIsU0FBUyxFQUFFLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDO0NBQ3pELENBQUMsQ0FBQztBQUdILE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNuQyxJQUFJLE1BQU0sRUFBRTtJQUNSLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDMUI7S0FBTTtJQUNILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDeEI7QUFFRCxrQkFBZSxJQUFJLENBQUMifQ==