import { PathType } from 'model';
import api from 'renderer/Api';
import { platform, TT_APP_ID } from 'renderer/Constants';

// eslint-disable-next-line import/prefer-default-export
export async function validateSettingsPath(field: string, value: string): Promise<string | undefined> {
	const result: string | undefined = await api
		.pathExists(value, field === 'gameExec' ? PathType.FILE : PathType.DIRECTORY)
		.then((success) => {
			if (!success) {
				return 'Provided path is invalid';
			}
			switch (field) {
				case 'gameExec':
					if (value.toLowerCase().includes('terratech')) {
						if (platform === 'win32' && !value.endsWith('.exe')) {
							return 'Windows executables must end in .exe';
						}
						return undefined;
					}
					return "The TerraTech executable should contain 'TerraTech'";
				case 'localDir':
					if (!value || value.toLowerCase().endsWith('localmods')) {
						return undefined;
					}
					return "The local mods directory should end with 'TerraTech/LocalMods'";
				case 'workshopDir':
					if (value.endsWith(TT_APP_ID)) {
						return undefined;
					}
					return `The workshop directory should end with TT app ID 'Steam/steamapps/workshop/content/${TT_APP_ID}'`;
				case 'logsDir':
					if (value.toLowerCase().includes('logs')) {
						return undefined;
					}
					return "The logs directory should contain 'Logs'";
				default:
					return undefined;
			}
		})
		.catch((error) => {
			return error.toString();
		});
	return result;
}
