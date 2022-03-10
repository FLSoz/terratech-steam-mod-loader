import { api } from 'renderer/model/Api';
import { AppConfig } from '../model/AppConfig';
import {
	Mod,
	ModError,
	ModErrors,
	ModErrorType,
	ModData,
	ModType,
} from '../model/Mod';
import { delayForEach, ForEachProps } from './Sleep';

async function validateAppConfig(
	config: AppConfig
): Promise<{ [field: string]: string } | undefined> {
	const errors: { [field: string]: string } = {};
	const fields: ('steamExec' | 'workshopDir' | 'localDir')[] = [
		'steamExec',
		'workshopDir',
		'localDir',
	];
	const paths = [
		'Steam executable',
		'TerraTech Steam Workshop directory',
		'TerraTech Local Mods directory',
	];
	let failed = false;
	await Promise.allSettled(
		fields.map((field) => {
			return api.pathExists(config[field]);
		})
	).then((results) => {
		results.forEach((result, index) => {
			if (result.status !== 'fulfilled') {
				errors[
					fields[index]
				] = `Unexpected error checking ${fields[index]} path (${paths[index]})`;
				failed = true;
			} else if (!result.value) {
				errors[
					fields[index]
				] = `Path to ${fields[index]} (${paths[index]}) was invalid`;
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
	modList: ModData[];
	allMods: Map<string, Mod>;
	updateValidatedModsCallback?: (numValidatedMods: number) => void;
	setModErrorsCallback?: (errors: ModErrors) => void;
}

function validateMod(
	props: ForEachProps<ModData>,
	modList: ModData[],
	allMods: Map<string, Mod>,
	errors: ModErrors,
	updateValidatedModsCallback?: (numValidatedMods: number) => void
) {
	const modData: ModData = props.value;
	const { index } = props;
	api.logger.info(`validating ${modData.name}`);
	const thisModErrors = [];
	if (modData.type === ModType.WORKSHOP && !modData.subscribed) {
		thisModErrors.push({
			errorType: ModErrorType.NOT_SUBSCRIBED,
		});
	}
	const dependencies = modData.dependsOn;
	if (dependencies) {
		const missingDependencies: Set<string> = new Set(dependencies);
		modList.forEach((mod: ModData) => {
			missingDependencies.delete(mod.uid);
			missingDependencies.delete(mod.id);
		});
		if (missingDependencies.size > 0) {
			thisModErrors.push({
				errorType: ModErrorType.MISSING_DEPENDENCY,
				values: [...missingDependencies],
			});
		}
	}
	if (thisModErrors.length > 0) {
		errors[modData.uid] = thisModErrors;
	}
	if (updateValidatedModsCallback) {
		updateValidatedModsCallback(index + 1);
	}
}

function validateFunctionAsync(validationProps: ModCollectionValidationProps) {
	const {
		modList,
		allMods,
		updateValidatedModsCallback,
		setModErrorsCallback,
	} = validationProps;
	const errors: { [id: string]: ModError[] } = {};
	return new Promise((resolve) => {
		delayForEach(
			modList,
			1,
			validateMod,
			modList,
			allMods,
			errors,
			updateValidatedModsCallback
		)
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

function validateActiveCollection(
	validationProps: ModCollectionValidationProps
) {
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
