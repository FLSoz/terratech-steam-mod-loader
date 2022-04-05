import { CollectionConfig } from './CollectionConfig';
import { ModErrorType } from './CollectionValidation';
import { MainCollectionConfig } from './MainCollectionView';

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

	viewConfigs: {
		main?: MainCollectionConfig;
		rawMods?: RawCollectionConfig;
		separated?: SeparatedCollectionConfig;
	};

	ignoredValidationErrors: Map<ModErrorType, { [uid: string]: string[] }>;
}

export interface RawCollectionConfig extends CollectionConfig {
	showUpdateWarning?: boolean;
}

export interface SeparatedCollectionConfig extends CollectionConfig {
	smallRows?: boolean;
	disableTableViews?: boolean;
}
