import { AppConfig } from 'model';

export const { platform } = window.electron;
export const DEFAULT_WORKSHOP_ID = '2655051786';
export const TT_APP_ID = '285920';

function getDefaultLocalDir(): string {
	switch (platform) {
		case 'win32':
			return 'C:\\Program Files(x86)\\Steam\\steamapps\\common\\TerraTech';
			break;
		case 'darwin':
			return '~/Library/"Application Support"/Steam/steamapps/common/TerraTech';
			break;
		default:
			return '~/.steam/steam/SteamApps/common/TerraTech';
	}
}
export const DEFAULT_LOCAL_DIR = getDefaultLocalDir();

function getDefaultWorkshopDir(): string {
	switch (platform) {
		case 'win32':
			return `C:\\Program Files(x86)\\Steam\\steamapps\\workshop\\content\\${TT_APP_ID}`;
			break;
		case 'darwin':
			return `~/Library/"Application Support"/Steam/steamapps/workshop/content/${TT_APP_ID}`;
			break;
		default:
			return `~/.steam/steam/SteamApps/workshop/content/${TT_APP_ID}`;
	}
}
export const DEFAULT_WORKSHOP_DIR = getDefaultWorkshopDir();

export const DEFAULT_CONFIG: AppConfig = {
	// localDir: 'E:\\Steam\\steamapps\\common\\TerraTech\\LocalMods',
	// workshopDir: `E:\\Steam\\steamapps\\workshop\\content\\285920`,

	localDir: DEFAULT_LOCAL_DIR,
	gameExec: '',
	workshopID: DEFAULT_WORKSHOP_ID,

	logsDir: '',

	closeOnLaunch: false,
	language: 'english',
	activeCollection: undefined,
	steamMaxConcurrency: 5,

	currentPath: 'collections/main',

	viewConfigs: {}
};
