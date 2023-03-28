'use strict';


export function isCustomContainerRuntime(runtime: string): boolean {
  return runtime === 'custom-container';
}

export function isCustomRuntime(runtime: string): boolean {
  return runtime && (runtime === 'custom' || runtime.startsWith('custom.'));
}

export function dockerRunCmdNeedPushStartRuntime(runtime: string): boolean {
  return ['go1', 'python3.10'].includes(runtime);
}
