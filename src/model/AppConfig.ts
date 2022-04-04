import { ModErrorType } from './CollectionValidation';

export interface AppConfig {
	closeOnLaunch: boolean;

	language: string;

	localDir: string;
	gameExec: string;
	workshopID: string;

	activeCollection?: string;

	logsDir: string;

	steamMaxConcurrency: number;
	currentPath: string;

	viewConfigs?: {
		main?: MainCollectionConfig;
		rawMods?: RawCollectionConfig;
		separated?: SeparatedCollectionConfig;
	};

	ignoredValidationErrors?: Map<ModErrorType, string[]>;
}

export interface CollectionConfig {
	ignoreBadValidation?: boolean;
}

export interface RawCollectionConfig extends CollectionConfig {
	showUpdateWarning?: boolean;
}

export interface MainCollectionConfig extends CollectionConfig {
	smallRows?: boolean;
	columnActiveConfig?: { [colID: string]: boolean };
}

export interface SeparatedCollectionConfig extends CollectionConfig {
	smallRows?: boolean;
	disableTableViews?: boolean;
}
