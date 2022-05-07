'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoExit = exports.unrefTimeout = void 0;
function unrefTimeout(fn, timeout) {
    if (!timeout) {
        timeout = 1500;
    }
    const t = setTimeout(fn, timeout);
    t.unref();
}
exports.unrefTimeout = unrefTimeout;
function autoExit(exitCode = 0) {
    // fix not auto exit bug after docker operation
    unrefTimeout(() => {
        // in order visitor request has been sent out
        process.exit(exitCode); // eslint-disable-line
    });
}
exports.autoExit = autoExit;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5yZWYtdGltZW91dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvdXRpbHMvdW5yZWYtdGltZW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7OztBQUViLFNBQWdCLFlBQVksQ0FBQyxFQUFPLEVBQUUsT0FBZ0I7SUFDcEQsSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUFFLE9BQU8sR0FBRyxJQUFJLENBQUM7S0FBRTtJQUVqQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRWxDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNaLENBQUM7QUFORCxvQ0FNQztBQUVELFNBQWdCLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQztJQUNuQywrQ0FBK0M7SUFDL0MsWUFBWSxDQUFDLEdBQUcsRUFBRTtRQUNoQiw2Q0FBNkM7UUFDN0MsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLHNCQUFzQjtJQUNoRCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFORCw0QkFNQztBQUFBLENBQUMifQ==