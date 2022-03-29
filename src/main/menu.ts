import { app, Menu, shell, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import checkForUpdates from './updater';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
	selector?: string;
	submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
	mainWindow: BrowserWindow;

	constructor(mainWindow: BrowserWindow) {
		this.mainWindow = mainWindow;
	}

	buildMenu(): Menu {
		if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
			this.setupDevelopmentEnvironment();
		}
		const template = this.buildDefaultTemplate();
		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);
		return menu;
	}

	setupDevelopmentEnvironment(): void {
		this.mainWindow.webContents.on('context-menu', (_, props) => {
			const { x, y } = props;
			Menu.buildFromTemplate([
				{
					label: 'Inspect element',
					click: () => {
						this.mainWindow.webContents.inspectElement(x, y);
					}
				}
			]).popup({ window: this.mainWindow });
		});
	}

	buildDefaultTemplate(): MenuItemConstructorOptions[] {
		const subMenuAboutDarwin: DarwinMenuItemConstructorOptions = {
			label: 'TTSMM',
			submenu: [
				{
					label: 'About TTSMM',
					selector: 'orderFrontStandardAboutPanel:'
				},
				{ type: 'separator' },
				{ label: 'Services', submenu: [] },
				{ type: 'separator' },
				{
					label: 'Hide TTSMM',
					accelerator: 'Command+H',
					selector: 'hide:'
				},
				{
					label: 'Hide Others',
					accelerator: 'Command+Shift+H',
					selector: 'hideOtherApplications:'
				},
				{ label: 'Show All', selector: 'unhideAllApplications:' },
				{ type: 'separator' },
				{
					label: 'Quit',
					accelerator: 'Command+Q',
					click: () => {
						app.quit();
					}
				}
			]
		};
		const subMenuEditDarwin: DarwinMenuItemConstructorOptions = {
			label: 'Edit',
			submenu: [
				{ label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
				{ label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
				{ type: 'separator' }
			]
		};
		const subMenuEdit: MenuItemConstructorOptions = {
			label: '&Edit',
			submenu: [
				{
					label: '&Undo',
					accelerator: 'Ctrl+Z',
					click: () => {}
				},
				{
					label: '&Redo',
					accelerator: 'Ctrl+Y',
					click: () => {}
				}
			]
		};
		const subMenuView: MenuItemConstructorOptions = {
			label: 'View',
			submenu: [
				{
					label: 'Reload',
					accelerator: 'Command+R',
					click: () => {
						this.mainWindow.webContents.reload();
					}
				},
				{
					label: 'Toggle Full Screen',
					accelerator: 'Ctrl+Command+F',
					click: () => {
						this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
					}
				},
				{
					label: 'Toggle Developer Tools',
					accelerator: 'F12',
					click: () => {
						this.mainWindow.webContents.toggleDevTools();
					}
				}
			]
		};
		const subMenuWindowDarwin: DarwinMenuItemConstructorOptions = {
			label: 'Window',
			submenu: [
				{
					label: 'Minimize',
					accelerator: 'Command+M',
					selector: 'performMiniaturize:'
				},
				{ label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
				{ type: 'separator' },
				{ label: 'Bring All to Front', selector: 'arrangeInFront:' }
			]
		};
		const subMenuHelp: MenuItemConstructorOptions = {
			label: 'Help',
			submenu: [
				{
					label: 'TerraTech Forums',
					click() {
						shell.openExternal('https://forum.terratechgame.com/index.php');
					}
				},
				{
					label: `TerraTech Discord`,
					click() {
						shell.openExternal('https://discord.com/invite/terratechgame');
					}
				},
				{
					label: 'Documentation',
					click() {
						shell.openExternal('https://github.com/FLSoz/terratech-steam-mod-loader/#readme');
					}
				},
				{
					label: 'Search Issues',
					click() {
						shell.openExternal('https://github.com/FLSoz/terratech-steam-mod-loader/issues');
					}
				}
			]
		};
		const subMenuUpdates: MenuItemConstructorOptions = {
			label: '&Updates',
			submenu: [
				{
					label: 'Check for updates',
					click: checkForUpdates
				}
			]
		};

		return process.platform === 'darwin'
			? [subMenuAboutDarwin, subMenuEditDarwin, subMenuView, subMenuWindowDarwin, subMenuUpdates, subMenuHelp]
			: [subMenuEdit, subMenuView, subMenuUpdates, subMenuHelp];
	}
}
