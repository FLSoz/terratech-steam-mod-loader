/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { AppConfig } from './AppConfig';
import { ModCollection } from './ModCollection';
import { Mod } from './Mod';

/* eslint-disable @typescript-eslint/ban-types */
export enum ValidChannel {
	GAME_RUNNING = 'game-running',
	QUERY_STEAM = 'query-steam',
	LAUNCH_GAME = 'launch-game',
	WRITE_FILE = 'write-file',
	READ_FILE = 'read-file',
	UPDATE_FILE = 'update-file',
	DELETE_FILE = 'delete-file',
	LIST_DIR = 'list-dir',
	LIST_SUBDIRS = 'list-subdirs',
	MKDIR = 'mkdir',
	PATH_EXISTS = 'path-exists',
	PATH_ACCESS = 'path-access',
	USER_DATA_PATH = 'user-data-path',
	READ_MOD_METADATA = 'read-mod-metadata',
	MOD_METADATA_RESULTS = 'mod-metadata-results',
	READ_CONFIG = 'read-config',
	UPDATE_CONFIG = 'update-config',
	READ_COLLECTION = 'read-collection',
	DELETE_COLLECTION = 'delete-collection',
	RENAME_COLLECTION = 'rename-collection',
	COLLECTION_RESULTS = 'collection-results',
	READ_COLLECTIONS = 'read-collections-list',
	UPDATE_COLLECTION = 'update-collection',
	SELECT_PATH = 'select-path',
	SELECT_PATH_RESULT = 'select-path-result',
}

interface ElectronInterface {
	platform: string;
	log: {
		info: (message: any) => void;
		debug: (message: any) => void;
		warn: (message: any) => void;
		error: (message: any) => void;
	};
	ipcRenderer: {
		close: () => void;
		exit: (code: number) => void;
		on: (channel: ValidChannel, func: Function) => void;
		once: (channel: ValidChannel, func: Function) => void;
		removeListener: (channel: ValidChannel, listener: Function) => void;
		removeAllListeners: (channel: ValidChannel) => void;
		send: (channel: ValidChannel, ...args: any[]) => void;
		sendSync: (channel: ValidChannel, ...args: any[]) => any;
		invoke: (channel: ValidChannel, ...args: any[]) => Promise<any>;
	};
}

declare global {
	interface Window {
		electron: ElectronInterface;
	}
}

export interface PathParams {
	prefixes: string[];
	path: string;
}

const { ipcRenderer } = window.electron;

class API {
	platform: string;

	userDataPath: string | undefined;

	logger: {
		info: (...message: any[]) => void;
		debug: (...message: any[]) => void;
		warn: (...message: any[]) => void;
		error: (...message: any[]) => void;
	};

	constructor(window: Window) {
		this.platform = window.electron.platform;
		this.logger = {
			info: (message) => {
				window.electron.log.info(message);
			},
			debug: (message) => {
				window.electron.log.debug(message);
			},
			warn: (message) => {
				window.electron.log.warn(message);
			},
			error: (message) => {
				window.electron.log.error(message);
			},
		};
	}

	async getUserDataPath() {
		if (this.userDataPath === undefined) {
			return ipcRenderer
				.invoke(ValidChannel.USER_DATA_PATH)
				.then((path: string) => {
					this.userDataPath = path;
					return path;
				});
		}
		return this.userDataPath;
	}

	close() {
		return ipcRenderer.close();
	}

	exit(code: number) {
		return ipcRenderer.exit(code);
	}

	launchGame(
		steamExec: string,
		workshopID: string,
		closeOnLaunch: boolean,
		modList: Mod[]
	): Promise<any> {
		const modListStr: string = modList
			.map((mod: Mod) => {
				const modID = mod.WorkshopID ? mod.WorkshopID : mod.ID;
				return mod
					? `[${mod.type}:${
							mod.type === 'local'
								? modID.toString().replace(' ', ':/%20')
								: modID
					  }]`
					: '';
			})
			.join(',');
		const args: string[] = ['+ttsmm_mod_list', modListStr];
		return ipcRenderer.invoke(
			ValidChannel.LAUNCH_GAME,
			steamExec,
			workshopID,
			closeOnLaunch,
			args
		);
	}

	gameRunning(): Promise<boolean> {
		return ipcRenderer.invoke(ValidChannel.GAME_RUNNING);
	}

	// IPCRenderer API
	on(channel: ValidChannel, func: Function): void {
		ipcRenderer.on(channel, func);
	}

	once(channel: ValidChannel, func: Function): void {
		ipcRenderer.once(channel, func);
	}

	removeListener(channel: ValidChannel, listener: Function): void {
		ipcRenderer.removeListener(channel, listener);
	}

	removeAllListeners(channel: ValidChannel): void {
		ipcRenderer.removeAllListeners(channel);
	}

	send(channel: ValidChannel, ...args: any[]): void {
		ipcRenderer.send(channel, ...args);
	}

	sendSync(channel: ValidChannel, ...args: any[]): any {
		return ipcRenderer.sendSync(channel, ...args);
	}

	invoke(channel: ValidChannel, ...args: any[]): Promise<any> {
		return ipcRenderer.invoke(channel, ...args);
	}

	// file API
	convertToPathParam(path: PathParams | string): PathParams {
		let pathParams: PathParams;
		if (typeof path === 'string') {
			pathParams = { prefixes: [], path };
		} else {
			pathParams = path;
		}
		return pathParams;
	}

	readFile(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(
			ValidChannel.READ_FILE,
			this.convertToPathParam(path)
		);
	}

	writeFile(path: PathParams | string, data: string): Promise<boolean> {
		return ipcRenderer.invoke(
			ValidChannel.WRITE_FILE,
			this.convertToPathParam(path),
			data
		);
	}

	updateFile(path: PathParams | string, data: object): Promise<boolean> {
		return ipcRenderer.invoke(
			ValidChannel.UPDATE_FILE,
			this.convertToPathParam(path),
			data
		);
	}

	deleteFile(path: PathParams | string): Promise<boolean> {
		return ipcRenderer.invoke(
			ValidChannel.DELETE_FILE,
			this.convertToPathParam(path)
		);
	}

	listDir(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(
			ValidChannel.LIST_DIR,
			this.convertToPathParam(path)
		);
	}

	listSubdirs(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(
			ValidChannel.LIST_SUBDIRS,
			this.convertToPathParam(path)
		);
	}

	mkdir(path: PathParams | string): Promise<boolean> {
		return ipcRenderer.invoke(
			ValidChannel.MKDIR,
			this.convertToPathParam(path)
		);
	}

	pathExists(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(
			ValidChannel.PATH_EXISTS,
			this.convertToPathParam(path)
		);
	}

	access(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(
			ValidChannel.PATH_ACCESS,
			this.convertToPathParam(path)
		);
	}

	readConfig(): Promise<AppConfig> {
		return ipcRenderer.invoke(ValidChannel.READ_CONFIG);
	}

	updateConfig(config: AppConfig): Promise<boolean> {
		return ipcRenderer.invoke(ValidChannel.UPDATE_CONFIG, config);
	}

	readCollection(collection: string): void {
		ipcRenderer.send(ValidChannel.READ_COLLECTION, collection);
	}

	readCollectionsList(): Promise<string[]> {
		return ipcRenderer.invoke(ValidChannel.READ_COLLECTIONS);
	}

	updateCollection(collection: ModCollection): Promise<boolean> {
		return ipcRenderer.invoke(ValidChannel.UPDATE_COLLECTION, collection);
	}

	deleteCollection(collection: string): Promise<boolean> {
		return ipcRenderer.invoke(ValidChannel.DELETE_COLLECTION, collection);
	}

	renameCollection(
		collection: ModCollection,
		newName: string
	): Promise<boolean> {
		return ipcRenderer.invoke(
			ValidChannel.RENAME_COLLECTION,
			collection,
			newName
		);
	}
}
export const api = new API(window);
