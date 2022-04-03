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
	};

	ignoredValidationErrors?: Map<ModErrorType, string[]>;
}

export enum MainType {
	SINGLE = 0,
	DOUBLE = 1
}

export interface CollectionConfig {
	ignoreBadValidation?: boolean;
}

export interface RawCollectionConfig extends CollectionConfig {
	showUpdateWarning?: boolean;
}

export interface MainCollectionConfig extends CollectionConfig {
	viewType?: MainType;
	smallRows?: boolean;
	columnActiveConfig?: { [colID: string]: boolean };
}
