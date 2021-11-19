export interface AppConfig {
    closeOnLaunch: boolean;
    language: string;
    steamExec: string;
    localDir: string;
    workshopDir: string;
    workshopID: string;
    activeCollection?: string;
    logsDir: string;
    steamMaxConcurrency: number;
}
export interface ConfigUpdate {
    closeOnLaunch?: boolean;
    language?: string;
    steamExec?: string;
    localDir?: string;
    workshopDir?: string;
    workshopID?: string;
}
export declare const DEFAULT_CONFIG: AppConfig;
//# sourceMappingURL=AppConfig.d.ts.map