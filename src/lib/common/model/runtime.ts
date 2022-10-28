'use strict';


export function isCustomContainerRuntime(runtime: string): boolean {
  return runtime === 'custom-container';
}

export function isCustomRuntime(runtime: string): boolean {
  return runtime === 'custom';
}

export function isGoRuntime(runtime: string): boolean {
  return runtime === 'go1';
}
