import React, { Component } from 'react';
import { AppState } from 'renderer/model/AppState';
import { Menu } from 'antd';
import { AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, NavigateFunction } from 'react-router-dom';

interface MenuProps {
	disableNavigation?: boolean;
	appState: AppState;
	navigate: NavigateFunction;
}

class MenuBar extends Component<MenuProps, never> {
	CONFIG_PATH: string | undefined = undefined;

	render() {
		const { disableNavigation, appState } = this.props;
		const { config, navigate, updateState } = appState;
		const loadModsOnNavigate = !appState.firstModLoad;
		const MenuIconStyle = { fontSize: 28, lineHeight: 0, marginLeft: -4 };
		const MenuItemStyle = { display: 'flex', alignItems: 'center' };

		return (
			<Menu
				id="MenuBar"
				theme="dark"
				className="MenuBar"
				selectedKeys={[config.currentPath]}
				mode="inline"
				disabled={disableNavigation}
				onClick={(e) => {
					if (e.key !== config.currentPath) {
						config.currentPath = e.key;
						updateState({});
						switch (e.key) {
							case 'raw':
								if (loadModsOnNavigate) {
									updateState({ loadingMods: true });
								}
								navigate('/collections/raw-mods');
								break;
							case 'settings':
								navigate('/settings');
								break;
							case 'main':
								if (loadModsOnNavigate) {
									updateState({ loadingMods: true });
								}
								navigate('/collections/main');
								break;
							case 'steam':
								if (loadModsOnNavigate) {
									updateState({ loadingMods: true });
								}
								navigate('/browse/steam');
								break;
							case 'ttqmm':
								if (loadModsOnNavigate) {
									updateState({ loadingMods: true });
								}
								navigate('/browse/ttqmm');
								break;
							default:
								break;
						}
					}
				}}
			>
				<Menu.Item key="collections/main" style={MenuItemStyle} icon={<AppstoreOutlined style={MenuIconStyle} />}>
					Mod Collections
				</Menu.Item>
				<Menu.Item key="settings" style={MenuItemStyle} icon={<SettingOutlined style={MenuIconStyle} />}>
					Settings
				</Menu.Item>
			</Menu>
		);
	}
}

export default (props: { disableNavigation: boolean; appState: AppState }) => {
	return <MenuBar {...props} navigate={useNavigate()} />;
};
