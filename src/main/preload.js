// eslint-disable-next-line prettier/prettier
const { contextBridge, ipcRenderer } = require('electron');


const validChannels = [
	'launch-steam',
	'write-file',
	'update-file',
	'delete-file',
	'list-dir',
	'list-subdirs',
	'mkdir',
	'path-exists',
	'path-access',
	'user-data-path',
	'read-mod-metadata',
	'mod-metadata-results'
];


contextBridge.exposeInMainWorld('electron', {
	platform: process.platform,
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
