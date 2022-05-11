'use strict';


export function isCustomContainerRuntime(runtime: string): boolean {
  return runtime === 'custom-container';
}

export function isCustomRuntime(runtime: string): boolean {
  return runtime === 'custom';
}

export function hackCustomRuntime(runtime) {
  if (process.env.LOCAL_INVOKE_USER_ID === 'root') {
    return { userId: 0, groupId: 0, readOnly: false };
  }

  if (isCustomRuntime(runtime)) {
    return { userId: 0, groupId: 0, readOnly: false };
  }

  return { userId: 10003, groupId: 10003, readOnly: true };
}
