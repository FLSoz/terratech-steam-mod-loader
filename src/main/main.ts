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
import React from 'react';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, protocol, dialog, Menu, MenuItemConstructorOptions } from 'electron';
import log from 'electron-log';
import fs from 'fs';
import child_process from 'child_process';
import psList from 'ps-list';
import { autoUpdater } from 'electron-updater';

import {
	ModData,
	ModCollection,
	ModType,
	SessionMods,
	ValidChannel,
	AppConfig,
	ModErrorType,
	PathType,
	PathParams,
	ModDataOverride
} from '../model';
import Steamworks, { EResult, UGCItemState } from './steamworks';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import ModFetcher, { getModDetailsFromPath } from './mod-fetcher';

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

class App {
	constructor() {
		log.transports.file.level = isDevelopment ? 'debug' : 'warn';
		log.transports.console.level = isDevelopment ? 'debug' : 'warn';
	}
}

// enforce minimum of 1000 pixels wide
let mainWindow: BrowserWindow | undefined;
let STEAMWORKS_INITED = false;

if (process.env.NODE_ENV === 'production') {
	const sourceMapSupport = require('source-map-support');
	sourceMapSupport.install();
}

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
		.catch(log.error);
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
			preload: app.isPackaged ? path.join(__dirname, 'preload.js') : path.join(__dirname, '../../.erb/dll/preload.js')
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
		mainWindow = undefined;
	});

	const menuBuilder = new MenuBuilder(mainWindow);
	menuBuilder.buildMenu();

	// Open urls in the user's browser
	mainWindow.webContents.on('new-window', (event, url) => {
		event.preventDefault();
		shell.openExternal(url);
	});

	mainWindow.webContents.on('did-finish-load', () => {
		const name = 'TerraTech Steam Mod Manager';
		log.info(`App Version: ${app.getVersion()}`);
		log.info(`App Name: ${app.getName()}`);
		const version = app.getVersion();
		mainWindow?.setTitle(`${name} v${version}`);
		mainWindow?.maximize();

		fs.writeFileSync('steam_appid.txt', '285920\n', 'utf8');
		STEAMWORKS_INITED = Steamworks.init();
	});

	// Remove this if your app does not use auto updates
	if (!isDevelopment) {
		autoUpdater.checkForUpdates();
	}
	// eslint-disable-next-line
	new App();
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
	// eslint-disable-next-line promise/always-return
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
ipcMain.on(ValidChannel.EXIT, (_event, code) => {
	app.exit(code);
});

// close all windows
ipcMain.on(ValidChannel.CLOSE, () => {
	log.info('Trying to close mm');
	if (mainWindow) {
		mainWindow.close();
	}
});

ipcMain.on(ValidChannel.OPEN_MOD_STEAM, async (event, workshopID: bigint) => {
	shell.openExternal(`steam://url/CommunityFilePage/${workshopID}`);
});

ipcMain.on(ValidChannel.OPEN_MOD_BROWSER, async (event, workshopID: bigint) => {
	shell.openExternal(`https://steamcommunity.com/sharedfiles/filedetails/?id=${workshopID}`);
});

ipcMain.on(ValidChannel.SUBSCRIBE_MOD, async (event, workshopID: bigint) => {
	Steamworks.ugcSubscribe(
		workshopID,
		(result: EResult) => {
			if (result === EResult.k_EResultOK) {
				event.reply(ValidChannel.SUBSCRIBE_MOD, true);
			} else {
				log.error(`Failed to subscribe to mod ${workshopID}. Status ${result.toString()}`);
				event.reply(ValidChannel.SUBSCRIBE_MOD, false);
			}
		},
		(err: Error) => {
			log.error(`Failed to subscribe to mod ${workshopID}`);
			log.error(err);
			event.reply(ValidChannel.SUBSCRIBE_MOD, false);
		}
	);
});
ipcMain.on(ValidChannel.UNSUBSCRIBE_MOD, async (event, workshopID: bigint) => {
	Steamworks.ugcUnsubscribe(
		workshopID,
		(result: EResult) => {
			if (result === EResult.k_EResultOK) {
				event.reply(ValidChannel.UNSUBSCRIBE_MOD, true);
			} else {
				log.error(`Failed to unsubscribe from mod ${workshopID}. Status ${result.toString()}`);
				event.reply(ValidChannel.UNSUBSCRIBE_MOD, false);
			}
		},
		(err: Error) => {
			log.error(`Failed to unsubscribe from mod ${workshopID}`);
			log.error(err);
			event.reply(ValidChannel.UNSUBSCRIBE_MOD, false);
		}
	);
});
ipcMain.on(ValidChannel.DOWNLOAD_MOD, async (event, workshopID: bigint) => {
	Steamworks.ugcUnsubscribe(
		workshopID,
		(result: EResult) => {
			if (result === EResult.k_EResultOK) {
				event.reply(ValidChannel.DOWNLOAD_MOD, true);
			} else {
				log.error(`Failed to download mod ${workshopID}. Status ${result.toString()}`);
				event.reply(ValidChannel.DOWNLOAD_MOD, false);
			}
		},
		(err: Error) => {
			log.error(`Failed to download mod ${workshopID}`);
			log.error(err);
			event.reply(ValidChannel.DOWNLOAD_MOD, false);
		}
	);
});

ipcMain.on(ValidChannel.UPDATE_LOG_LEVEL, async (_event, level: log.LogLevel) => {
	log.transports.file.level = level;
	if (isDevelopment) {
		log.transports.console.level = level;
	}
});

ipcMain.on(ValidChannel.READ_MOD_METADATA, async (event, localDir: string | undefined, allKnownMods: Set<string>) => {
	// load workshop mods
	const knownWorkshopMods: bigint[] = [];
	allKnownMods.forEach((uid: string) => {
		log.debug(`Found known mod ${uid}`);
		const parts: string[] = uid.split(':');
		if (parts.length === 2) {
			if (parts[0] === ModType.WORKSHOP) {
				try {
					log.debug(`Found workshop mod ${parts[1]}`);
					const workshopID = BigInt(parts[1]);
					knownWorkshopMods.push(workshopID);
				} catch (e) {
					log.error(`Unable to parse workshop ID for mod ${uid}`);
					log.error(e);
				}
			}
		}
	});

	const modFetcher = new ModFetcher(event, localDir, knownWorkshopMods);
	modFetcher
		.fetchMods()
		.then((modsList: ModData[]) => {
			const sessionMods = new SessionMods(localDir, modsList);
			event.reply(ValidChannel.READ_MOD_METADATA, sessionMods);
			return sessionMods;
		})
		.catch((e) => {
			log.error('Failed to get mod info:');
			log.error(e);
			event.reply(ValidChannel.READ_MOD_METADATA, null);
		});
});

ipcMain.on(ValidChannel.READ_COLLECTION, async (event, collection) => {
	const collectionString = fs.readFileSync(path.join(app.getPath('userData'), 'collections', `${collection}.json`));
	try {
		const data = JSON.parse(collectionString.toString());
		data.name = collection;
		event.reply(ValidChannel.READ_COLLECTION, data as ModCollection);
	} catch (error) {
		log.error(`Failed to read collection: ${collection}`);
		log.error(error);
		event.reply(ValidChannel.READ_COLLECTION, null);
	}
});

ipcMain.handle(ValidChannel.READ_COLLECTIONS, async () => {
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

ipcMain.handle(ValidChannel.UPDATE_COLLECTION, async (_event, collection: ModCollection) => {
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
ipcMain.handle(ValidChannel.RENAME_COLLECTION, async (_event, collection: ModCollection, newName: string) => {
	const oldName = collection.name;
	const oldpath = path.join(app.getPath('userData'), 'collections', `${oldName}.json`);
	const newpath = path.join(app.getPath('userData'), 'collections', `${newName}.json`);
	log.info(`Renaming file ${oldpath} to ${newpath}`);
	try {
		if (fs.existsSync(oldpath)) {
			fs.renameSync(oldpath, newpath);
		} else {
			fs.writeFileSync(newpath, JSON.stringify({ ...collection, mods: [...collection.mods] }, null, 4), { encoding: 'utf8', flag: 'w' });
		}
		return true;
	} catch (error) {
		log.error(error);
		return false;
	}
});

// Delete a json file
ipcMain.handle(ValidChannel.DELETE_COLLECTION, async (_event, collection: string) => {
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
ipcMain.handle(ValidChannel.READ_CONFIG, async () => {
	const filepath = path.join(app.getPath('userData'), 'config.json');
	try {
		const appConfig = JSON.parse(fs.readFileSync(filepath, 'utf8').toString());
		if (appConfig.logLevel) {
			log.transports.file.level = appConfig.logLevel;
			if (isDevelopment) {
				log.transports.console.level = appConfig.logLevel;
			}
		}
		if (!appConfig.viewConfigs) {
			appConfig.viewConfigs = {};
		}
		if (appConfig.ignoredValidationErrors) {
			const convertedMap: Map<ModErrorType, { [uid: string]: string[] }> = new Map();
			const castObject = appConfig.ignoredValidationErrors as { [modID: number]: { [uid: string]: string[] } };
			Object.entries(castObject).forEach(([key, value]: [string, { [uid: string]: string[] }]) => {
				convertedMap.set(parseInt(key, 10) as ModErrorType, value);
			});
			appConfig.ignoredValidationErrors = convertedMap;
		} else {
			appConfig.ignoredValidationErrors = new Map();
		}
		if (appConfig.userOverrides) {
			const convertedMap: Map<string, ModDataOverride> = new Map();
			const castObject = appConfig.userOverrides as { [uid: string]: ModDataOverride };
			Object.entries(castObject).forEach(([key, value]: [string, ModDataOverride]) => {
				convertedMap.set(key, value);
			});
			appConfig.userOverrides = convertedMap;
		} else {
			appConfig.userOverrides = new Map();
		}
		if (appConfig.workshopID) {
			appConfig.workshopID = BigInt(appConfig.workshopID);
		}
		return appConfig as AppConfig;
	} catch (error) {
		log.error(error);
		return null;
	}
});

// Attempt to write the config file
ipcMain.handle(ValidChannel.UPDATE_CONFIG, async (_event, config) => {
	const filepath = path.join(app.getPath('userData'), 'config.json');
	try {
		log.info('updated config');
		if (config.ignoredValidationErrors) {
			config.ignoredValidationErrors = Object.fromEntries(config.ignoredValidationErrors);
		}
		if (config.userOverrides) {
			config.userOverrides = Object.fromEntries(config.userOverrides);
		}
		if (config.workshopID) {
			config.workshopID = config.workshopID.toString();
		}
		fs.writeFileSync(filepath, JSON.stringify(config, null, 4), {
			encoding: 'utf8',
			flag: 'w'
		});
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
ipcMain.on(ValidChannel.GAME_RUNNING, async (event) => {
	let running = false;
	psList()
		.then((processes: ProcessDetails[]) => {
			const matches = processes.filter((process) => /[Tt]erra[Tt]ech(?!.*[Mm]od)/.test(process.name));
			running = matches.length > 0;
			if (running) {
				log.info('Detected TerraTech is running:');
				log.info(processes.filter((process) => /[Tt]erra[Tt]ech/.test(process.name)).map((process) => process.name));
			}
			event.reply(ValidChannel.GAME_RUNNING, running);
			return running;
		})
		.catch((e) => {
			log.error('Failed to get game running status. Defaulting to not running');
			log.error(e);
			event.reply(ValidChannel.GAME_RUNNING, false);
		});
});

// Launch steam as separate process
ipcMain.handle(ValidChannel.LAUNCH_GAME, async (_event, gameExec, workshopID, closeOnLaunch, args) => {
	log.info('Launching game with custom args:');
	const allArgs = ['+custom_mod_list', !!workshopID ? `[workshop:${workshopID}]` : '[]', ...args];
	log.info(allArgs);
	await child_process.spawn(gameExec, allArgs, {
		detached: true
	});
	if (closeOnLaunch) {
		app.quit();
	}
	if (closeOnLaunch) {
		app.quit();
	}
	return true;
});

// Write a json file to a certain location
ipcMain.handle(ValidChannel.WRITE_FILE, async (_event, pathParams: PathParams, data) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	log.info(`Writing json file ${filepath}`);
	log.debug(`Writing ${data} to file ${filepath}`);
	try {
		fs.writeFileSync(filepath, data, 'utf8');
		return true;
	} catch (error) {
		log.error(error);
		return false;
	}
});

// Update a json file
ipcMain.handle(ValidChannel.UPDATE_FILE, async (_event, pathParams: PathParams, newData) => {
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
		log.debug(`Writing ${JSON.stringify(data)} to file ${filepath}`);
		fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf8');
		return true;
	} catch (error) {
		log.error(`Unable to parse file ${filepath} contents into json: ${raw}`);
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
ipcMain.handle(ValidChannel.DELETE_FILE, async (_event, pathParams: PathParams) => {
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
ipcMain.handle(ValidChannel.LIST_DIR, async (_event, pathParams: PathParams) => {
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
ipcMain.handle(ValidChannel.LIST_SUBDIRS, async (_event, pathParams: PathParams) => {
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

// Mkdir
ipcMain.handle(ValidChannel.MKDIR, async (_event, pathParams: PathParams) => {
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
ipcMain.handle(ValidChannel.READ_FILE, async (_event, pathParams: PathParams) => {
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
ipcMain.handle(ValidChannel.PATH_EXISTS, async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	try {
		const stats = fs.statSync(filepath);
		if (pathParams.type === PathType.DIRECTORY) {
			return stats.isDirectory();
		}
		if (pathParams.type === PathType.FILE) {
			return stats.isFile();
		}
		return true;
	} catch (error) {
		log.error(error);
		return false;
	}
});

// Check if have access to path
ipcMain.handle(ValidChannel.PATH_ACCESS, async (_event, pathParams: PathParams) => {
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
ipcMain.handle(ValidChannel.USER_DATA_PATH, async () => {
	return app.getPath('userData');
});

ipcMain.on(ValidChannel.SELECT_PATH, async (event, target: string, directory: boolean, title: string) => {
	log.info(`Selecting path: ${target}`);

	dialog
		.showOpenDialog({
			title,
			properties: ['showHiddenFiles', directory ? 'openDirectory' : 'openFile', 'promptToCreate', 'createDirectory']
		})
		.then((result) => {
			if (result.canceled) {
				event.reply(ValidChannel.SELECT_PATH, null, target);
			} else {
				event.reply(ValidChannel.SELECT_PATH, result.filePaths[0], target);
			}
			return null;
		})
		.catch((error) => {
			log.error(error);
			event.reply(ValidChannel.SELECT_PATH, null, target);
		});
});

ipcMain.on(ValidChannel.OPEN_MOD_CONTEXT_MENU, async (event, record: ModData, x: number, y: number) => {
	const template: MenuItemConstructorOptions[] = [];
	if (record.path) {
		template.push({
			label: 'Show in Explorer',
			click: () => {
				shell.openPath(record.path!);
			}
		});
	}
	if (record.workshopID) {
		template.push({
			label: 'Show in Steam',
			click: () => {
				shell.openExternal(`steam://url/CommunityFilePage/${record.workshopID}`);
			}
		});
		template.push({
			label: 'Show in Browser',
			click: () => {
				shell.openExternal(`https://steamcommunity.com/sharedfiles/filedetails/?id=${record.workshopID}`);
			}
		});
		template.push({ type: 'separator' });
		const getUpdatedInfo = async () => {
			const update = {
				lastUpdate: record.lastUpdate,
				size: record.size,
				path: record.path,
				installed: record.installed,
				downloadPending: record.downloadPending,
				downloading: record.downloading,
				needsUpdate: record.needsUpdate,
				id: record.id
			};
			const state: UGCItemState = Steamworks.ugcGetItemState(record.workshopID!);
			if (state) {
				// eslint-disable-next-line no-bitwise
				update.installed = !!(state & UGCItemState.Installed);
				// eslint-disable-next-line no-bitwise
				update.downloadPending = !!(state & UGCItemState.DownloadPending);
				// eslint-disable-next-line no-bitwise
				update.downloading = !!(state & UGCItemState.Downloading);
				// eslint-disable-next-line no-bitwise
				update.needsUpdate = !!(state & UGCItemState.NeedsUpdate);
			}
			const installInfo = Steamworks.ugcGetItemInstallInfo(record.workshopID!);
			if (installInfo) {
				log.verbose(`Workshop mod is installed at path: ${installInfo.folder}`);
				// augment workshop mod with data
				update.lastUpdate = new Date(installInfo.timestamp * 1000);
				update.size = parseInt(installInfo.sizeOnDisk, 10);
				update.path = installInfo.folder;

				await getModDetailsFromPath(update as ModData, installInfo.folder, record.type);
			} else {
				log.verbose(`FAILED to get install info for mod ${record.workshopID}`);
			}
			mainWindow?.webContents.send(ValidChannel.MOD_METADATA_UPDATE, `${ModType.WORKSHOP}:${record.workshopID}`, update);
		};
		if (record.subscribed) {
			template.push({
				label: 'Unsubscribe',
				click: () => {
					Steamworks.ugcUnsubscribe(record.workshopID!, () => {
						log.verbose(`Unsubscribed from ${record.workshopID}`);
						mainWindow?.webContents.send(ValidChannel.MOD_METADATA_UPDATE, `${ModType.WORKSHOP}:${record.workshopID}`, {
							subscribed: false
						});
						getUpdatedInfo();
					});
				}
			});
		} else {
			template.push({
				label: 'Subscribe',
				click: () => {
					Steamworks.ugcSubscribe(record.workshopID!, () => {
						log.verbose(`Subscribed to ${record.workshopID}`);
						mainWindow?.webContents.send(ValidChannel.MOD_METADATA_UPDATE, `${ModType.WORKSHOP}:${record.workshopID}`, {
							subscribed: true
						});
						getUpdatedInfo();
					});
				}
			});
		}
		if (record.needsUpdate) {
			template.push({
				label: 'Update',
				click: () => {
					Steamworks.ugcDownloadItem(record.workshopID!, () => {
						log.verbose(`Updated ${record.workshopID}`);
						getUpdatedInfo();
					});
				}
			});
		}
	}
	Menu.buildFromTemplate(template).popup({ window: mainWindow });
});
