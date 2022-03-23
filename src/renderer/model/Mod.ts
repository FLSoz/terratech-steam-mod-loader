/* eslint-disable no-bitwise */
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
	lastUpdate?: Date;
	dateAdded?: Date;
	size?: number;
	state?: UGCItemState;
}

export interface Mod {
	type: ModType;
	ID: string;
	UID: string;
	path: string;
	WorkshopID?: string;
	config?: ModConfig;
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
	path: string;
	workshopId?: string;
	type: ModType;
	preview?: string;
	name: string;
	description?: string;
	authors?: string[];
	dependsOn?: string[];
	hasCode?: boolean;
	isDependencyFor?: string[]; // Mod IDs it's dependency for. Workshop IDs if mod ID unknown
	tags?: string[];
	errors?: ModError[];

	// For managing of non-subscribed mods
	subscribed?: boolean;
	downloading?: boolean;
	downloadPending?: boolean;
	needsUpdate?: boolean;
	installed?: boolean;

	lastUpdate?: Date;
	dateAdded?: Date;
	size?: number;
	state?: UGCItemState;
}

export enum UGCItemState {
	None = 0,
	Subscribed = 1,
	LegacyItem = 2,
	Installed = 4,
	NeedsUpdate = 8,
	Downloading = 16,
	DownloadPending = 32
}

export function convertToModData(input: Map<string, Mod>): ModData[] {
	const dependenciesMap: Map<string, Set<string>> = new Map();
	const tempMap: Map<string, ModData[]> = new Map();
	const workshopMap: Map<string, string> = new Map();

	[...input.values()].forEach((mod: Mod) => {
		const modData: ModData = {
			key: mod.ID,
			uid: mod.UID,
			id: mod.ID,
			workshopId: mod.WorkshopID,
			type: mod.type,
			preview: mod.config?.preview,
			name: mod.config && mod.config.name ? mod.config.name : mod.ID,
			description: mod.config?.description,
			authors: mod.config?.authors,
			dependsOn: mod.config?.dependsOn,
			hasCode: mod.config?.hasCode,
			tags: mod.config?.tags,
			subscribed: !!mod.config?.state && !!(mod.config?.state & UGCItemState.Subscribed),
			installed: !!mod.config?.state && !!(mod.config?.state & UGCItemState.Installed),
			downloading: !!mod.config?.state && !!(mod.config?.state & UGCItemState.Downloading),
			downloadPending: !!mod.config?.state && !!(mod.config?.state & UGCItemState.DownloadPending),
			needsUpdate: !!mod.config?.state && !!(mod.config?.state & UGCItemState.NeedsUpdate),
			lastUpdate: mod.config?.lastUpdate,
			dateAdded: mod.config?.dateAdded,
			size: mod.config?.size,
			path: mod.path,
			state: mod.config?.state
		};
		const duplicateMods = tempMap.get(mod.ID);
		if (duplicateMods) {
			duplicateMods.push(modData);
		} else {
			tempMap.set(mod.ID, [modData]);
		}
		if (mod.WorkshopID) {
			workshopMap.set(mod.WorkshopID, mod.ID);
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
		const modID = workshopMap.get(dependency);
		if (modID) {
			const duplicateMods = tempMap.get(modID);
			if (duplicateMods) {
				duplicateMods.forEach((modData: ModData) => {
					modData.isDependencyFor = [...reliers];
				});
			} else {
				missingMods.push(dependency);
			}
		}
	});
	return [...tempMap.values()].flat();
}

export function filterRows(rows: ModData[], searchString: string | undefined): ModData[] {
	if (searchString && searchString.length > 0) {
		const lowerSearchString = searchString.toLowerCase();
		return rows.filter((modData) => {
			console.log(`Checking if ${lowerSearchString} matches mod ${JSON.stringify(modData, null, 2)}`);
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
