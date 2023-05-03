import { AppConfig } from 'model';

export const { platform } = window.electron;
export const DEFAULT_WORKSHOP_ID = BigInt(2790161231);
export const TT_APP_ID = '285920';

export function IsMac(): boolean {
	return platform === 'darwin';
}

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

function getDefaultExecutablePath(): string {
	switch (platform) {
		case 'win32':
			return `C:\\Program Files(x86)\\Steam\\steamapps\\common\\TerraTech\\TerraTechWin64.exe`;
			break;
		case 'darwin':
			return `~/Library/"Application Support"/Steam/steamapps/common/TerraTech/TerraTechOSX64.app`;
			break;
		default:
			return '';
	}
}
export const DEFAULT_GAME_EXEC = getDefaultExecutablePath();

export const DEFAULT_CONFIG: AppConfig = {
	// localDir: 'E:\\Steam\\steamapps\\common\\TerraTech\\LocalMods',
	// workshopDir: `E:\\Steam\\steamapps\\workshop\\content\\285920`,
	gameExec: DEFAULT_GAME_EXEC,
	workshopID: DEFAULT_WORKSHOP_ID,

	logsDir: '',

	closeOnLaunch: false,
	language: 'english',
	activeCollection: undefined,
	steamMaxConcurrency: 5,

	currentPath: 'collections/main',

	viewConfigs: {},

	ignoredValidationErrors: new Map(),

	userOverrides: new Map()
};
