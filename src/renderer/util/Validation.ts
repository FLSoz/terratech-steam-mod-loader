import { api } from 'renderer/model/Api';
import { ModError, ModErrors, ModErrorType } from 'renderer/model/ModCollection';
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

interface ModCollectionValidationProps {
	modList: string[];
	allMods: Map<string, Mod>;
	updateValidatedModsCallback?: (numValidatedMods: number) => void;
	setModErrorsCallback?: (errors: ModErrors) => void;
}

function validateFunctionAsync(validationProps: ModCollectionValidationProps) {
	const { modList, allMods, updateValidatedModsCallback, setModErrorsCallback } = validationProps;
	let valid = true;
	let validatedMods = 0;
	const errors: { [id: string]: ModError } = {};
	modList.forEach((mod) => {
		if (mod) {
			const modData = allMods.get(mod);
			if (modData) {
				if (modData.config) {
					const dependencies = modData.config!.dependsOn;
					if (dependencies) {
						const missingDependencies: string[] = [];
						dependencies.forEach((dependency) => {
							if (!modList.includes(dependency)) {
								missingDependencies.push(dependency);
							}
						});
						if (missingDependencies.length > 0) {
							valid = false;
							errors[mod] = {
								errorType: ModErrorType.MISSING_DEPENDENCY,
								values: missingDependencies
							};
						}
					}
				}
			} else {
				valid = false;
				errors[mod] = { errorType: ModErrorType.INVALID_ID };
			}
		}
		validatedMods += 1;
		if (updateValidatedModsCallback) {
			updateValidatedModsCallback(validatedMods);
		}
	});
	if (!valid && setModErrorsCallback) {
		setModErrorsCallback(errors);
	}
	return valid;
}

function validateActiveCollection(validationProps: ModCollectionValidationProps) {
	const { modList } = validationProps;

	api.logger.info('Selected mods:');
	api.logger.info(modList);
	const validationPromise = new Promise((resolve, reject) => {
		try {
			const isValid = validateFunctionAsync(validationProps);
			resolve(isValid);
		} catch (error) {
			reject(error);
		}
	});
	return validationPromise
		.then((isValid) => {
			api.logger.info('IS VALID:');
			api.logger.info(isValid);
			return isValid;
		})
		.catch((error) => {
			console.error(error);
			return false;
		});
}

export { validateAppConfig, validateActiveCollection };
