"use strict";
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.ValidChannel = void 0;
/* eslint-disable @typescript-eslint/ban-types */
var ValidChannel;
(function (ValidChannel) {
    ValidChannel["GAME_RUNNING"] = "game-running";
    ValidChannel["QUERY_STEAM"] = "query-steam";
    ValidChannel["LAUNCH_GAME"] = "launch-game";
    ValidChannel["WRITE_FILE"] = "write-file";
    ValidChannel["READ_FILE"] = "read-file";
    ValidChannel["UPDATE_FILE"] = "update-file";
    ValidChannel["DELETE_FILE"] = "delete-file";
    ValidChannel["LIST_DIR"] = "list-dir";
    ValidChannel["LIST_SUBDIRS"] = "list-subdirs";
    ValidChannel["MKDIR"] = "mkdir";
    ValidChannel["PATH_EXISTS"] = "path-exists";
    ValidChannel["PATH_ACCESS"] = "path-access";
    ValidChannel["USER_DATA_PATH"] = "user-data-path";
    ValidChannel["READ_MOD_METADATA"] = "read-mod-metadata";
    ValidChannel["MOD_METADATA_RESULTS"] = "mod-metadata-results";
    ValidChannel["READ_CONFIG"] = "read-config";
    ValidChannel["UPDATE_CONFIG"] = "update-config";
    ValidChannel["READ_COLLECTION"] = "read-collection";
    ValidChannel["DELETE_COLLECTION"] = "delete-collection";
    ValidChannel["RENAME_COLLECTION"] = "rename-collection";
    ValidChannel["COLLECTION_RESULTS"] = "collection-results";
    ValidChannel["READ_COLLECTIONS"] = "read-collections-list";
    ValidChannel["UPDATE_COLLECTION"] = "update-collection";
    ValidChannel["SELECT_PATH"] = "select-path";
    ValidChannel["SELECT_PATH_RESULT"] = "select-path-result";
})(ValidChannel = exports.ValidChannel || (exports.ValidChannel = {}));
const { ipcRenderer } = window.electron;
class API {
    constructor(window) {
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
            }
        };
    }
    async getUserDataPath() {
        if (this.userDataPath === undefined) {
            return ipcRenderer.invoke(ValidChannel.USER_DATA_PATH).then((path) => {
                this.userDataPath = path;
                return path;
            });
        }
        return this.userDataPath;
    }
    close() {
        return ipcRenderer.close();
    }
    exit(code) {
        return ipcRenderer.exit(code);
    }
    launchGame(steamExec, workshopID, closeOnLaunch, modList) {
        const modListStr = modList
            .map((mod) => {
            return `${mod.type}:${mod.WorkshopID ? mod.WorkshopID : mod.ID}`;
        })
            .join(',');
        const args = ['+ttsmm_mod_list', `[${modListStr}]`];
        return ipcRenderer.invoke(ValidChannel.LAUNCH_GAME, steamExec, workshopID, closeOnLaunch, args);
    }
    gameRunning() {
        return ipcRenderer.invoke(ValidChannel.GAME_RUNNING);
    }
    // IPCRenderer API
    on(channel, func) {
        ipcRenderer.on(channel, func);
    }
    once(channel, func) {
        ipcRenderer.once(channel, func);
    }
    removeListener(channel, listener) {
        ipcRenderer.removeListener(channel, listener);
    }
    removeAllListeners(channel) {
        ipcRenderer.removeAllListeners(channel);
    }
    send(channel, ...args) {
        ipcRenderer.send(channel, ...args);
    }
    sendSync(channel, ...args) {
        return ipcRenderer.sendSync(channel, ...args);
    }
    invoke(channel, ...args) {
        return ipcRenderer.invoke(channel, ...args);
    }
    // file API
    convertToPathParam(path) {
        let pathParams;
        if (typeof path === 'string') {
            pathParams = { prefixes: [], path };
        }
        else {
            pathParams = path;
        }
        return pathParams;
    }
    readFile(path) {
        return ipcRenderer.invoke(ValidChannel.READ_FILE, this.convertToPathParam(path));
    }
    writeFile(path, data) {
        return ipcRenderer.invoke(ValidChannel.WRITE_FILE, this.convertToPathParam(path), data);
    }
    updateFile(path, data) {
        return ipcRenderer.invoke(ValidChannel.UPDATE_FILE, this.convertToPathParam(path), data);
    }
    deleteFile(path) {
        return ipcRenderer.invoke(ValidChannel.DELETE_FILE, this.convertToPathParam(path));
    }
    listDir(path) {
        return ipcRenderer.invoke(ValidChannel.LIST_DIR, this.convertToPathParam(path));
    }
    listSubdirs(path) {
        return ipcRenderer.invoke(ValidChannel.LIST_SUBDIRS, this.convertToPathParam(path));
    }
    mkdir(path) {
        return ipcRenderer.invoke(ValidChannel.MKDIR, this.convertToPathParam(path));
    }
    pathExists(path) {
        return ipcRenderer.invoke(ValidChannel.PATH_EXISTS, this.convertToPathParam(path));
    }
    access(path) {
        return ipcRenderer.invoke(ValidChannel.PATH_ACCESS, this.convertToPathParam(path));
    }
    readConfig() {
        return ipcRenderer.invoke(ValidChannel.READ_CONFIG);
    }
    updateConfig(config) {
        return ipcRenderer.invoke(ValidChannel.UPDATE_CONFIG, config);
    }
    readCollection(collection) {
        ipcRenderer.send(ValidChannel.READ_COLLECTION, collection);
    }
    readCollectionsList() {
        return ipcRenderer.invoke(ValidChannel.READ_COLLECTIONS);
    }
    updateCollection(collection) {
        return ipcRenderer.invoke(ValidChannel.UPDATE_COLLECTION, collection);
    }
    deleteCollection(collection) {
        return ipcRenderer.invoke(ValidChannel.DELETE_COLLECTION, collection);
    }
    renameCollection(oldName, newName) {
        return ipcRenderer.invoke(ValidChannel.RENAME_COLLECTION, oldName, newName);
    }
}
exports.api = new API(window);
//# sourceMappingURL=Api.js.map