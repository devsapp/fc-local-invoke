import { NasConfig, MountPoint } from './interface/fc-service';
export declare function convertNasConfigToNasMappings(nasBaseDir: string, nasConfig: NasConfig, serviceName: string): Promise<any>;
export declare function resolveMountPoint(mountPoint: MountPoint): any;
