
export const COMPONENT_HELP_INFO = [
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

export const START_HELP_INFO = [
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

export const INVOKE_HELP_INFO = [
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