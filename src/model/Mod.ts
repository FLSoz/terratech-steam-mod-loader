/* eslint-disable no-bitwise */
export enum ModType {
	WORKSHOP = 'workshop',
	LOCAL = 'local',
	TTQMM = 'ttqmm',
	INVALID = 'invalid',
	DESCRIPTOR = 'descriptor'
}

export interface ModDescriptor {
	UIDs: Set<string>;
	modID?: string;
	name?: string;
}

export interface ModData {
	// Mod Info
	name?: string;
	authors?: string[];
	description?: string;
	uid: string;
	id: string | null;
	workshopID?: bigint;
	tags?: string[];

	// Mod properties
	lastUpdate?: Date;
	dateAdded?: Date;
	dateCreated?: Date;
	size?: number;
	path?: string;
	type: ModType;
	preview?: string;
	hasCode?: boolean;
	// Raw mod dependencies
	steamDependencies?: bigint[];
	explicitIDDependencies?: string[];
	// Processed descriptor dependencies
	dependsOn?: ModDescriptor[];
	isDependencyFor?: ModDescriptor[]; // Mod IDs it's dependency for. Workshop IDs if mod ID unknown

	// Mod status
	subscribed?: boolean;
	downloading?: boolean;
	downloadPending?: boolean;
	needsUpdate?: boolean;
	installed?: boolean;

	// Overrides
	overrides?: ModDataOverride;
}

export interface ModDataOverride {
	id?: string;
	tags?: string[];
}

export function getModDataId(record: ModData): string | null {
	if (record.overrides?.id) {
		return record.overrides.id;
	}
	return record.id;
}
