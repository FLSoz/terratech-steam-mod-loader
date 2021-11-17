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
	author?: string;
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
}

export interface ModData {
	key: string;
	uid: string;
	id: string;
	type: ModType;
	preview?: string;
	name: string;
	description?: string;
	author?: string;
	dependsOn?: string[];
	hasCode?: boolean;
	isDependencyFor?: string[];
	tags?: string[];
}

export function convertToModData(input: Map<string, Mod>): ModData[] {
	const dependenciesMap: Map<string, Set<string>> = new Map();
	const tempMap: Map<string, ModData> = new Map();
	const workshopMap: Map<string, string> = new Map();
	[...input.values()].forEach((mod: Mod) => {
		const modData = {
			key: mod.ID,
			uid: mod.UID,
			id: mod.WorkshopID ? `${mod.WorkshopID}` : mod.ID,
			type: mod.type,
			preview: mod.config?.preview,
			name: mod.config && mod.config.name ? mod.config.name : mod.ID,
			description: mod.config?.description,
			author: mod.config?.author,
			dependsOn: mod.config?.dependsOn,
			hasCode: mod.config?.hasCode,
			tags: mod.config?.tags
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
		return rows.filter((modData) => {
			console.log(`Checking if ${searchString} matches mod ${JSON.stringify(modData, null, 2)}`);
			if (modData.name.includes(searchString)) {
				return true;
			}
			if (modData.type.includes(searchString)) {
				return true;
			}
			if (modData.author?.includes(searchString)) {
				return true;
			}
			return modData.tags?.reduce((acc: boolean, tag: string) => {
				if (acc) {
					return true;
				}
				return tag.includes(searchString);
			}, false);
		});
	}
	return rows;
}
