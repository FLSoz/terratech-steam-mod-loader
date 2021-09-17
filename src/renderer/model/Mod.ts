export enum ModType {
	workshop,
	local,
	ttqmm
}

export interface ModConfig {
	name?: string;
	description?: string;
	preview?: string;
	loadAfter?: string[];
	loadBefore?: string[];
	dependsOn?: string[];
}

export interface Mod {
	type: ModType;
	ID: string;
	WorkshopID: string;
	config?: ModConfig;
}
