import { LogLevel } from './Api';
import { CollectionConfig } from './CollectionConfig';
import { ModErrorType } from './CollectionValidation';
import { MainCollectionConfig } from './MainCollectionView';
import { ModDataOverride } from './Mod';

export enum AppConfigKeys {
	LOCAL_DIR = 'localDir',
	GAME_EXEC = 'gameExec',
	LOGS_DIR = 'logsDir',
	MANAGER_ID = 'workshopID'
}

export enum NLogLevel {
	OFF = 'off',
	FATAL = 'fatal',
	ERROR = 'error',
	WARN = 'warn',
	INFO = 'info',
	DEBUG = 'debug',
	TRACE = 'trace'
}

export interface AppConfig {
	closeOnLaunch: boolean;

	language: string;

	pureVanilla?: boolean;

	[AppConfigKeys.LOCAL_DIR]?: string;
	[AppConfigKeys.GAME_EXEC]: string;
	[AppConfigKeys.MANAGER_ID]: bigint;

	activeCollection?: string;
	extraParams?: string;
	logParams?: { [id: string]: NLogLevel };

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

	userOverrides: Map<string, ModDataOverride>;
}

export interface RawCollectionConfig extends CollectionConfig {
	showUpdateWarning?: boolean;
}

export interface SeparatedCollectionConfig extends CollectionConfig {
	smallRows?: boolean;
	disableTableViews?: boolean;
}

export enum SettingsViewModalType {
	NONE = 0,
	LOG_EDIT = 1,
	WORKSHOP_ID_EDIT = 2
}
