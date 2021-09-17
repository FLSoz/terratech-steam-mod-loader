export const { platform } = window.electron as { platform: string };
export const DEFAULT_WORKSHOP_ID = '2203815768';
export const TT_APP_ID = '285920';

function getDefaultSteamExec(): string {
	switch (platform) {
		case 'win32':
			return 'C:\\Program Files(x86)\\Steam\\steam.exe';
			break;
		case 'darwin':
			return '/Applications/Steam.app';
			break;
		default:
			return '~/.steam/steam/Steam';
	}
}
export const DEFAULT_STEAM_EXEC = getDefaultSteamExec();

function getDefaultTerraTechDir(): string {
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
export const DEFAULT_TT_DIR = getDefaultTerraTechDir();

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
