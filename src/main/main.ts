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
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import fs from 'fs';
import child_process from 'child_process';

import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

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

const isDevelopment =
	process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

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
		.catch(console.log);
};

const createWindow = async () => {
	if (
		process.env.NODE_ENV === 'development' ||
		process.env.DEBUG_PROD === 'true'
	) {
		await installExtensions();
	}

	const RESOURCES_PATH = app.isPackaged
		? path.join(process.resourcesPath, 'assets')
		: path.join(__dirname, '../../assets');

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

// Read raw app metadata from the given paths
ipcMain.handle('read-mod-metadata', async (_event, modPath) => {
	return ['Hello world'];
});

// Launch steam as separate process
ipcMain.handle('launch-steam', async (_event, steamDir, workshopID) => {
	await child_process.spawn(
		steamDir,
		['-applaunch', '285920', '+custom_mod_list', `[workshop:${workshopID}]`],
		{
			detached: true
		}
	);
	return true;
});

// Write a json file to a certain location
ipcMain.handle('write-file', async (_event, filepath, data) => {
	console.log(`Writing ${JSON.stringify(data)} to file ${filepath}`);
	return fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf8');
});

// Update a json file
ipcMain.handle('update-file', async (_event, filepath, newData) => {
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
ipcMain.handle('delete-file', async (_event, filepath) => {
	return fs.unlinkSync(filepath);
});

// see what's in a directory
ipcMain.handle('list-dir', async (_event, dir) => {
	console.log(dir);
	return fs.readdirSync(dir);
});

// Check if path exists
ipcMain.handle('mkdir', async (_event, filepath) => {
	console.log(filepath);
	return fs.mkdirSync(filepath);
});

// Read json file
ipcMain.handle('read-file', async (_event, filepath) => {
	return fs.readFileSync(filepath, 'utf8');
});

// Check if path exists
ipcMain.handle('path-exists', async (_event, filepath) => {
	console.log(filepath);
	return fs.existsSync(filepath);
});

// Check if have access to path
ipcMain.handle('path-access', async (_event, filepath) => {
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
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
ipcMain.handle('user-data-path', async () => {
	return app.getPath('userData');
});
