/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { AppConfig, ModCollection, ModData, ValidChannel, PathParams, PathType, NLogLevel } from 'model';

interface ElectronInterface {
	platform: string;
	log: {
		info: (message: any) => void;
		debug: (message: any) => void;
		warn: (message: any) => void;
		error: (message: any) => void;
		silly: (message: any) => void;
		verbose: (message: any) => void;
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

const { ipcRenderer } = window.electron;

class API {
	platform: string;

	userDataPath: string | undefined;

	logger: {
		info: (...message: any[]) => void;
		debug: (...message: any[]) => void;
		warn: (...message: any[]) => void;
		error: (...message: any[]) => void;
		silly: (...message: any[]) => void;
		verbose: (...message: any[]) => void;
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
			silly: (message) => {
				window.electron.log.silly(message);
			},
			verbose: (message) => {
				window.electron.log.verbose(message);
			}
		};
	}

	async getUserDataPath() {
		if (this.userDataPath === undefined) {
			return ipcRenderer.invoke(ValidChannel.USER_DATA_PATH).then((path: string) => {
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
		gameExec: string,
		workshopID: string,
		closeOnLaunch: boolean,
		modList: ModData[],
		logParams?: { [loggerID: string]: NLogLevel },
		extraParams?: string
	): Promise<any> {
		const modListStr: string = modList
			.filter((modData) => modData && modData.workshopID !== BigInt(workshopID))
			.map((mod: ModData) => {
				return mod ? `[${mod.uid.toString().replaceAll(' ', ':/%20')}]` : '';
			})
			.join(',');
		let args: string[] = ['+ttsmm_mod_list', `[${modListStr}]`];
		if (logParams) {
			Object.entries(logParams).forEach(([loggerID, logLevel]: [string, NLogLevel]) => {
				args.push(loggerID && loggerID.length > 0 ? `+log_level_${loggerID}` : '+log_level');
				args.push(logLevel);
			});
		}
		if (extraParams) {
			const splitParams: string[] = extraParams.split(' ');
			args = args.concat(splitParams);
		}
		return ipcRenderer.invoke(ValidChannel.LAUNCH_GAME, gameExec, workshopID, closeOnLaunch, args);
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
	convertToPathParam(path: PathParams | string, type?: PathType): PathParams {
		let pathParams: PathParams;
		if (typeof path === 'string') {
			pathParams = { prefixes: [], path, type };
		} else {
			pathParams = path;
			if (type !== undefined) {
				pathParams.type = type;
			}
		}
		return pathParams;
	}

	readFile(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.READ_FILE, this.convertToPathParam(path));
	}

	writeFile(path: PathParams | string, data: string): Promise<boolean> {
		return ipcRenderer.invoke(ValidChannel.WRITE_FILE, this.convertToPathParam(path), data);
	}

	updateFile(path: PathParams | string, data: object): Promise<boolean> {
		return ipcRenderer.invoke(ValidChannel.UPDATE_FILE, this.convertToPathParam(path), data);
	}

	deleteFile(path: PathParams | string): Promise<boolean> {
		return ipcRenderer.invoke(ValidChannel.DELETE_FILE, this.convertToPathParam(path));
	}

	listDir(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.LIST_DIR, this.convertToPathParam(path));
	}

	listSubdirs(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.LIST_SUBDIRS, this.convertToPathParam(path));
	}

	mkdir(path: PathParams | string): Promise<boolean> {
		return ipcRenderer.invoke(ValidChannel.MKDIR, this.convertToPathParam(path));
	}

	pathExists(path: PathParams | string, type?: PathType): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.PATH_EXISTS, this.convertToPathParam(path, type));
	}

	access(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.PATH_ACCESS, this.convertToPathParam(path));
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

	renameCollection(collection: ModCollection, newName: string): Promise<boolean> {
		return ipcRenderer.invoke(ValidChannel.RENAME_COLLECTION, collection, newName);
	}

	openModBrowser(workshopID: bigint) {
		ipcRenderer.send(ValidChannel.OPEN_MOD_BROWSER, workshopID);
	}

	openModSteam(workshopID: bigint) {
		ipcRenderer.send(ValidChannel.OPEN_MOD_STEAM, workshopID);
	}
}
export default new API(window);
