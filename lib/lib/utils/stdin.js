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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStdin = void 0;
const { stdin } = process;
function getStdin() {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        let result = '';
        if (stdin.isTTY) {
            return result;
        }
        stdin.setEncoding('utf8');
        try {
            for (var stdin_1 = __asyncValues(stdin), stdin_1_1; stdin_1_1 = yield stdin_1.next(), !stdin_1_1.done;) {
                const chunk = stdin_1_1.value;
                result += chunk;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (stdin_1_1 && !stdin_1_1.done && (_a = stdin_1.return)) yield _a.call(stdin_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return result;
    });
}
exports.getStdin = getStdin;
getStdin.buffer = () => __awaiter(void 0, void 0, void 0, function* () {
    var e_2, _a;
    const result = [];
    let length = 0;
    if (stdin.isTTY) {
        return Buffer.concat([]);
    }
    try {
        for (var stdin_2 = __asyncValues(stdin), stdin_2_1; stdin_2_1 = yield stdin_2.next(), !stdin_2_1.done;) {
            const chunk = stdin_2_1.value;
            result.push(chunk);
            length += chunk.length;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (stdin_2_1 && !stdin_2_1.done && (_a = stdin_2.return)) yield _a.call(stdin_2);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return Buffer.concat(result, length);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RkaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL3V0aWxzL3N0ZGluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDO0FBRXhCLFNBQXNCLFFBQVE7OztRQUM3QixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFFaEIsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFO1lBQ2hCLE9BQU8sTUFBTSxDQUFDO1NBQ2Q7UUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDOztZQUUxQixLQUEwQixJQUFBLFVBQUEsY0FBQSxLQUFLLENBQUEsV0FBQTtnQkFBcEIsTUFBTSxLQUFLLGtCQUFBLENBQUE7Z0JBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUM7YUFDaEI7Ozs7Ozs7OztRQUVELE9BQU8sTUFBTSxDQUFDOztDQUNkO0FBZEQsNEJBY0M7QUFFRCxRQUFRLENBQUMsTUFBTSxHQUFHLEdBQVMsRUFBRTs7SUFDNUIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztJQUVmLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRTtRQUNoQixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDekI7O1FBRUQsS0FBMEIsSUFBQSxVQUFBLGNBQUEsS0FBSyxDQUFBLFdBQUE7WUFBcEIsTUFBTSxLQUFLLGtCQUFBLENBQUE7WUFDckIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQztTQUN2Qjs7Ozs7Ozs7O0lBRUQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUEsQ0FBQyJ9