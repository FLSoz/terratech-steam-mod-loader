export enum ValidChannel {
	// app management
	EXIT = 'exit',
	CLOSE = 'close',

	// Check if game is running
	GAME_RUNNING = 'game-running',
	LAUNCH_GAME = 'launch-game',

	// IO file management
	WRITE_FILE = 'write-file',
	READ_FILE = 'read-file',
	UPDATE_FILE = 'update-file',
	DELETE_FILE = 'delete-file',
	LIST_DIR = 'list-dir',
	LIST_SUBDIRS = 'list-subdirs',
	MKDIR = 'mkdir',
	PATH_EXISTS = 'path-exists',
	PATH_ACCESS = 'path-access',

	// Return user data path
	USER_DATA_PATH = 'user-data-path',

	// Generic channel for progress change events
	PROGRESS_CHANGE = 'progress-change',

	// Mod management
	READ_MOD_METADATA = 'read-mod-metadata',
	SUBSCRIBE_MOD = 'subscribe-mod',
	UNSUBSCRIBE_MOD = 'unsubscribe-mod',
	DOWNLOAD_MOD = 'download-mod',
	MOD_REFRESH_REQUESTED = 'refresh-mod-info',

	// Config management
	READ_CONFIG = 'read-config',
	UPDATE_CONFIG = 'update-config',

	// Collection management
	READ_COLLECTION = 'read-collection',
	DELETE_COLLECTION = 'delete-collection',
	RENAME_COLLECTION = 'rename-collection',
	READ_COLLECTIONS = 'read-collections-list',
	UPDATE_COLLECTION = 'update-collection',

	// File Explorer management
	SELECT_PATH = 'select-path',

	// External go to mod details
	OPEN_MOD_PATH = 'open-mod-path',
	OPEN_MOD_BROWSER = 'open-mod-browser',
	OPEN_MOD_STEAM = 'open-mod-steam'
}

export enum ProgressTypes {
	MOD_LOAD = 'mod-load'
}

export interface PathParams {
	prefixes: string[];
	path: string;
}

export enum LogLevel {
	ERROR = 'error',
	WARN = 'warn',
	INFO = 'info',
	VERBOSE = 'verbose',
	DEBUG = 'debug',
	SILLY = 'silly'
}
