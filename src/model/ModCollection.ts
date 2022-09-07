import { CSSProperties, ReactNode } from 'react';
import { CollectionConfig } from './CollectionConfig';
import { ModData } from './Mod';

export interface ModCollection {
	name: string;
	description?: string;
	linkedId?: bigint;
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

export enum CollectionManagerModalType {
	NONE = 0,
	DESELECTING_MOD_MANAGER = 1,
	VIEW_SETTINGS = 2,
	ERRORS_FOUND = 'errors_found',
	WARNINGS_FOUND = 'warnings_found',
	IMPORT_COLLECTION = 5,
	EXPORT_COLLECTION = 6,
	WARN_OVERWRITE_COLLECTION = 7,
	EDIT_OVERRIDES = 8,
	WARN_DELETE = 9
}

export interface NotificationProps {
	placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
	message: ReactNode;
	description?: ReactNode;
	btn?: ReactNode;
	className?: string;
	closeIcon?: ReactNode;
	duration: number | null;
	key?: string;
	style?: CSSProperties;
	onClick?: () => void;
	onClose?: () => void;
	top?: number;
	bottom?: number;
}
