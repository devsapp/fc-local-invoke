"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mark = void 0;
function mark(source) {
    if (!source) {
        return source;
    }
    const subStr = source.slice(-4);
    return `***********${subStr}`;
}
exports.mark = mark;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvcHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxTQUFnQixJQUFJLENBQUMsTUFBYztJQUNqQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQUUsT0FBTyxNQUFNLENBQUM7S0FBRTtJQUUvQixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEMsT0FBTyxjQUFjLE1BQU0sRUFBRSxDQUFDO0FBQ2hDLENBQUM7QUFMRCxvQkFLQyJ9