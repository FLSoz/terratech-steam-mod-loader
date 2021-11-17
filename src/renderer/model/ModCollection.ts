export interface ModCollection {
	name: string;
	description?: string;
	mods: string[];
}

export enum ModErrorType {
	MISSING_DEPENDENCY = 'missing_dependency',
	INVALID_ID = 'invalid_id',
	INCOMPATIBLE_MODS = 'incompatible_mods'
}

export interface ModError {
	errorType: ModErrorType;
	values?: string[];
}

export interface ModErrors {
	[id: string]: ModError;
}
