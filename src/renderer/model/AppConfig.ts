export interface AppConfig {
	closeOnLaunch: boolean;
	language: string;
	steamExec: string;
	ttDir: string;
	workshopDir: string;
	activeCollection?: string;
}

export interface ConfigUpdate {
	closeOnLaunch?: boolean;
	language?: string;
	steamExec?: string;
	ttDir?: string;
	workshopDir?: string;
}
