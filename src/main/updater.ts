/**
 * Adapted from: https://github.com/electron-userland/electron-builder/blob/docs-deprecated/encapsulated%20manual%20update%20via%20menu.js
 *
 * Import steps:
 * 1. create `updater.js` for the code snippet
 * 2. require `updater.js` for menu implementation, and set `checkForUpdates` callback from `updater` for the click property of `Check Updates...` MenuItem.
 */
import { dialog, MenuItem } from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';

let updater: MenuItem | null = null;
autoUpdater.autoDownload = false;
autoUpdater.logger = log;

autoUpdater.on('error', (error: Error) => {
	dialog.showErrorBox('Error: ', error == null ? 'unknown' : (error.stack || error).toString());
	if (updater) {
		updater.enabled = true;
		updater = null;
	}
});

autoUpdater.on('update-available', () => {
	// eslint-disable-next-line promise/catch-or-return
	dialog
		.showMessageBox({
			type: 'info',
			title: 'Found Updates',
			message: 'Found updates, do you want update now?',
			buttons: ['Yes', 'No']
		})
		.then((res) => {
			// eslint-disable-next-line promise/always-return
			if (res.response === 0) {
				autoUpdater.downloadUpdate();
			} else if (updater) {
				updater.enabled = true;
				updater = null;
			}
		});
});

autoUpdater.on('update-not-available', () => {
	if (updater) {
		dialog.showMessageBox({
			title: 'No Updates',
			message: 'Current version is up-to-date.'
		});
		updater.enabled = true;
		updater = null;
	}
});

autoUpdater.on('update-downloaded', () => {
	// eslint-disable-next-line promise/catch-or-return
	dialog
		.showMessageBox({
			title: 'Install Updates',
			message: 'Updates downloaded, application will quit for update...'
		})
		// eslint-disable-next-line promise/always-return
		.then(() => {
			setImmediate(() => autoUpdater.quitAndInstall());
		});
});

// export this to MenuItem click callback
export default function checkForUpdates(menuItem: MenuItem) {
	updater = menuItem;
	updater.enabled = false;
	autoUpdater.checkForUpdates();
}
