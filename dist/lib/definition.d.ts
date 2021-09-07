import { NasConfig } from './interface/fc-service';
import { TriggerConfig } from './interface/fc-trigger';
import { CustomDomainConfig } from './interface/fc-custom-domain';
export declare function isNasAutoConfig(nasConfig: NasConfig | string): boolean;
export declare function getUserIdAndGroupId(nasConfig: NasConfig | string): {
    userId?: undefined;
    groupId?: undefined;
} | {
    userId: any;
    groupId: any;
};
export declare function findHttpTrigger(triggerConfigList: TriggerConfig[]): TriggerConfig;
export declare function parseDomainRoutePath(domainRoutePath: string): any;
export declare function getRoutePathsByDomainPath(customDomainConfigList: CustomDomainConfig[], domainName: string, routePath: string): string[];
export declare function checkCustomDomainConfig(serviceName: string, functionName: string, customDomainConfigList: CustomDomainConfig[], domainName: string): void;
export declare function includeHttpTrigger(triggerConfigList: TriggerConfig[]): boolean;
