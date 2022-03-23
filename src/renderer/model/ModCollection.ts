import { ModData } from './Mod';

export interface ModCollection {
	name: string;
	description?: string;
	mods: string[];
}

export interface ModCollectionProps {
	rows: ModData[];
	filteredRows: ModData[];
	collection: ModCollection;
	height: number;
	width: number;
	madeEdits?: boolean;
	lastValidationStatus?: boolean;
	setEnabledModsCallback: (mods: Set<string>) => any;
	setEnabledCallback: (mod: string) => any;
	setDisabledCallback: (mod: string) => any;
	getModDetails: (mod: string, modData: ModData) => void;
	getModContextMenu: (mod: string, modData: ModData) => void;
}
