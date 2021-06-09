"use strict";
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
exports.mark = exports.getProfile = void 0;
const core_1 = require("@serverless-devs/core");
function getProfile(access) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield core_1.getCredential(access);
    });
}
exports.getProfile = getProfile;
function mark(source) {
    if (!source) {
        return source;
    }
    const subStr = source.slice(-4);
    return `***********${subStr}`;
}
exports.mark = mark;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvcHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxnREFBc0Q7QUFHdEQsU0FBc0IsVUFBVSxDQUFDLE1BQWU7O1FBQzlDLE9BQU8sTUFBTSxvQkFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7Q0FBQTtBQUZELGdDQUVDO0FBRUQsU0FBZ0IsSUFBSSxDQUFDLE1BQWM7SUFDakMsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUFFLE9BQU8sTUFBTSxDQUFDO0tBQUU7SUFFL0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hDLE9BQU8sY0FBYyxNQUFNLEVBQUUsQ0FBQztBQUNoQyxDQUFDO0FBTEQsb0JBS0MifQ==