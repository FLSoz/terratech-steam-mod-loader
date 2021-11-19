import { AppConfig } from './AppConfig';
import { ModCollection } from './ModCollection';
import { Mod } from './Mod';
export declare enum ValidChannel {
    GAME_RUNNING = "game-running",
    QUERY_STEAM = "query-steam",
    LAUNCH_GAME = "launch-game",
    WRITE_FILE = "write-file",
    READ_FILE = "read-file",
    UPDATE_FILE = "update-file",
    DELETE_FILE = "delete-file",
    LIST_DIR = "list-dir",
    LIST_SUBDIRS = "list-subdirs",
    MKDIR = "mkdir",
    PATH_EXISTS = "path-exists",
    PATH_ACCESS = "path-access",
    USER_DATA_PATH = "user-data-path",
    READ_MOD_METADATA = "read-mod-metadata",
    MOD_METADATA_RESULTS = "mod-metadata-results",
    READ_CONFIG = "read-config",
    UPDATE_CONFIG = "update-config",
    READ_COLLECTION = "read-collection",
    DELETE_COLLECTION = "delete-collection",
    RENAME_COLLECTION = "rename-collection",
    COLLECTION_RESULTS = "collection-results",
    READ_COLLECTIONS = "read-collections-list",
    UPDATE_COLLECTION = "update-collection",
    SELECT_PATH = "select-path",
    SELECT_PATH_RESULT = "select-path-result"
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
declare class API {
    platform: string;
    userDataPath: string | undefined;
    logger: {
        info: (...message: any[]) => void;
        debug: (...message: any[]) => void;
        warn: (...message: any[]) => void;
        error: (...message: any[]) => void;
    };
    constructor(window: Window);
    getUserDataPath(): Promise<string>;
    close(): void;
    exit(code: number): void;
    launchGame(steamExec: string, workshopID: string, closeOnLaunch: boolean, modList: Mod[]): Promise<any>;
    gameRunning(): Promise<boolean>;
    on(channel: ValidChannel, func: Function): void;
    once(channel: ValidChannel, func: Function): void;
    removeListener(channel: ValidChannel, listener: Function): void;
    removeAllListeners(channel: ValidChannel): void;
    send(channel: ValidChannel, ...args: any[]): void;
    sendSync(channel: ValidChannel, ...args: any[]): any;
    invoke(channel: ValidChannel, ...args: any[]): Promise<any>;
    convertToPathParam(path: PathParams | string): PathParams;
    readFile(path: PathParams | string): Promise<any>;
    writeFile(path: PathParams | string, data: string): Promise<boolean>;
    updateFile(path: PathParams | string, data: object): Promise<boolean>;
    deleteFile(path: PathParams | string): Promise<boolean>;
    listDir(path: PathParams | string): Promise<any>;
    listSubdirs(path: PathParams | string): Promise<any>;
    mkdir(path: PathParams | string): Promise<boolean>;
    pathExists(path: PathParams | string): Promise<any>;
    access(path: PathParams | string): Promise<any>;
    readConfig(): Promise<AppConfig>;
    updateConfig(config: AppConfig): Promise<boolean>;
    readCollection(collection: string): void;
    readCollectionsList(): Promise<string[]>;
    updateCollection(collection: ModCollection): Promise<boolean>;
    deleteCollection(collection: string): Promise<boolean>;
    renameCollection(oldName: string, newName: string): Promise<boolean>;
}
export declare const api: API;
export {};
//# sourceMappingURL=Api.d.ts.map