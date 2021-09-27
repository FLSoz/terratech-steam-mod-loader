export interface AppConfig {
	closeOnLaunch: boolean;
	language: string;
	steamExec: string;
	localDir: string;
	workshopDir: string;
	workshopID: string;
	activeCollection?: string;
}

export interface ConfigUpdate {
	closeOnLaunch?: boolean;
	language?: string;
	steamExec?: string;
	localDir?: string;
	workshopDir?: string;
	workshopID?: string;
}
