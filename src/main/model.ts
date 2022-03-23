import { UGCItemState } from './steamworks';

export enum ModType {
	WORKSHOP = 'workshop',
	LOCAL = 'local',
	TTQMM = 'ttqmm'
}

export interface ModConfig {
	name?: string;
	description?: string;
	authors?: string[];
	hasCode?: boolean;
	preview?: string;
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
	WorkshopID: string | null;
	config?: ModConfig;
}

export interface ModCollection {
	name: string;
	description?: string;
	mods: Set<string>;
}
