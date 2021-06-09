'use strict';


export function isCustomContainerRuntime(runtime: string): boolean {
  return runtime === 'custom-container';
}