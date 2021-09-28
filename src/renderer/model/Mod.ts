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
	WorkshopID?: string;
	config?: ModConfig;
}
