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
import { app, BrowserWindow, shell, ipcMain, protocol } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import fs from 'fs';
import child_process from 'child_process';
import axios from 'axios';

import querySteam from './steam';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { ModType, ModConfig, Mod } from './model';

const sleep = require('util').promisify(setTimeout);
const psList = require('ps-list');

export default class AppUpdater {
	constructor() {
		log.transports.file.level = 'info';
		autoUpdater.logger = log;
		autoUpdater.checkForUpdatesAndNotify();
	}
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
	const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
	console.log(msgTemplate(arg));
	event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
	const sourceMapSupport = require('source-map-support');
	sourceMapSupport.install();
}

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
	require('electron-debug')({ showDevTools: false });
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
		.catch(console.log);
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
		width: 1024,
		height: 728,
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

	// @TODO: Use 'ready-to-show' event
	//        https://github.com/electron/electron/blob/main/docs/api/browser-window.md#using-ready-to-show-event
	mainWindow.webContents.on('did-finish-load', () => {
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

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) createWindow();
});

// close and exit with error code
ipcMain.on('exit', (_event, code) => {
	app.exit(code);
});

// close all windows
ipcMain.on('close', () => {
	console.log('Trying to close mm');
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
	// await sleep(5000);
	fs.readdir(modPath, { withFileTypes: true }, async (err, files) => {
		if (err) {
			console.error(err);
			event.reply('mod-metadata-results', null);
		} else {
			const potentialMod: Mod = {
				ID: workshopID ? `${workshopID}` : '',
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
							}
						}
						if (file.name === 'ttmm.json') {
							const ttmmConfig = JSON.parse(fs.readFileSync(path.join(modPath, file.name), 'utf8'));
							potentialMod.ID = ttmmConfig.CloudName;
							config.dependsOn = ttmmConfig.RequiredModNames;
							config.loadAfter = ttmmConfig.RequiredModNames;
							config.description = ttmmConfig.InlineDescription;
						}
					} else {
						const matches = file.name.match(/^(.*)_bundle$/);
						if (matches && matches.length > 1) {
							potentialMod.ID = matches[1];
							if (!config.name) {
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
					console.error(error);
				}
			}

			event.reply('mod-metadata-results', validMod ? potentialMod : null);
		}
	});
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
ipcMain.handle('launch-game', async (_event, steamExec, workshopID, closeOnLaunch, modList) => {
	console.log('Launching game with mod list:');
	console.log(modList);
	await child_process.spawn(steamExec, ['-applaunch', '285920', '+custom_mod_list', `[workshop:${workshopID}]`], {
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
	console.log(`Writing json file ${filepath}`);
	console.log(`Writing ${data} to file ${filepath}`);
	return fs.writeFileSync(filepath, data, 'utf8');
});

// Update a json file
ipcMain.handle('update-file', async (_event, pathParams: PathParams, newData) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	console.log(`Updating json file ${filepath}`);
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
		console.log(`Writing ${JSON.stringify(data)} to file ${filepath}`);
		return fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf8');
	} catch (error) {
		console.log(`Unable to parse file ${filepath} contents into json: ${raw}`);
		console.error(error);
		return fs.writeFileSync(filepath, JSON.stringify(newData, null, 4), 'utf8');
	}
});

// Delete a json file
ipcMain.handle('delete-file', async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	console.log(`Deleting file ${filepath}`);
	return fs.unlinkSync(filepath);
});

// see what's in a directory
ipcMain.handle('list-dir', async (_event, pathParams: PathParams) => {
	const dirpath = path.join(...pathParams.prefixes, pathParams.path);
	console.log(`Listing dir contents ${dirpath}`);
	return fs.readdirSync(dirpath);
});

// see sub-directories
ipcMain.handle('list-subdirs', async (_event, pathParams: PathParams) => {
	const dirpath = path.join(...pathParams.prefixes, pathParams.path);
	console.log(`Listing subdirs ${dirpath}`);
	return fs
		.readdirSync(dirpath, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name);
});

// Check if path exists
ipcMain.handle('mkdir', async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	console.log(`Mkdir ${filepath}`);
	return fs.mkdirSync(filepath);
});

// Read json file
ipcMain.handle('read-file', async (_event, pathParams: PathParams) => {
	await sleep(5000);
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	console.log(`Reading file ${filepath}`);
	return fs.readFileSync(filepath, 'utf8').toString();
});

// Check if path exists
ipcMain.handle('path-exists', async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	console.log(`Checking if path exists: ${filepath}`);
	return fs.existsSync(filepath);
});

// Check if have access to path
ipcMain.handle('path-access', async (_event, pathParams: PathParams) => {
	const filepath = path.join(...pathParams.prefixes, pathParams.path);
	console.log(`Checking access to ${filepath}`);
	try {
		// eslint-disable-next-line no-bitwise
		fs.accessSync(filepath, fs.constants.R_OK | fs.constants.W_OK);
		return true;
	} catch (err) {
		console.error(`bad access to file ${filepath}!`, err);
		return false;
	}
});

// get user data
// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
ipcMain.handle('user-data-path', async () => {
	return app.getPath('userData');
});
