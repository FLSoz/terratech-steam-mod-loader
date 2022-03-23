import { stringify } from 'querystring';
import { api } from 'renderer/model/Api';
import { AppConfig } from '../model/AppConfig';
import { Mod, ModError, ModErrors, ModErrorType, ModData, ModType } from '../model/Mod';
import { delayForEach, ForEachProps } from './Sleep';

async function validateAppConfig(config: AppConfig): Promise<{ [field: string]: string } | undefined> {
	const errors: { [field: string]: string } = {};
	const fields: ('gameExec' | 'localDir')[] = ['gameExec', 'localDir'];
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
	modList: ModData[];
	allMods: Map<string, Mod>;
	workshopToModID: Map<string, string>;
	updateValidatedModsCallback?: (numValidatedMods: number) => void;
	setModErrorsCallback?: (errors: ModErrors) => void;
}

function validateMod(
	props: ForEachProps<ModData>,
	modList: ModData[],
	allMods: Map<string, Mod>,
	workshopToModID: Map<string, string>,
	errors: ModErrors,
	updateValidatedModsCallback?: (numValidatedMods: number) => void
) {
	const modData: ModData = props.value;
	const { index } = props;
	api.logger.debug(`validating ${modData.name}`);
	const thisModErrors = [];

	// Check subscription
	if (modData.type === ModType.WORKSHOP && !modData.subscribed) {
		thisModErrors.push({
			errorType: ModErrorType.NOT_SUBSCRIBED
		});
	}

	// Check duplicates
	modList.forEach((mod: ModData) => {
		const duplicateMods = [];
		if (mod.id === modData.id && mod.uid !== modData.uid) {
			duplicateMods.push(mod.uid);
		}
		if (duplicateMods.length > 0) {
			thisModErrors.push({
				errorType: ModErrorType.INCOMPATIBLE_MODS,
				values: duplicateMods
			});
		}
	});

	// Check dependencies
	const dependencies = modData.dependsOn;
	if (dependencies) {
		const missingDependencies: Set<string> = new Set(
			dependencies.map((workshopID: string) => {
				const modID = workshopToModID.get(workshopID);
				api.logger.debug(`Checking if workshop mod ${workshopID} was processed`);
				if (modID) {
					api.logger.debug('YES');
					return modID;
				}
				api.logger.debug('NO');
				return workshopID.toString();
			})
		);
		api.logger.debug(`Dependencies detected for ${modData.uid}: ${[...missingDependencies]}`);
		modList.forEach((mod: ModData) => {
			missingDependencies.delete(mod.id);
		});
		if (missingDependencies.size > 0) {
			api.logger.debug(`Dependencies MISSING for ${modData.uid}: ${[...missingDependencies]}`);
			thisModErrors.push({
				errorType: ModErrorType.MISSING_DEPENDENCY,
				values: [...missingDependencies]
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
	const { modList, allMods, workshopToModID, updateValidatedModsCallback, setModErrorsCallback } = validationProps;
	workshopToModID.forEach((id: string, workshopID: string) => {
		api.logger.debug(`Detected workshop mod ${workshopID} has mod ID of ${id}`);
	});
	const errors: { [id: string]: ModError[] } = {};
	return new Promise((resolve) => {
		delayForEach(modList, 1, validateMod, modList, allMods, workshopToModID, errors, updateValidatedModsCallback)
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
			api.logger.debug(`IS VALID: ${isValid}`);
			return isValid;
		})
		.catch((error) => {
			api.logger.error(error);
			return false;
		});
}

function bronKerbosch() {}

function getIncompatibilityGroups(incompatibilityMap: { [modUID: string]: string[] }): string[][] {
	const groups: string[][] = [];
	const nodeNames: string[] = Object.keys(incompatibilityMap).sort();
	const numNodes = nodeNames.length;

	// We first get a list of all the connected subcomponents
	// We only run bronKerbosch for maximal clique generation on the subcomponents that are not fully connected - that is considered rare

	const graph: { [node: number]: number[] } = {};
	Object.entries(incompatibilityMap).forEach(([modUID, neighbors]: [string, string[]]) => {
		const nodeID = nodeNames.findIndex((name: string) => name === modUID);
		graph[nodeID] = neighbors.map((neighborUID: string) => nodeNames.findIndex((name: string) => name === neighborUID));
	});

	const R: Set<number> = new Set();
	const P: Set<number> = new Set();
	const X: Set<number> = new Set();

	return groups;
}

export { validateAppConfig, validateActiveCollection, getIncompatibilityGroups };
