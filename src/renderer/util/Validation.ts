import { api } from 'renderer/model/Api';
import { AppConfig } from '../model/AppConfig';
import { Mod } from '../model/Mod';

async function validateAppConfig(config: AppConfig): Promise<{ [field: string]: string } | undefined> {
	const errors: { [field: string]: string } = {};
	const fields: ('steamExec' | 'workshopDir' | 'localDir')[] = ['steamExec', 'workshopDir', 'localDir'];
	const paths = ['Steam executable', 'TerraTech Steam Workshop directory', 'TerraTech Local Mods directory'];
	let failed = false;
	await Promise.allSettled(
		fields.map((field) => {
			return api.pathExists(config[field]);
		})
	).then((results) => {
		results.forEach((result, index) => {
			if (result.status !== 'fulfilled') {
				errors[fields[index]] = `OVERRIDE:Unexpected error checking ${fields[index]} path (${paths[index]})`;
				failed = true;
			} else if (!result.value) {
				errors[fields[index]] = `OVERRIDE:Path to ${fields[index]} (${paths[index]}) was invalid`;
				failed = true;
			}
		});
		return failed;
	});

	if (failed) {
		return errors;
	}
	return undefined;
}

function validateModsOrder(modList: Mod[], mods?: Map<string, Mod>): { [number: number]: string } | undefined {
	return undefined;
}

export { validateAppConfig, validateModsOrder };
