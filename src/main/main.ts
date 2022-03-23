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
import { app, BrowserWindow, shell, ipcMain, protocol, dialog, IpcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import fs, { Dirent } from 'fs';

import Steamworks, { SteamID, SteamUGCDetails, ValidGreenworksChannels } from './steamworks';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { ModConfig, Mod, ModCollection, ModType } from './model';

const psList = require('ps-list');

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

export default class AppUpdater {
	constructor() {
		log.transports.file.level = isDevelopment ? 'debug' : 'warn';
		autoUpdater.logger = log;
		autoUpdater.checkForUpdatesAndNotify();
	}
}

// enforce minimum of 1000 pixels wide
let mainWindow: BrowserWindow | null = null;
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

	mainWindow.webContents.on('did-finish-load', () => {
		const name = 'TerraTech Steam Mod Loader';
		log.info(`App Version: ${app.getVersion()}`);
		log.info(`App Name: ${app.getName()}`);
		const version = app.getVersion();
		mainWindow?.setTitle(`${name} v${version}`);

		STEAMWORKS_INITED = Steamworks.init();
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

const COUNTS_BUFFER = new SharedArrayBuffer(16); // give 16 in case word length is 8
const COUNTS_ARRAY = new Uint16Array(COUNTS_BUFFER);

interface PathParams {
	prefixes: string[];
	path: string;
}

ipcMain.on('open-mod-steam', async (event, workshopID: string) => {
	shell.openExternal(`steam://url/CommunityFilePage/${workshopID}`);
});

ipcMain.on('open-mod-browser', async (event, workshopID: string) => {
	shell.openExternal(`https://steamcommunity.com/sharedfiles/filedetails/?id=${workshopID}`);
});

/*
else if (type === 'ttqmm') {
						if (file.name === 'mod.json') {
							const modConfig = JSON.parse(fs.readFileSync(path.join(modPath, file.name), 'utf8'));
							config.name = modConfig.DisplayName;
							config.authors = [modConfig.Author];
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
					}
*/

function processLocalMod(event: Electron.IpcMainEvent, resolveExternal: (value: unknown) => void, rejectExternal: (reason?: any) => void, modPath: string) {
	log.info(`Reading mod metadata for ${modPath}`);
	fs.readdir(modPath, { withFileTypes: true }, async (err, files) => {
		try {
			if (err) {
				log.error(`fs.readdir failed on path ${modPath}`);
				log.error(err);
				rejectExternal(err);
			} else {
				const tempID = '';
				const potentialMod: Mod = {
					UID: `local:${tempID}`,
					ID: tempID,
					type: ModType.LOCAL,
					WorkshopID: null,
					config: { hasCode: false }
				};
				let validMod = false;
				const config: ModConfig = potentialMod.config as ModConfig;
				try {
					const stats = fs.statSync(modPath);
					config.lastUpdate = stats.mtime;
					config.dateAdded = stats.birthtime;
				} catch (e) {
					log.error(`Failed to get file details for path ${modPath}`);
					log.error(e);
				}
				const fileSizes = files.map((file) => {
					let size = 0;
					if (file.isFile()) {
						try {
							const stats = fs.statSync(modPath);
							if (!config.lastUpdate || stats.mtime > config.lastUpdate) {
								config.lastUpdate = stats.mtime;
								size = stats.size;
							}
						} catch (e) {
							log.error(`Failed to get file details for ${file.name} under ${modPath}`);
						}
						if (file.name === 'preview.png') {
							config.preview = `image://${path.join(modPath, file.name)}`;
						} else if (file.name.match(/^(.*)\.dll$/)) {
							config.hasCode = true;
						} else if (file.name === 'ttsm_config.json') {
							Object.assign(potentialMod.config, JSON.parse(fs.readFileSync(path.join(modPath, file.name), 'utf8')));
						} else {
							const matches = file.name.match(/^(.*)_bundle$/);
							if (matches && matches.length > 1) {
								// eslint-disable-next-line prefer-destructuring
								potentialMod.ID = matches[1];
								potentialMod.UID = `local:${potentialMod.ID}`;
								if (!config.name) {
									// eslint-disable-next-line prefer-destructuring
									config.name = matches[1];
								}
								validMod = true;
							}
							log.debug(`Found file: ${file.name} under mod path ${modPath}`);
						}
					}
					return size;
				});

				if (validMod) {
					// log.debug(JSON.stringify(potentialMod, null, 2));
					config.size = fileSizes.reduce((acc: number, curr: number) => acc + curr);
					event.reply('mod-metadata-results', potentialMod);
					resolveExternal(potentialMod);
				} else {
					rejectExternal('Path does not contain a mod');
				}
			}
		} catch (e) {
			log.error(e);
			rejectExternal(e);
		}
	});
}

function chunk(arr: any[], size: number): any[][] {
	return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
}
// Read workshop mod metadata
async function processModChunk(
	event: Electron.IpcMainEvent,
	resolveExternal: (value: unknown) => void,
	rejectExternal: (reason?: any) => void,
	workshopIDs: string[]
) {
	Steamworks.getUGCDetails(
		workshopIDs,
		async (steamDetails: SteamUGCDetails[]) => {
			try {
				const modDetails: (Mod | null)[] = await Promise.all(
					steamDetails.map(async (steamUGCDetails: SteamUGCDetails) => {
						const workshopID: string = steamUGCDetails.publishedFileId;
						const tempID = workshopID ? `${workshopID}` : '';
						const potentialMod: Mod = {
							UID: `workshop:${workshopID}`,
							ID: tempID,
							type: ModType.WORKSHOP,
							WorkshopID: workshopID,
							config: { hasCode: false }
						};
						const config: ModConfig = potentialMod.config as ModConfig;
						config.dependsOn = steamUGCDetails.children;
						config.description = steamUGCDetails.description;
						config.name = steamUGCDetails.title;
						config.tags = steamUGCDetails.tagsDisplayNames;
						config.size = steamUGCDetails.fileSize;
						config.dateAdded = new Date(steamUGCDetails.timeAddedToUserList * 1000);
						config.lastUpdate = new Date(steamUGCDetails.timeUpdated * 1000);
						config.state = Steamworks.ugcGetItemState(workshopID);

						try {
							if (Steamworks.requestUserInformation(steamUGCDetails.steamIDOwner, true)) {
								await new Promise((resolve) => setTimeout(resolve, 5000)); // sleep until done (hopefully)
							}
							config.authors = [Steamworks.getFriendPersonaName(steamUGCDetails.steamIDOwner)];
						} catch (err) {
							console.error(`Failed to get username for Author ${steamUGCDetails.steamIDOwner}`);
							console.error(err);
							config.authors = [steamUGCDetails.steamIDOwner];
						}

						let validMod = false;
						const installInfo = Steamworks.ugcGetItemInstallInfo(workshopID);
						if (installInfo) {
							// augment workshop mod with data
							config.lastUpdate = new Date(installInfo.timestamp * 1000);
							config.size = parseInt(installInfo.sizeOnDisk, 10);
							try {
								const modPath = installInfo.folder;
								const files: Dirent[] = fs.readdirSync(modPath, { withFileTypes: true });
								files.forEach((file) => {
									if (file.isFile()) {
										if (file.isFile()) {
											if (file.name === 'preview.png') {
												config.preview = `image://${path.join(modPath, file.name)}`;
											} else if (file.name.match(/^(.*)\.dll$/)) {
												config.hasCode = true;
											} else if (file.name === 'ttsm_config.json') {
												Object.assign(potentialMod.config, JSON.parse(fs.readFileSync(path.join(modPath, file.name), 'utf8')));
											} else {
												const matches = file.name.match(/^(.*)_bundle$/);
												if (matches && matches.length > 1) {
													// eslint-disable-next-line prefer-destructuring
													potentialMod.ID = matches[1];
													if (!config.name) {
														// eslint-disable-next-line prefer-destructuring
														config.name = matches[1];
													}
													validMod = true;
												}
												log.debug(`Found file: ${file.name} under mod path ${modPath}`);
											}
										}
									}
								});
							} catch (error: any) {
								log.error(`Error parsing mod info for ${workshopID}`);
								log.error(error);
							}
						}
						if (validMod) {
							log.debug(JSON.stringify(potentialMod, null, 2));
						}
						return validMod ? potentialMod : null;
					})
				);
				event.reply('batch-mod-metadata-results', modDetails, workshopIDs.length);
				resolveExternal(modDetails);
			} catch (err) {
				log.error(`Error while processing Steam results`);
				log.error(err);
				rejectExternal(err);
			}
		},
		(err: Error) => {
			log.error(`Failed to fetch mod details for mods ${workshopIDs}`);
			log.error(err);
			event.reply('batch-mod-metadata-results', [], workshopIDs.length);
			rejectExternal(err);
		}
	);
}
ipcMain.on('read-mod-metadata', async (event, localDir: string) => {
	// get counts fist
	Atomics.store(COUNTS_ARRAY, 0, 0);
	Atomics.store(COUNTS_ARRAY, 1, 0);
	let localModDirs: string[] = [];
	try {
		localModDirs = fs
			.readdirSync(localDir, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name);
		Atomics.add(COUNTS_ARRAY, 0, localModDirs.length);
	} catch (e) {
		log.error(`Failed to read local mods in ${localModDirs}`);
	}
	let allWorkshopIDs: string[] = [];
	try {
		allWorkshopIDs = Steamworks.getSubscribedItems();
		Atomics.add(COUNTS_ARRAY, 0, allWorkshopIDs.length);
	} catch (e) {
		log.error(`Failed to get subscribed workshop mods`);
	}

	let hasModsToLoad = false;
	// load local mods
	if (localModDirs.length > 0) {
		hasModsToLoad = true;
		// eslint-disable-next-line no-plusplus
		for (let i = 0; i < localModDirs.length; i++) {
			try {
				// eslint-disable-next-line no-await-in-loop
				await new Promise((resolve, reject) => {
					processLocalMod(event, resolve, reject, path.join(localDir, localModDirs[i]));
				});
			} catch (e) {
				log.error('Error processing local mod');
				log.error(e);
			}
			Atomics.add(COUNTS_ARRAY, 1, 1);
			const newValue = Atomics.load(COUNTS_ARRAY, 1);
			const total = Atomics.load(COUNTS_ARRAY, 0);
			event.reply('progress-change', 'mod-load', newValue / total, 'Loading mod details');
		}
	}
	// load workshop mods
	if (allWorkshopIDs.length > 0) {
		hasModsToLoad = true;
		const chunks = chunk(allWorkshopIDs, 50);
		// eslint-disable-next-line no-plusplus
		for (let i = 0; i < chunks.length; i++) {
			try {
				// eslint-disable-next-line no-await-in-loop
				await new Promise((resolve, reject) => {
					processModChunk(event, resolve, reject, chunks[i]);
				});
			} catch (e) {
				log.error('Error processing chunk');
			}
			Atomics.add(COUNTS_ARRAY, 1, chunks[i].length);
			const newValue = Atomics.load(COUNTS_ARRAY, 1);
			const total = Atomics.load(COUNTS_ARRAY, 0);
			event.reply('progress-change', 'mod-load', newValue / total, 'Loading mod details');
		}
	}

	// If no mods - return immediately
	if (!hasModsToLoad) {
		event.reply('progress-change', 'mod-load', 1.0, 'Finished loading mods');
	}
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
ipcMain.handle('rename-collection', async (_event, collection: ModCollection, newName: string) => {
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
ipcMain.handle('launch-game', async (_event, workshopID, closeOnLaunch, args) => {
	log.info('Launching game with custom args:');
	const allArgs = ['+custom_mod_list', `[workshop:${workshopID}]`, ...args];
	log.info(allArgs);
	shell.openExternal(`steam://run/285920//${allArgs.join(' ')}/`);
	if (closeOnLaunch) {
		app.quit();
	}
	return true;
});

// Handle querying steam and parsing the result for a mod page
ipcMain.handle('query-steam-subscribed', async (_event) => {
	return Steamworks.getSubscribedItems();
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
