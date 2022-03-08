/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
// eslint-disable-next-line prettier/prettier
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, protocol, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import fs from 'fs';
import child_process from 'child_process';

import querySteam from './steam';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { ModConfig, Mod, ModCollection } from './model';

const sleep = require('util').promisify(setTimeout);
const psList = require('ps-list');

export default class AppUpdater {
	constructor() {
		log.transports.file.level = 'info';
		autoUpdater.logger = log;
		autoUpdater.checkForUpdatesAndNotify();
	}
}

// enforce minimum of 1000 pixels wide
let mainWindow: BrowserWindow | null = null;

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
		.default(
			extensions.map((name) => installer[name]),
			forceDownload
		)
		.catch(log.info);
};

const createWindow = async () => {
	if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
		await installExtensions();
	}

	const RESOURCES_PATH = app.isPackaged ? path.join(process.resourcesPath, 'assets') : path.join(__dirname, '../../assets');

	const getAssetPath = (...paths: string[]): string => {
		return path.join(RESOURCES_PATH, ...paths);
	};

	mainWindow = new BrowserWindow({
		show: false,
		width: 1080,
		height: 728,
		minWidth: 1080,
		minHeight: 728,
		icon: getAssetPath('icon.png'),
		webPreferences: {
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js')
		}
	});

	protocol.registerFileProtocol('file', (request, callback) => {
		const pathname = request.url.replace('file:///', '');
		callback(pathname);
	});
	protocol.registerFileProtocol('image', (request, callback) => {
		const url = request.url.substr(7);
		callback({ path: url });
	});

	mainWindow.loadURL(resolveHtmlPath('index.html'));

	mainWindow.once('ready-to-show', () => {
		if (!mainWindow) {
			throw new Error('"mainWindow" is not defined');
		}
		if (process.env.START_MINIMIZED) {
			mainWindow.minimize();
		} else {
			mainWindow.show();
			mainWindow.focus();
		}
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	const menuBuilder = new MenuBuilder(mainWindow);
	menuBuilder.buildMenu();

	// Open urls in the user's browser
	mainWindow.webContents.on('new-window', (event, url) => {
		event.preventDefault();
		shell.openExternal(url);
	});

	// Remove this if your app does not use auto updates
	// eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
	// Respect the OSX convention of having the application in memory even
	// after all windows have been closed
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app
	.whenReady()
	.then(() => {
		createWindow();
		app.on('activate', () => {
			// On macOS it's common to re-create a window in the app when the
			// dock icon is clicked and there are no other windows open.
			if (mainWindow === null) createWindow();
		});
	})
	.catch(log.error);

// close and exit with error code
ipcMain.on('exit', (_event, code) => {
	app.exit(code);
});

// close all windows
ipcMain.on('close', () => {
	log.info('Trying to close mm');
	if (mainWindow) {
		mainWindow.close();
	}
});

interface PathParams {
	prefixes: string[];
	path: string;
}

// Read raw app metadata from the given paths
ipcMain.on('read-mod-metadata', async (event, pathParams: PathParams, type, workshopID: BigInt | null) => {
	const modPath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Reading mod metadata for ${modPath}`);
	fs.readdir(modPath, { withFileTypes: true }, async (err, files) => {
		if (err) {
			log.error(err);
			event.reply('mod-metadata-results', null);
		} else {
			const tempID = workshopID ? `${workshopID}` : '';
			const potentialMod: Mod = {
				UID: `${type}:${tempID}`,
				ID: tempID,
				type,
				WorkshopID: workshopID,
				config: { hasCode: false }
			};
			let validMod = false;
			const config: ModConfig = potentialMod.config as ModConfig;
			files.forEach((file) => {
				if (file.isFile()) {
					if (file.name === 'preview.png') {
						config.preview = `image://${path.join(modPath, file.name)}`;
					} else if (file.name.match(/^(.*)\.dll$/)) {
						config.hasCode = true;
					} else if (file.name === 'ttsm_config.json') {
						Object.assign(potentialMod.config, JSON.parse(fs.readFileSync(path.join(modPath, file.name), 'utf8')));
					} else if (type === 'ttqmm') {
						if (file.name === 'mod.json') {
							const modConfig = JSON.parse(fs.readFileSync(path.join(modPath, file.name), 'utf8'));
							config.name = modConfig.DisplayName;
							config.author = modConfig.Author;
							if (potentialMod.ID === '') {
								potentialMod.ID = modConfig.Id;
								potentialMod.UID = `ttqmm:${modConfig.Id}`;
							}
						}
						if (file.name === 'ttmm.json') {
							const ttmmConfig = JSON.parse(fs.readFileSync(path.join(modPath, file.name), 'utf8'));
							potentialMod.ID = ttmmConfig.CloudName;
							potentialMod.UID = `ttqmm:${ttmmConfig.CloudName}`;
							config.dependsOn = ttmmConfig.RequiredModNames;
							config.loadAfter = ttmmConfig.RequiredModNames;
							config.description = ttmmConfig.InlineDescription;
						}
					} else {
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
			let workshopMod: Mod | null = null;
			if (workshopID) {
				potentialMod.subscribed = true;
				try {
					workshopMod = await querySteam(workshopID);
					const steamConfig = workshopMod?.config;
					if (steamConfig && config) {
						const { name } = steamConfig;
						// We take anything else we've determined for ourselves from the file system over whatever we got from Steam alone
						potentialMod.config = Object.assign(steamConfig, config);
						if (name) {
							potentialMod.config.name = name;
						}
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} catch (error: any) {
					log.error(error);
				}
			}

			log.info(JSON.stringify(potentialMod, null, 2));
			event.reply('mod-metadata-results', validMod ? potentialMod : null);
		}
	});
});

ipcMain.on('read-collection', async (event, collection) => {
	const collectionString = fs.readFileSync(path.join(app.getPath('userData'), 'collections', `${collection}.json`));
	try {
		const data = JSON.parse(collectionString.toString());
		data.name = collection;
		event.reply('collection-results', data as ModCollection);
	} catch (error) {
		log.info(`Failed to read collection: ${collection}`);
		log.error(error);
		event.reply('collection-results', null);
	}
});

ipcMain.handle('read-collections-list', async () => {
	const dirpath = path.join(app.getPath('userData'), 'collections');
	try {
		if (!fs.existsSync(dirpath)) {
			fs.mkdirSync(dirpath);
		}
		const dirContents: string[] | Buffer[] | fs.Dirent[] = fs.readdirSync(dirpath);
		return dirContents
			.map((elem) => {
				const matches = elem.toString().match(/(.*)\.json/);
				if (matches && matches[1]) {
					return matches[1];
				}
				return null;
			})
			.filter((elem: string | null) => !!elem);
	} catch (error) {
		log.error(error);
		return [];
	}
});

ipcMain.handle('update-collection', async (_event, collection: ModCollection) => {
	const filepath = path.join(app.getPath('userData'), 'collections', `${collection.name}.json`);
	try {
		fs.writeFileSync(filepath, JSON.stringify({ ...collection, mods: [...collection.mods] }, null, 4), { encoding: 'utf8', flag: 'w' });
	} catch (error) {
		log.error(error);
		return false;
	}
	return true;
});

// Rename a file
ipcMain.handle('rename-collection', async (_event, oldName: string, newName: string) => {
	const oldpath = path.join(app.getPath('userData'), 'collections', `${oldName}.json`);
	const newpath = path.join(app.getPath('userData'), 'collections', `${newName}.json`);
	log.info(`Renaming file ${oldpath} to ${newpath}`);
	try {
		fs.renameSync(oldpath, newpath);
		return true;
	} catch (error) {
		log.error(error);
		return false;
	}
});

// Delete a json file
ipcMain.handle('delete-collection', async (_event, collection: string) => {
	const filepath = path.join(app.getPath('userData'), 'collections', `${collection}.json`);
	log.info(`Deleting file ${filepath}`);
	try {
		fs.unlinkSync(filepath);
		return true;
	} catch (error) {
		log.error(error);
		return false;
	}
});

// return config
ipcMain.handle('read-config', async () => {
	const filepath = path.join(app.getPath('userData'), 'config.json');
	try {
		return JSON.parse(fs.readFileSync(filepath, 'utf8').toString());
	} catch (error) {
		log.error(error);
		return null;
	}
});

// Attempt to write the config file
ipcMain.handle('update-config', async (_event, config) => {
	const filepath = path.join(app.getPath('userData'), 'config.json');
	try {
		log.info('updated config');
		fs.writeFileSync(filepath, JSON.stringify(config, null, 4), { encoding: 'utf8', flag: 'w' });
		return true;
	} catch (error) {
		log.error(error);
		return false;
	}
});

// Check if game is running
interface ProcessDetails {
	pid: number;
	ppid: number;
	name: string;
}
ipcMain.on('game-running', async (event) => {
	let running = false;
	await psList().then((processes: ProcessDetails[]) => {
		const matches = processes.filter((process) => /[Tt]erra[Tt]ech(?!.*mod.*manager)/.test(process.name));
		running = matches.length > 0;
		event.reply('game-running', running);
		return running;
	});
	event.reply('game-running', running);
	return running;
});

// Launch steam as separate process
ipcMain.handle('launch-game', async (_event, steamExec, workshopID, closeOnLaunch, args) => {
	log.info('Launching game with custom args:');
	log.info(args);
	await child_process.spawn(steamExec, ['-applaunch', '285920', '+custom_mod_list', `[workshop:${workshopID}]`, ...args], {
		detached: true
	});
	if (closeOnLaunch) {
		app.quit();
	}
	return true;
});

// Handle querying steam and parsing the result for a mod page
ipcMain.handle('query-steam', async (_event, workshopID) => {
	const mod = await querySteam(workshopID);
	return mod;
});

// Write a json file to a certain location
ipcMain.handle('write-file', async (_event, pathParams: PathParams, data) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Writing json file ${filepath}`);
	log.info(`Writing ${data} to file ${filepath}`);
	try {
		fs.writeFileSync(filepath, data, 'utf8');
		return true;
	} catch (error) {
		log.error(error);
		return false;
	}
});

// Update a json file
ipcMain.handle('update-file', async (_event, pathParams: PathParams, newData) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Updating json file ${filepath}`);
	const raw: string = fs.readFileSync(filepath) as unknown as string;
	try {
		const data: Record<string, unknown> = JSON.parse(raw);
		Object.entries(newData).forEach(([key, value]) => {
			if (value === undefined) {
				delete data[key];
			} else {
				data[key] = value;
			}
		});
		log.info(`Writing ${JSON.stringify(data)} to file ${filepath}`);
		fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf8');
		return true;
	} catch (error) {
		log.info(`Unable to parse file ${filepath} contents into json: ${raw}`);
		log.error(error);
		try {
			fs.writeFileSync(filepath, JSON.stringify(newData, null, 4), 'utf8');
			return true;
		} catch (err2) {
			log.error(err2);
			return false;
		}
	}
});

// Delete a json file
ipcMain.handle('delete-file', async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Deleting file ${filepath}`);
	try {
		fs.unlinkSync(filepath);
		return true;
	} catch (error) {
		log.error(error);
		return false;
	}
});

// see what's in a directory
ipcMain.handle('list-dir', async (_event, pathParams: PathParams) => {
	const dirpath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Listing dir contents ${dirpath}`);
	try {
		return fs.readdirSync(dirpath);
	} catch (error) {
		log.error(error);
		return null;
	}
});

// see sub-directories
ipcMain.handle('list-subdirs', async (_event, pathParams: PathParams) => {
	const dirpath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Listing subdirs ${dirpath}`);
	try {
		return fs
			.readdirSync(dirpath, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name);
	} catch (error) {
		log.error(error);
		return [];
	}
});

// Check if path exists
ipcMain.handle('mkdir', async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Mkdir ${filepath}`);
	try {
		fs.mkdirSync(filepath);
		return true;
	} catch (error) {
		log.error(error);
		return false;
	}
});

// Read json file
ipcMain.handle('read-file', async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Reading file ${filepath}`);
	try {
		return fs.readFileSync(filepath, 'utf8').toString();
	} catch (error) {
		log.error(error);
		return null;
	}
});

// Check if path exists
ipcMain.handle('path-exists', async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	try {
		return fs.existsSync(filepath);
	} catch (error) {
		log.error(error);
		return false;
	}
});

// Check if have access to path
ipcMain.handle('path-access', async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Checking access to ${filepath}`);
	try {
		// eslint-disable-next-line no-bitwise
		fs.accessSync(filepath, fs.constants.R_OK | fs.constants.W_OK);
		return true;
	} catch (err) {
		log.error(`bad access to file ${filepath}!`, err);
		return false;
	}
});

// get user data
// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
ipcMain.handle('user-data-path', async () => {
	return app.getPath('userData');
});

ipcMain.on('select-path', async (event, target: string, directory: boolean, title: string) => {
	log.info(`Selecting path: ${target}`);

	dialog
		.showOpenDialog({
			title,
			properties: ['showHiddenFiles', directory ? 'openDirectory' : 'openFile', 'promptToCreate', 'createDirectory']
		})
		.then((result) => {
			if (result.canceled) {
				event.reply('select-path-result', null, target);
			} else {
				event.reply('select-path-result', result.filePaths[0], target);
			}
			return null;
		})
		.catch((error) => {
			log.error(error);
			event.reply('select-path-result', null, target);
		});
});
