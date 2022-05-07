'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCORSHeaders = void 0;
const _ = require('lodash');
const HeaderDate = 'Date';
const RequestID = 'X-Fc-Request-Id';
const CORSMaxAgeSeconds = '3600';
// InvocationError header key for invocation error type header
const InvocationError = 'x-fc-error-type';
// InvocationLogResult header key for log result of the invocation
const InvocationLogResult = 'x-fc-log-result';
// MaxMemoryUsage defines the usage of fc invocation
const MaxMemoryUsage = 'x-fc-max-memory-usage';
// InvocationDuration defines the duration of fc invocation
const InvocationDuration = 'x-fc-invocation-duration';
// InvocationCodeChecksum header key for code checksum of the invocation
const InvocationCodeChecksum = 'x-fc-code-checksum';
// InvocationCodeVersion header key for code version of the invocation
const InvocationCodeVersion = 'x-fc-invocation-code-version';
const exposedHeaders = [HeaderDate, RequestID, InvocationError, InvocationCodeChecksum, InvocationDuration, MaxMemoryUsage, InvocationLogResult, InvocationCodeVersion];
const CORSExposedHeaders = _.join(exposedHeaders, ',');
function setCORSHeaders(req, res, next) {
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    if (req.headers['access-control-request-method']) {
        res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
    }
    if (req.headers['access-control-request-headers']) {
        res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
    }
    res.header('Access-Control-Expose-Headers', CORSExposedHeaders);
    if (_.toLower(req.method) === 'options') {
        res.header('Access-Control-Max-Age', CORSMaxAgeSeconds);
        // intercept OPTIONS method
        res.sendStatus(200);
    }
    else {
        return next();
    }
}
exports.setCORSHeaders = setCORSHeaders;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvY29ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7OztBQUViLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUU1QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUM7QUFFMUIsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUM7QUFFcEMsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUM7QUFFakMsOERBQThEO0FBQzlELE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDO0FBRTFDLGtFQUFrRTtBQUNsRSxNQUFNLG1CQUFtQixHQUFHLGlCQUFpQixDQUFDO0FBRTlDLG9EQUFvRDtBQUNwRCxNQUFNLGNBQWMsR0FBRyx1QkFBdUIsQ0FBQztBQUUvQywyREFBMkQ7QUFDM0QsTUFBTSxrQkFBa0IsR0FBRywwQkFBMEIsQ0FBQztBQUN0RCx3RUFBd0U7QUFFeEUsTUFBTSxzQkFBc0IsR0FBRyxvQkFBb0IsQ0FBQztBQUNwRCxzRUFBc0U7QUFDdEUsTUFBTSxxQkFBcUIsR0FBRyw4QkFBOEIsQ0FBQztBQUU3RCxNQUFNLGNBQWMsR0FBRyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0FBRXhLLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFFdkQsU0FBZ0IsY0FBYyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSTtJQUUzQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUNsQyxJQUFJLE1BQU0sRUFBRTtRQUNWLEdBQUcsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDbkQ7SUFFRCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUMsRUFBRTtRQUNoRCxHQUFHLENBQUMsTUFBTSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDO0tBQzFGO0lBRUQsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLEVBQUU7UUFDakQsR0FBRyxDQUFDLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztLQUMzRjtJQUVELEdBQUcsQ0FBQyxNQUFNLENBQUMsK0JBQStCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUVoRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLFNBQVMsRUFBRTtRQUN2QyxHQUFHLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDeEQsMkJBQTJCO1FBQzNCLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDckI7U0FBTTtRQUNMLE9BQU8sSUFBSSxFQUFFLENBQUM7S0FDZjtBQUNILENBQUM7QUF4QkQsd0NBd0JDIn0=