import { DEFAULT_WORKSHOP_ID, DEFAULT_LOCAL_DIR, DEFAULT_WORKSHOP_DIR } from '../Constants';

export interface AppConfig {
	closeOnLaunch: boolean;

	language: string;

	localDir: string;
	workshopDir: string;
	workshopID: string;

	activeCollection?: string;

	logsDir: string;

	steamMaxConcurrency: number;
	currentTab: string;
}

export interface ConfigUpdate {
	closeOnLaunch?: boolean;
	language?: string;
	localDir?: string;
	workshopDir?: string;
	workshopID?: string;
}

export const DEFAULT_CONFIG: AppConfig = {
	// localDir: 'E:\\Steam\\steamapps\\common\\TerraTech\\LocalMods',
	// workshopDir: `E:\\Steam\\steamapps\\workshop\\content\\285920`,

	localDir: DEFAULT_LOCAL_DIR,
	workshopDir: DEFAULT_WORKSHOP_DIR,

	workshopID: DEFAULT_WORKSHOP_ID,

	logsDir: '',

	closeOnLaunch: false,
	language: 'english',
	activeCollection: undefined,
	steamMaxConcurrency: 5,

	currentTab: 'main'
};
