export enum ValidChannel {
	LAUNCH_STEAM = 'launch-steam',
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
}

interface ElectronInterface {
	platform: string,
	ipcRenderer: {
		close: () => void,
		exit: (code: number) => void,
		on: (channel: ValidChannel, func: Function) => void,
		once: (channel: ValidChannel, func: Function) => void,
		removeListener: (channel: ValidChannel, listener: Function) => void,
		removeAllListeners: (channel: ValidChannel) => void,
		send: (channel: ValidChannel, ...args: any[]) => void,
		sendSync: (channel: ValidChannel, ...args: any[]) => any,
		invoke: (channel: ValidChannel, ...args: any[]) => Promise<any>
	}
}

declare global {
	interface Window {
		electron: ElectronInterface;
	}
}

export interface PathParams {
	prefixes: string[],
	path: string
}

const ipcRenderer = window.electron.ipcRenderer;

class API {
	platform: string;
	userDataPath: string | undefined;

	constructor(window: Window) {
		this.platform = window.electron.platform;
	}

	async getUserDataPath() {
		if (this.userDataPath === undefined) {
			return ipcRenderer.invoke(ValidChannel.USER_DATA_PATH)
				.then((path: string) => {this.userDataPath = path; return path});
		}
		return this.userDataPath;
	}

	close() {
		return ipcRenderer.close();
	}

	exit(code: number) {
		return ipcRenderer.exit(code);
	}

	launchSteam(steamExec: string, workshopID: string, closeOnLaunch: boolean): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.LAUNCH_STEAM, steamExec, workshopID, closeOnLaunch)
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
			pathParams = {prefixes: [], path: path};
		}
		else {
			pathParams = path;
		}
		return pathParams;
	}
	readFile(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.READ_FILE, this.convertToPathParam(path));
	}
	writeFile(path: PathParams | string, data: string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.WRITE_FILE, this.convertToPathParam(path), data);
	}
	updateFile(path: PathParams | string, data: object): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.UPDATE_FILE, this.convertToPathParam(path), data);
	}
	deleteFile(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.DELETE_FILE, this.convertToPathParam(path));
	}
	listDir(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.LIST_DIR, this.convertToPathParam(path));
	}
	listSubdirs(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.LIST_SUBDIRS, this.convertToPathParam(path));
	}
	mkdir(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.MKDIR, this.convertToPathParam(path));
	}
	exists(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.PATH_EXISTS, this.convertToPathParam(path));
	}
	access(path: PathParams | string): Promise<any> {
		return ipcRenderer.invoke(ValidChannel.PATH_ACCESS, this.convertToPathParam(path));
	}
}
export const api = new API(window);
