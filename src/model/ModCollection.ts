import { CollectionConfig } from './AppConfig';
import { ModData } from './Mod';

export interface ModCollection {
	name: string;
	description?: string;
	mods: string[];
}

export enum CollectionViewType {
	MAIN = 'main',
	SEPARATED = 'separated',
	RAW_MODS = 'rawMods'
}

export interface CollectionViewProps {
	rows: ModData[];
	filteredRows: ModData[];
	collection: ModCollection;
	height: number;
	width: number;
	madeEdits?: boolean;
	lastValidationStatus?: boolean;
	launchingGame?: boolean;
	viewType: CollectionViewType;
	config?: CollectionConfig;
	setEnabledModsCallback: (mods: Set<string>) => any;
	setEnabledCallback: (mod: string) => any;
	setDisabledCallback: (mod: string) => any;
	getModDetails: (mod: string, modData: ModData, bigData?: boolean) => void;
}
