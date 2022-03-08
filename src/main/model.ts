export enum ModType {
	WORKSHOP = 'workshop',
	LOCAL = 'local',
	TTQMM = 'ttqmm'
}

export interface ModConfig {
	name?: string;
	description?: string;
	author?: string;
	hasCode?: boolean;
	preview?: string;
	loadAfter?: string[];
	loadBefore?: string[];
	dependsOn?: string[];
	tags?: string[];
}
export interface Mod {
	type: ModType;
	ID: string;
	UID: string;
	WorkshopID: BigInt | null;
	config?: ModConfig;
	subscribed?: boolean;
}

export interface ModCollection {
	name: string;
	description?: string;
	mods: Set<string>;
}
