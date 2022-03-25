export interface AppConfig {
	closeOnLaunch: boolean;

	language: string;

	localDir: string;
	gameExec: string;
	workshopID: string;

	activeCollection?: string;

	logsDir: string;

	steamMaxConcurrency: number;
	currentPath: string;
}

export interface ConfigUpdate {
	closeOnLaunch?: boolean;
	language?: string;
	localDir?: string;
	workshopDir?: string;
	workshopID?: string;
}
