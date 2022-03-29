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

		const template = process.platform === 'darwin' ? this.buildDarwinTemplate() : this.buildDefaultTemplate();

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

	buildDarwinTemplate(): MenuItemConstructorOptions[] {
		const subMenuAbout: DarwinMenuItemConstructorOptions = {
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
		const subMenuEdit: DarwinMenuItemConstructorOptions = {
			label: 'Edit',
			submenu: [
				{ label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
				{ label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
				{ type: 'separator' }
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
		const subMenuWindow: DarwinMenuItemConstructorOptions = {
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
		return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
	}

	buildDefaultTemplate(): MenuItemConstructorOptions[] {
		const templateDefault: MenuItemConstructorOptions[] = [
			{
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
			},
			{
				label: '&View',
				submenu: [
					{
						label: '&Reload',
						accelerator: 'Ctrl+R',
						click: () => {
							this.mainWindow.webContents.reload();
						}
					},
					{
						label: 'Toggle &Full Screen',
						accelerator: 'F11',
						click: () => {
							this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
						}
					},
					{
						label: 'Toggle &Developer Tools',
						accelerator: 'F12',
						click: () => {
							this.mainWindow.webContents.toggleDevTools();
						}
					}
				]
			},
			{
				label: 'Check for Updates',
				click: checkForUpdates
			},
			{
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
			}
		];

		return templateDefault;
	}
}
