import { getCredential } from '@serverless-devs/core';
import { ICredentials } from '../common/entity';

export async function getProfile(access?: string): Promise<ICredentials> {
  return await getCredential(access);
}

export function mark(source: string): string {
  if (!source) { return source; }

  const subStr = source.slice(-4);
  return `***********${subStr}`;
}