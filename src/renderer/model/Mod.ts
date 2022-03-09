import { api } from "./Api";

export enum ModType {
	WORKSHOP = 'workshop',
	LOCAL = 'local',
	TTQMM = 'ttqmm'
}

export interface ModConfig {
	name?: string;
	description?: string;
	preview?: string;
	hasCode?: boolean;
	authors?: string[];
	loadAfter?: string[];
	loadBefore?: string[];
	dependsOn?: string[];
	tags?: string[];
}

export interface Mod {
	type: ModType;
	ID: string;
	UID: string;
	WorkshopID?: BigInt | null;
	config?: ModConfig;
	subscribed?: boolean;
}

export enum ModErrorType {
	MISSING_DEPENDENCY = 'missing_dependency',
	INVALID_ID = 'invalid_id',
	INCOMPATIBLE_MODS = 'incompatible_mods',
	NOT_SUBSCRIBED = 'not_subscribed'
}

export interface ModError {
	errorType: ModErrorType;
	values?: string[];
}

export interface ModErrors {
	[id: string]: ModError[];
}

export interface ModData {
	key: string;
	uid: string;
	id: string;
	type: ModType;
	preview?: string;
	name: string;
	description?: string;
	authors?: string[];
	dependsOn?: string[];
	hasCode?: boolean;
	isDependencyFor?: string[];
	tags?: string[];
	errors?: ModError[];
	subscribed?: boolean;
}

export function convertToModData(input: Map<string, Mod>): ModData[] {
	const dependenciesMap: Map<string, Set<string>> = new Map();
	const tempMap: Map<string, ModData> = new Map();
	const workshopMap: Map<string, string> = new Map();
	[...input.values()].forEach((mod: Mod) => {
		const modData: ModData = {
			key: mod.ID,
			uid: mod.UID,
			id: mod.WorkshopID ? `${mod.WorkshopID}` : mod.ID,
			type: mod.type,
			preview: mod.config?.preview,
			name: mod.config && mod.config.name ? mod.config.name : mod.ID,
			description: mod.config?.description,
			authors: mod.config?.authors,
			dependsOn: mod.config?.dependsOn,
			hasCode: mod.config?.hasCode,
			tags: mod.config?.tags,
			subscribed: mod.subscribed
		};
		tempMap.set(mod.ID, modData);
		if (mod.WorkshopID) {
			workshopMap.set(mod.WorkshopID.toString(), mod.ID);
		}
		if (modData.dependsOn) {
			modData.dependsOn.forEach((dependency) => {
				if (dependenciesMap.has(dependency)) {
					const reliers = dependenciesMap.get(dependency);
					reliers?.add(mod.ID);
				} else {
					dependenciesMap.set(dependency, new Set(mod.ID));
				}
			});
		}
	});
	const missingMods = [];
	dependenciesMap.forEach((reliers, dependency) => {
		const modData = tempMap.get(dependency);
		if (modData) {
			modData.isDependencyFor = [...reliers];
		} else {
			missingMods.push(dependency);
		}
	});
	return [...tempMap.values()];
}

export function filterRows(rows: ModData[], searchString: string | undefined): ModData[] {
	if (searchString && searchString.length > 0) {
		const lowerSearchString = searchString.toLowerCase();
		return rows.filter((modData) => {
			api.logger.info(`Checking if ${lowerSearchString} matches mod ${JSON.stringify(modData, null, 2)}`);
			if (modData.name.toLowerCase().includes(lowerSearchString)) {
				return true;
			}
			if (modData.type.toLowerCase().includes(lowerSearchString)) {
				return true;
			}
			if (
				modData.authors?.reduce((acc: boolean, tag: string) => {
					if (acc) {
						return true;
					}
					return tag.toLowerCase().includes(lowerSearchString);
				}, false)
			) {
				return true;
			}
			return modData.tags?.reduce((acc: boolean, tag: string) => {
				if (acc) {
					return true;
				}
				return tag.toLowerCase().includes(lowerSearchString);
			}, false);
		});
	}
	return rows;
}
