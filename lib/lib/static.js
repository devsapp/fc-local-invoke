"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVOKE_HELP_INFO = exports.START_HELP_INFO = exports.COMPONENT_HELP_INFO = void 0;
exports.COMPONENT_HELP_INFO = [
    {
        header: 'fc-local-invoke component',
        content: 'Run your serverless application locally for quick development & testing.',
    },
    {
        header: 'Usage',
        content: '$ s <command> <options>',
    },
    {
        header: 'Command List',
        content: [
            { name: 'help', summary: 'Display help information.' },
            { name: 'invoke', summary: 'Invoke alicloud fc event function locally.' },
            { name: 'start', summary: 'Invoke alicloud fc http function locally.' },
        ],
    },
    {
        header: 'Global Options',
        optionList: [
            {
                name: 'help',
                description: 'Display help for command.',
                alias: 'h',
                type: Boolean,
            },
        ],
    },
    {
        header: 'Examples',
        content: [
            '$ s {bold invoke} {bold --help}',
            '$ s {bold start} {bold --help}',
        ],
    },
];
exports.START_HELP_INFO = [
    {
        header: 'Local Start',
        content: 'Local invoke fc http function',
    },
    {
        header: 'Usage for fc component',
        content: '$ s local start <options>',
    },
    {
        header: 'Usage for fc-local-invoke component',
        content: '$ s start <options>',
    },
    {
        header: 'Options',
        optionList: [
            {
                name: 'config',
                typeLabel: '{underline ide/debugger}',
                description: `Select which IDE to use when debugging and output related debug config tips for the IDE. Options：'vscode', 'pycharm'.`,
                alias: 'c',
                type: String,
            },
            {
                name: 'debug-port',
                typeLabel: '{underline <port>}',
                description: 'Specify the sandboxed container starting in debug mode, and exposing this port on localhos.',
                alias: 'd',
                type: Number,
            },
            {
                name: 'debug-args',
                typeLabel: '{underline <debugArgs>}',
                description: 'Additional parameters that will be passed to the debugger',
                type: String,
            },
            {
                name: 'debugger-path',
                typeLabel: '{underline <debuggerPath>}',
                description: 'The path of the debugger on the host',
                type: String,
            },
            {
                name: 'tmp-dir',
                typeLabel: '{underline <tmpDir>}',
                description: `The temp directory mounted to /tmp , default to './.s/tmp/invoke/serviceName/functionName/'`,
                type: String,
            },
        ],
    },
    {
        header: 'Global Options',
        optionList: [
            {
                name: 'help',
                description: 'Display help for command.',
                alias: 'h',
                type: Boolean,
            },
        ],
    },
    {
        header: 'Examples with Yaml for fc component',
        content: [
            '$ s {bold local start} [{bold --debug-port} {underline 9000}] [{bold --config} {underline vscode}]',
            '$ s exec -- {bold local start} [{bold --debug-port} {underline 9000}] [{bold --config} {underline vscode}]',
        ],
    },
    {
        header: 'Examples with Yaml for fc-local-invoke component',
        content: [
            '$ s {bold start} [{bold --debug-port} {underline 9000}] [{bold --config} {underline vscode}]',
            '$ s exec -- {bold start} [{bold --debug-port} {underline 9000}] [{bold --config} {underline vscode}]',
        ],
    },
];
exports.INVOKE_HELP_INFO = [
    {
        header: 'Local Invoke',
        content: 'Local invoke fc event function',
    },
    {
        header: 'Usage for fc component',
        content: '$ s local invoke <options>',
    },
    {
        header: 'Usage for fc-local-invoke component',
        content: '$ s invoke <options>',
    },
    {
        header: 'Options',
        optionList: [
            {
                name: 'event',
                typeLabel: '{underline <event>}',
                description: `Support Event data(strings) or a file containing event data passed to the function during invocation.`,
                alias: 'e',
                type: String,
            },
            {
                name: 'event-file',
                typeLabel: '{underline <path>}',
                description: `A file containing event data passed to the function during invoke.`,
                alias: 'f',
                type: String,
            },
            {
                name: 'event-stdin',
                description: `Read from standard input, to support script pipeline.`,
                alias: 's',
                type: Boolean,
            },
            {
                name: 'mode',
                typeLabel: '{underline <mode>}',
                description: `Invoke mode, including api, server and normal:
          - api: start api server for invokeFunction api invoking.
          - server: start server container for invoking function in the other terminal repeatedly.
          - normal: default mode, invoke event function and then close the container.`,
                alias: 'm',
                type: String,
            },
            {
                name: 'config',
                typeLabel: '{underline ide/debugger}',
                description: `Select which IDE to use when debugging and output related debug config tips for the IDE. Options：'vscode', 'pycharm'.`,
                alias: 'c',
                type: String,
            },
            {
                name: 'debug-port',
                typeLabel: '{underline <port>}',
                description: 'Specify the sandboxed container starting in debug mode, and exposing this port on localhos.',
                alias: 'd',
                type: Number,
            },
            {
                name: 'debug-args',
                typeLabel: '{underline <debugArgs>}',
                description: 'Additional parameters that will be passed to the debugger',
                type: String,
            },
            {
                name: 'debugger-path',
                typeLabel: '{underline <debuggerPath>}',
                description: 'The path of the debugger on the host',
                type: String,
            },
            {
                name: 'tmp-dir',
                typeLabel: '{underline <tmpDir>}',
                description: `The temp directory mounted to /tmp , default to './.s/tmp/invoke/serviceName/functionName/'`,
                type: String,
            },
        ],
    },
    {
        header: 'Global Options',
        optionList: [
            {
                name: 'help',
                description: 'Display help for command.',
                alias: 'h',
                type: Boolean,
            },
        ],
    },
    {
        header: 'Examples with Yaml for fc component',
        content: [
            '$ s {bold local invoke} [{bold --debug-port} {underline 9000}] [{bold --config} {underline vscode}]',
            '$ s exec -- {bold local invoke} [{bold --debug-port} {underline 9000}] [{bold --config} {underline vscode}]',
        ],
    },
    {
        header: 'Examples with Yaml for fc-local-invoke component',
        content: [
            '$ s {bold invoke} [{bold --debug-port} {underline 9000}] [{bold --config} {underline vscode}]',
            '$ s exec -- {bold invoke} [{bold --debug-port} {underline 9000}] [{bold --config} {underline vscode}]',
        ],
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9zdGF0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ2EsUUFBQSxtQkFBbUIsR0FBRztJQUNqQztRQUNFLE1BQU0sRUFBRSwyQkFBMkI7UUFDbkMsT0FBTyxFQUFFLDBFQUEwRTtLQUNwRjtJQUNEO1FBQ0UsTUFBTSxFQUFFLE9BQU87UUFDZixPQUFPLEVBQUUseUJBQXlCO0tBQ25DO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsY0FBYztRQUN0QixPQUFPLEVBQUU7WUFDUCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFO1lBQ3RELEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsNENBQTRDLEVBQUU7WUFDekUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRTtTQUN4RTtLQUNGO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsZ0JBQWdCO1FBQ3hCLFVBQVUsRUFBRTtZQUNWO2dCQUNFLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSwyQkFBMkI7Z0JBQ3hDLEtBQUssRUFBRSxHQUFHO2dCQUNWLElBQUksRUFBRSxPQUFPO2FBQ2Q7U0FDRjtLQUNGO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsVUFBVTtRQUNsQixPQUFPLEVBQUU7WUFDUCxpQ0FBaUM7WUFDakMsZ0NBQWdDO1NBQ2pDO0tBQ0Y7Q0FDRixDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUc7SUFDN0I7UUFDRSxNQUFNLEVBQUUsYUFBYTtRQUNyQixPQUFPLEVBQUUsK0JBQStCO0tBQ3pDO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsd0JBQXdCO1FBQ2hDLE9BQU8sRUFBRSwyQkFBMkI7S0FDckM7SUFDRDtRQUNFLE1BQU0sRUFBRSxxQ0FBcUM7UUFDN0MsT0FBTyxFQUFFLHFCQUFxQjtLQUMvQjtJQUNEO1FBQ0UsTUFBTSxFQUFFLFNB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