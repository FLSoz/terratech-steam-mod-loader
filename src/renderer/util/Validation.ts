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
}

function validateMod(modData: ModData, modList: ModData[], allMods: Map<string, Mod>, workshopToModID: Map<string, string>) {
	api.logger.debug(`validating ${modData.name}`);
	const thisModErrors = [];

	if (modData.id === modData.workshopId) {
		// we couldn't find any info on this mod
	}

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
				if (modID) {
					return modID;
				}
				return workshopID.toString();
			})
		);
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
	return thisModErrors;
}

function validateFunction(validationProps: ModCollectionValidationProps) {
	const { modList, allMods, workshopToModID } = validationProps;
	const errors: { [id: string]: ModError[] } = {};

	modList.forEach((modData: ModData) => {
		const modErrors = validateMod(modData, modList, allMods, workshopToModID);
		if (modErrors.length > 0) {
			errors[modData.uid] = modErrors;
		}
	});

	return errors;
}

function validateActiveCollection(validationProps: ModCollectionValidationProps): Promise<{ errors: ModErrors; success: boolean }> {
	const validationPromise: Promise<{ errors: ModErrors; success: boolean }> = new Promise((resolve, reject) => {
		try {
			const errors = validateFunction(validationProps);
			if (Object.keys(errors).length > 0) {
				resolve({ success: false, errors });
			}
			resolve({ success: true, errors });
		} catch (error) {
			api.logger.error(error);
			reject(error);
		}
	});
	return validationPromise;
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
