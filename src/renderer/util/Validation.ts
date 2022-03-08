import { api } from 'renderer/model/Api';
import { AppConfig } from '../model/AppConfig';
import { Mod, ModError, ModErrors, ModErrorType } from '../model/Mod';
import { delayForEach, ForEachProps, sleep } from './Sleep';

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
				errors[fields[index]] = `Unexpected error checking ${fields[index]} path (${paths[index]})`;
				failed = true;
			} else if (!result.value) {
				errors[fields[index]] = `Path to ${fields[index]} (${paths[index]}) was invalid`;
				failed = true;
			}
		});
		return failed;
	});

	if (failed) {
		return errors;
	}
	return {};
}

interface ModCollectionValidationProps {
	modList: string[];
	allMods: Map<string, Mod>;
	updateValidatedModsCallback?: (numValidatedMods: number) => void;
	setModErrorsCallback?: (errors: ModErrors) => void;
}

function validateMod(
	props: ForEachProps<string>,
	modList: string[],
	allMods: Map<string, Mod>,
	errors: ModErrors,
	updateValidatedModsCallback?: (numValidatedMods: number) => void
) {
	const mod: string = props.value;
	const { index } = props;
	if (mod) {
		api.logger.info(`validating ${mod}`);
		const modData = allMods.get(mod);
		if (modData) {
			const thisModErrors = [];
			if (modData.WorkshopID && !modData.subscribed) {
				thisModErrors.push({
					errorType: ModErrorType.NOT_SUBSCRIBED
				})
			}
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
						thisModErrors.push({
							errorType: ModErrorType.MISSING_DEPENDENCY,
							values: missingDependencies
						});
					}
				}
			}
			if (thisModErrors.length > 0) {
				errors[mod] = thisModErrors;
			}
		} else {
			errors[mod] = [{ errorType: ModErrorType.INVALID_ID }];
		}
	}
	if (updateValidatedModsCallback) {
		updateValidatedModsCallback(index + 1);
	}
}

function validateFunctionAsync(validationProps: ModCollectionValidationProps) {
	const { modList, allMods, updateValidatedModsCallback, setModErrorsCallback } = validationProps;
	const errors: { [id: string]: ModError[] } = {};
	return new Promise((resolve) => {
		delayForEach(modList, 1, validateMod, modList, allMods, errors, updateValidatedModsCallback)
			.then(() => {
				// eslint-disable-next-line promise/always-return
				if (Object.keys(errors).length > 0) {
					if (setModErrorsCallback) {
						setModErrorsCallback(errors);
					}
					resolve(false);
				}
				resolve(true);
			})
			.catch((error) => {
				api.logger.error(error);
				errors.undefined = error.toString();
				if (setModErrorsCallback) {
					setModErrorsCallback(errors);
				}
				resolve(false);
			});
	});
}

function validateActiveCollection(validationProps: ModCollectionValidationProps) {
	const { modList } = validationProps;

	api.logger.info('Selected mods:');
	api.logger.info(modList);
	const validationPromise = new Promise((resolve, reject) => {
		try {
			validateFunctionAsync(validationProps)
				// eslint-disable-next-line promise/always-return
				.then((isValid) => {
					resolve(isValid);
				})
				.catch((error) => {
					api.logger.error(error);
					reject(error);
				});
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
			api.logger.error(error);
			return false;
		});
}

export { validateAppConfig, validateActiveCollection };
