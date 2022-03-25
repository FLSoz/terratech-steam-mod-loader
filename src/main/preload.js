// eslint-disable-next-line prettier/prettier
const { contextBridge, ipcRenderer } = require('electron');
const log = require('electron-log');

const validChannels = [
	// Check if game is running
	'game-running',
	'launch-game',

	// IO file management
	'read-file',
	'write-file',
	'update-file',
	'delete-file',
	'list-dir',
	'list-subdirs',
	'mkdir',
	'path-exists',
	'path-access',

	// Return user data path
	'user-data-path',

	// Generic channel for progress change events
	'progress-change',

	// Mod management
	'query-steam-subscribed',
	'read-mod-metadata',
	'mod-metadata-results',
	'batch-mod-metadata-results',
	'subscribe-mod',
	'unsubscribe-mod',
	'subscribe-mod-result',
	'unsubscribe-mod-result',
	'download-mod',
	'download-mod-result',
	'mod-install-result',

	// Config management
	'read-config',
	'update-config',

	// Collection management
	'read-collection',
	'rename-collection',
	'delete-collection',
	'collection-results',
	'read-collections-list',
	'update-collection',

	// File Explorer management
	'select-path',
	'select-path-result',

	// External go to mod details
	'open-mod-path',
	'open-mod-browser',
	'open-mod-steam'
];

contextBridge.exposeInMainWorld('electron', {
	platform: process.platform,
	log: log.functions,
	ipcRenderer: {
		myPing() {
			ipcRenderer.send('ipc-example', 'ping');
		},

		close: () => {
			ipcRenderer.sendSync('close');
		},
		exit: (code) => {
			ipcRenderer.sendSync('exit', code);
		},

		// Generic ipcRenderer API replication
		send: (channel, ...args) => {
			if (validChannels.includes(channel)) {
				ipcRenderer.send(channel, ...args);
			}
		},
		sendSync: (channel, ...args) => {
			if (validChannels.includes(channel)) {
				return ipcRenderer.sendSync(channel, ...args);
			}
			return null;
		},
		removeListener: (channel, listener) => {
			if (validChannels.includes(channel)) {
				ipcRenderer.removeListener(channel, listener);
			}
		},
		removeAllListeners: (channel) => {
			if (validChannels.includes(channel)) {
				ipcRenderer.removeAllListeners(channel);
			}
		},
		invoke: (channel, ...args) => {
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				return ipcRenderer.invoke(channel, ...args);
			}
			return null;
		},
		on(channel, func) {
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				ipcRenderer.on(channel, (event, ...args) => func(...args));
			}
		},
		once(channel, func) {
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				ipcRenderer.once(channel, (event, ...args) => func(...args));
			}
		}
	}
});
