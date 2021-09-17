// eslint-disable-next-line prettier/prettier
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
	ipcRenderer: {
		myPing() {
			ipcRenderer.send('ipc-example', 'ping');
		},
		platform: process.platform,

		close: () => {
			ipcRenderer.sendSync('close');
		},
		exit: (code) => {
			ipcRenderer.sendSync('exit', code);
		},

		// Generic ipcRenderer API replication
		send: (channel, data) => {
			ipcRenderer.send(channel, data);
		},
		sendSync: (channel, ...args) => {
			return ipcRenderer.sendSync(channel, ...args);
		},
		removeListener: (channel, listener) => {
			ipcRenderer.removeListener(channel, listener);
		},
		removeAllListeners: (channel) => {
			ipcRenderer.removeAllListeners(channel);
		},
		invoke: (channel, ...args) => {
			const validChannels = [
				'launch-steam',
				'write-file',
				'update-file',
				'delete-file',
				'list-dir',
				'mkdir',
				'path-exists',
				'path-access',
				'user-data-path',
				'read-mod-metadata'
			];
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				return ipcRenderer.invoke(channel, ...args);
			}
			return null;
		},
		on(channel, func) {
			const validChannels = ['ipc-example'];
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				ipcRenderer.on(channel, (event, ...args) => func(...args));
			}
		},
		once(channel, func) {
			const validChannels = ['ipc-example'];
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				ipcRenderer.once(channel, (event, ...args) => func(...args));
			}
		}
	}
});
