"use strict";
/* eslint global-require: off, no-console: off */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
// eslint-disable-next-line prettier/prettier
require("core-js/stable");
require("regenerator-runtime/runtime");
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const electron_log_1 = __importDefault(require("electron-log"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = __importDefault(require("child_process"));
const steam_1 = __importDefault(require("./steam"));
const menu_1 = __importDefault(require("./menu"));
const util_1 = require("./util");
const sleep = require('util').promisify(setTimeout);
const psList = require('ps-list');
class AppUpdater {
    constructor() {
        electron_log_1.default.transports.file.level = 'info';
        electron_updater_1.autoUpdater.logger = electron_log_1.default;
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    }
}
exports.default = AppUpdater;
// enforce minimum of 1000 pixels wide
let mainWindow = null;
if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();
}
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';
if (isDevelopment) {
    require('electron-debug')();
}
const installExtensions = async () => {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ['REACT_DEVELOPER_TOOLS'];
    return installer
        .default(extensions.map((name) => installer[name]), forceDownload)
        .catch(electron_log_1.default.info);
};
const createWindow = async () => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
        await installExtensions();
    }
    const RESOURCES_PATH = electron_1.app.isPackaged ? path_1.default.join(process.resourcesPath, 'assets') : path_1.default.join(__dirname, '../../assets');
    const getAssetPath = (...paths) => {
        return path_1.default.join(RESOURCES_PATH, ...paths);
    };
    mainWindow = new electron_1.BrowserWindow({
        show: false,
        width: 1024,
        height: 728,
        minWidth: 1024,
        minHeight: 728,
        icon: getAssetPath('icon.png'),
        webPreferences: {
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js')
        }
    });
    electron_1.protocol.registerFileProtocol('file', (request, callback) => {
        const pathname = request.url.replace('file:///', '');
        callback(pathname);
    });
    electron_1.protocol.registerFileProtocol('image', (request, callback) => {
        const url = request.url.substr(7);
        callback({ path: url });
    });
    mainWindow.loadURL((0, util_1.resolveHtmlPath)('index.html'));
    mainWindow.once('ready-to-show', () => {
        if (!mainWindow) {
            throw new Error('"mainWindow" is not defined');
        }
        if (process.env.START_MINIMIZED) {
            mainWindow.minimize();
        }
        else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    const menuBuilder = new menu_1.default(mainWindow);
    menuBuilder.buildMenu();
    // Open urls in the user's browser
    mainWindow.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        electron_1.shell.openExternal(url);
    });
    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    new AppUpdater();
};
/**
 * Add event listeners...
 */
electron_1.app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app
    .whenReady()
    .then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null)
            createWindow();
    });
})
    .catch(electron_log_1.default.error);
// close and exit with error code
electron_1.ipcMain.on('exit', (_event, code) => {
    electron_1.app.exit(code);
});
// close all windows
electron_1.ipcMain.on('close', () => {
    electron_log_1.default.info('Trying to close mm');
    if (mainWindow) {
        mainWindow.close();
    }
});
// Read raw app metadata from the given paths
electron_1.ipcMain.on('read-mod-metadata', async (event, pathParams, type, workshopID) => {
    const modPath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    fs_1.default.readdir(modPath, { withFileTypes: true }, async (err, files) => {
        if (err) {
            electron_log_1.default.error(err);
            event.reply('mod-metadata-results', null);
        }
        else {
            const tempID = workshopID ? `${workshopID}` : '';
            const potentialMod = {
                UID: `${type}:${tempID}`,
                ID: tempID,
                type,
                WorkshopID: workshopID,
                config: { hasCode: false }
            };
            let validMod = false;
            const config = potentialMod.config;
            files.forEach((file) => {
                if (file.isFile()) {
                    if (file.name === 'preview.png') {
                        config.preview = `image://${path_1.default.join(modPath, file.name)}`;
                    }
                    else if (file.name.match(/^(.*)\.dll$/)) {
                        config.hasCode = true;
                    }
                    else if (file.name === 'ttsm_config.json') {
                        Object.assign(potentialMod.config, JSON.parse(fs_1.default.readFileSync(path_1.default.join(modPath, file.name), 'utf8')));
                    }
                    else if (type === 'ttqmm') {
                        if (file.name === 'mod.json') {
                            const modConfig = JSON.parse(fs_1.default.readFileSync(path_1.default.join(modPath, file.name), 'utf8'));
                            config.name = modConfig.DisplayName;
                            config.author = modConfig.Author;
                            if (potentialMod.ID === '') {
                                potentialMod.ID = modConfig.Id;
                                potentialMod.UID = `ttqmm:${modConfig.Id}`;
                            }
                        }
                        if (file.name === 'ttmm.json') {
                            const ttmmConfig = JSON.parse(fs_1.default.readFileSync(path_1.default.join(modPath, file.name), 'utf8'));
                            potentialMod.ID = ttmmConfig.CloudName;
                            potentialMod.UID = `ttqmm:${ttmmConfig.CloudName}`;
                            config.dependsOn = ttmmConfig.RequiredModNames;
                            config.loadAfter = ttmmConfig.RequiredModNames;
                            config.description = ttmmConfig.InlineDescription;
                        }
                    }
                    else {
                        const matches = file.name.match(/^(.*)_bundle$/);
                        if (matches && matches.length > 1) {
                            // eslint-disable-next-line prefer-destructuring
                            potentialMod.ID = matches[1];
                            if (type !== 'workshop') {
                                potentialMod.UID = `local:${potentialMod.ID}`;
                            }
                            if (!config.name) {
                                // eslint-disable-next-line prefer-destructuring
                                config.name = matches[1];
                            }
                            validMod = true;
                        }
                    }
                }
            });
            // augment workshop mod with data
            let workshopMod = null;
            if (workshopID) {
                try {
                    workshopMod = await (0, steam_1.default)(workshopID);
                    const steamConfig = workshopMod === null || workshopMod === void 0 ? void 0 : workshopMod.config;
                    if (steamConfig && config) {
                        const { name } = steamConfig;
                        // We take anything else we've determined for ourselves from the file system over whatever we got from Steam alone
                        potentialMod.config = Object.assign(steamConfig, config);
                        if (name) {
                            potentialMod.config.name = name;
                        }
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }
                catch (error) {
                    electron_log_1.default.error(error);
                }
            }
            event.reply('mod-metadata-results', validMod ? potentialMod : null);
        }
    });
});
electron_1.ipcMain.on('read-collection', async (event, collection) => {
    const collectionString = fs_1.default.readFileSync(path_1.default.join(electron_1.app.getPath('userData'), 'collections', `${collection}.json`));
    try {
        const data = JSON.parse(collectionString.toString());
        data.name = collection;
        event.reply('collection-results', data);
    }
    catch (error) {
        electron_log_1.default.info(`Failed to read collection: ${collection}`);
        electron_log_1.default.error(error);
        event.reply('collection-results', null);
    }
});
electron_1.ipcMain.handle('read-collections-list', async () => {
    const dirpath = path_1.default.join(electron_1.app.getPath('userData'), 'collections');
    try {
        if (!fs_1.default.existsSync(dirpath)) {
            fs_1.default.mkdirSync(dirpath);
        }
        const dirContents = fs_1.default.readdirSync(dirpath);
        return dirContents
            .map((elem) => {
            const matches = elem.toString().match(/(.*)\.json/);
            if (matches && matches[1]) {
                return matches[1];
            }
            return null;
        })
            .filter((elem) => !!elem);
    }
    catch (error) {
        electron_log_1.default.error(error);
        return [];
    }
});
electron_1.ipcMain.handle('update-collection', async (_event, collection) => {
    const filepath = path_1.default.join(electron_1.app.getPath('userData'), 'collections', `${collection.name}.json`);
    try {
        fs_1.default.writeFileSync(filepath, JSON.stringify({ ...collection, mods: [...collection.mods] }, null, 4), { encoding: 'utf8', flag: 'w' });
    }
    catch (error) {
        electron_log_1.default.error(error);
        return false;
    }
    return true;
});
// Rename a file
electron_1.ipcMain.handle('rename-collection', async (_event, oldName, newName) => {
    const oldpath = path_1.default.join(electron_1.app.getPath('userData'), 'collections', `${oldName}.json`);
    const newpath = path_1.default.join(electron_1.app.getPath('userData'), 'collections', `${newName}.json`);
    electron_log_1.default.info(`Renaming file ${oldpath} to ${newpath}`);
    try {
        fs_1.default.renameSync(oldpath, newpath);
        return true;
    }
    catch (error) {
        electron_log_1.default.error(error);
        return false;
    }
});
// Delete a json file
electron_1.ipcMain.handle('delete-collection', async (_event, collection) => {
    const filepath = path_1.default.join(electron_1.app.getPath('userData'), 'collections', `${collection}.json`);
    electron_log_1.default.info(`Deleting file ${filepath}`);
    try {
        fs_1.default.unlinkSync(filepath);
        return true;
    }
    catch (error) {
        electron_log_1.default.error(error);
        return false;
    }
});
// return config
electron_1.ipcMain.handle('read-config', async () => {
    const filepath = path_1.default.join(electron_1.app.getPath('userData'), 'config.json');
    try {
        return JSON.parse(fs_1.default.readFileSync(filepath, 'utf8').toString());
    }
    catch (error) {
        electron_log_1.default.error(error);
        return null;
    }
});
// Attempt to write the config file
electron_1.ipcMain.handle('update-config', async (_event, config) => {
    const filepath = path_1.default.join(electron_1.app.getPath('userData'), 'config.json');
    try {
        electron_log_1.default.info('updated config');
        fs_1.default.writeFileSync(filepath, JSON.stringify(config, null, 4), { encoding: 'utf8', flag: 'w' });
        return true;
    }
    catch (error) {
        electron_log_1.default.error(error);
        return false;
    }
});
electron_1.ipcMain.on('game-running', async (event) => {
    let running = false;
    await psList().then((processes) => {
        const matches = processes.filter((process) => /[Tt]erra[Tt]ech(?!.*mod.*manager)/.test(process.name));
        running = matches.length > 0;
        event.reply('game-running', running);
        return running;
    });
    event.reply('game-running', running);
    return running;
});
// Launch steam as separate process
electron_1.ipcMain.handle('launch-game', async (_event, steamExec, workshopID, closeOnLaunch, args) => {
    electron_log_1.default.info('Launching game with custom args:');
    electron_log_1.default.info(args);
    await child_process_1.default.spawn(steamExec, ['-applaunch', '285920', '+custom_mod_list', `:${workshopID}]`, ...args], {
        detached: true
    });
    if (closeOnLaunch) {
        electron_1.app.quit();
    }
    return true;
});
// Handle querying steam and parsing the result for a mod page
electron_1.ipcMain.handle('query-steam', async (_event, workshopID) => {
    const mod = await (0, steam_1.default)(workshopID);
    return mod;
});
// Write a json file to a certain location
electron_1.ipcMain.handle('write-file', async (_event, pathParams, data) => {
    const filepath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    electron_log_1.default.info(`Writing json file ${filepath}`);
    electron_log_1.default.info(`Writing ${data} to file ${filepath}`);
    try {
        fs_1.default.writeFileSync(filepath, data, 'utf8');
        return true;
    }
    catch (error) {
        electron_log_1.default.error(error);
        return false;
    }
});
// Update a json file
electron_1.ipcMain.handle('update-file', async (_event, pathParams, newData) => {
    const filepath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    electron_log_1.default.info(`Updating json file ${filepath}`);
    const raw = fs_1.default.readFileSync(filepath);
    try {
        const data = JSON.parse(raw);
        Object.entries(newData).forEach(([key, value]) => {
            if (value === undefined) {
                delete data[key];
            }
            else {
                data[key] = value;
            }
        });
        electron_log_1.default.info(`Writing ${JSON.stringify(data)} to file ${filepath}`);
        fs_1.default.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf8');
        return true;
    }
    catch (error) {
        electron_log_1.default.info(`Unable to parse file ${filepath} contents into json: ${raw}`);
        electron_log_1.default.error(error);
        try {
            fs_1.default.writeFileSync(filepath, JSON.stringify(newData, null, 4), 'utf8');
            return true;
        }
        catch (err2) {
            electron_log_1.default.error(err2);
            return false;
        }
    }
});
// Delete a json file
electron_1.ipcMain.handle('delete-file', async (_event, pathParams) => {
    const filepath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    electron_log_1.default.info(`Deleting file ${filepath}`);
    try {
        fs_1.default.unlinkSync(filepath);
        return true;
    }
    catch (error) {
        electron_log_1.default.error(error);
        return false;
    }
});
// see what's in a directory
electron_1.ipcMain.handle('list-dir', async (_event, pathParams) => {
    const dirpath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    electron_log_1.default.info(`Listing dir contents ${dirpath}`);
    try {
        return fs_1.default.readdirSync(dirpath);
    }
    catch (error) {
        electron_log_1.default.error(error);
        return null;
    }
});
// see sub-directories
electron_1.ipcMain.handle('list-subdirs', async (_event, pathParams) => {
    const dirpath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    electron_log_1.default.info(`Listing subdirs ${dirpath}`);
    try {
        return fs_1.default
            .readdirSync(dirpath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
    }
    catch (error) {
        electron_log_1.default.error(error);
        return [];
    }
});
// Check if path exists
electron_1.ipcMain.handle('mkdir', async (_event, pathParams) => {
    const filepath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    electron_log_1.default.info(`Mkdir ${filepath}`);
    try {
        fs_1.default.mkdirSync(filepath);
        return true;
    }
    catch (error) {
        electron_log_1.default.error(error);
        return false;
    }
});
// Read json file
electron_1.ipcMain.handle('read-file', async (_event, pathParams) => {
    const filepath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    electron_log_1.default.info(`Reading file ${filepath}`);
    try {
        return fs_1.default.readFileSync(filepath, 'utf8').toString();
    }
    catch (error) {
        electron_log_1.default.error(error);
        return null;
    }
});
// Check if path exists
electron_1.ipcMain.handle('path-exists', async (_event, pathParams) => {
    const filepath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    try {
        return fs_1.default.existsSync(filepath);
    }
    catch (error) {
        electron_log_1.default.error(error);
        return false;
    }
});
// Check if have access to path
electron_1.ipcMain.handle('path-access', async (_event, pathParams) => {
    const filepath = path_1.default.join(...pathParams.prefixes, pathParams.path);
    electron_log_1.default.info(`Checking access to ${filepath}`);
    try {
        // eslint-disable-next-line no-bitwise
        fs_1.default.accessSync(filepath, fs_1.default.constants.R_OK | fs_1.default.constants.W_OK);
        return true;
    }
    catch (err) {
        electron_log_1.default.error(`bad access to file ${filepath}!`, err);
        return false;
    }
});
// get user data
// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
electron_1.ipcMain.handle('user-data-path', async () => {
    return electron_1.app.getPath('userData');
});
//# sourceMappingURL=main.js.map