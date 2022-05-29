import { LogLevel } from './Api';
import { CollectionConfig } from './CollectionConfig';
import { ModErrorType } from './CollectionValidation';
import { MainCollectionConfig } from './MainCollectionView';

export enum AppConfigKeys {
	LOCAL_DIR = 'localDir',
	GAME_EXEC = 'gameExec',
	LOGS_DIR = 'logsDir',
	MANAGER_ID = 'workshopID'
}

export interface AppConfig {
	closeOnLaunch: boolean;

	language: string;

	[AppConfigKeys.LOCAL_DIR]?: string;
	[AppConfigKeys.GAME_EXEC]: string;
	[AppConfigKeys.MANAGER_ID]: bigint;

	activeCollection?: string;
	extraParams?: string;

	logLevel?: LogLevel;
	[AppConfigKeys.LOGS_DIR]: string;

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
