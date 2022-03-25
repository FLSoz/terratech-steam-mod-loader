// eslint-disable-next-line prettier/prettier
const { contextBridge, ipcRenderer } = require('electron');
const log = require('electron-log');
const { ValidChannel } = require('model');

const validChannels = Object.values(ValidChannel);

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
		exit: (code: number) => {
			ipcRenderer.sendSync('exit', code);
		},

		// Generic ipcRenderer API replication
		send: (channel: string, ...args: unknown[]) => {
			if (validChannels.includes(channel)) {
				ipcRenderer.send(channel, ...args);
			}
		},
		sendSync: (channel: string, ...args: unknown[]) => {
			if (validChannels.includes(channel)) {
				return ipcRenderer.sendSync(channel, ...args);
			}
			return null;
		},
		removeListener: (channel: string, listener: (...args: unknown[]) => void) => {
			if (validChannels.includes(channel)) {
				ipcRenderer.removeListener(channel, listener);
			}
		},
		removeAllListeners: (channel: string) => {
			if (validChannels.includes(channel)) {
				ipcRenderer.removeAllListeners(channel);
			}
		},
		invoke: (channel: string, ...args: unknown[]) => {
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				return ipcRenderer.invoke(channel, ...args);
			}
			return null;
		},
		on: (channel: string, func: (...args: unknown[]) => void) => {
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				ipcRenderer.on(channel, (event, ...args) => func(...args));
			}
		},
		once: (channel: string, func: (...args: unknown[]) => void) => {
			if (validChannels.includes(channel)) {
				// Deliberately strip event as it includes `sender`
				ipcRenderer.once(channel, (event, ...args) => func(...args));
			}
		}
	}
});
