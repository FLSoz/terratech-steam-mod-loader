/* eslint-disable no-bitwise */
export enum ModType {
	WORKSHOP = 'workshop',
	LOCAL = 'local',
	TTQMM = 'ttqmm'
}

export interface ModDescriptor {
	workshopIDs: Set<bigint>;
	modID?: string;
	name?: string;
}

export interface ModErrors {
	notSubscribed?: boolean;
	notInstalled?: boolean;
	needsUpdate?: boolean;
	invalidId?: boolean;
	missingDependencies?: ModDescriptor[];
	incompatibleMods?: string[];
}

export interface CollectionErrors {
	[id: string]: ModErrors;
}

export interface ModData {
	uid: string;
	id: string | null;
	workshopID?: bigint;
	path?: string;
	type: ModType;
	preview?: string;
	name?: string;
	description?: string;
	authors?: string[];
	dependsOn?: ModDescriptor[];
	hasCode?: boolean;
	isDependencyFor?: ModDescriptor[]; // Mod IDs it's dependency for. Workshop IDs if mod ID unknown
	tags?: string[];
	errors?: ModErrors;

	// For managing of non-subscribed mods
	subscribed?: boolean;
	downloading?: boolean;
	downloadPending?: boolean;
	needsUpdate?: boolean;
	installed?: boolean;

	lastUpdate?: Date;
	dateAdded?: Date;
	size?: number;

	// Mod data
	steamDependencies?: bigint[];
	explicitIDDependencies?: string[];
}
