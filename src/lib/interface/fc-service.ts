export interface ServiceConfig {
  name: string;
  description?: string;
  internetAccess?: boolean;
  logConfig?: LogConfig;
  role?: string;
  vpcConfig?: VpcConfig;
  nasConfig?: NasConfig;
}

export interface LogConfig {
  project: string;
  logstore: string;
}

export interface VpcConfig {
  securityGroupId: string;
  vswitchIds: string[];
  vpcId?: string;
}

export interface NasConfig {
  userId?: number;
  groupId?: number;
  mountPoints: MountPoint[];
}

export interface MountPoint {
  serverAddr?: string;
  nasDir: string;
  fcDir: string;
}
