export const { platform } = window.electron;
export const DEFAULT_WORKSHOP_ID = '2655051786';
export const TT_APP_ID = '285920';

function getDefaultLocalDir(): string {
	switch (platform) {
		case 'win32':
			return 'C:\\Program Files(x86)\\Steam\\steamapps\\common\\TerraTech\\LocalMods';
			break;
		case 'darwin':
			return '~/Library/"Application Support"/Steam/steamapps/common/TerraTech/LocalMods';
			break;
		default:
			return '~/.steam/steam/SteamApps/common/TerraTech/LocalMods';
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
