import React, { Component } from 'react';
import { AppState } from 'model';
import { Menu } from 'antd';
import { AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import api from 'renderer/Api';

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
						updateState({ savingConfig: true });
						api
							.updateConfig(config)
							.catch((error) => {
								api.logger.error(error);
								updateState({ config });
							})
							.finally(() => {
								updateState({ savingConfig: false });
							});
						if (loadModsOnNavigate) {
							updateState({ loadingMods: true });
						}
						navigate(e.key);
					}
				}}
			>
				<Menu.Item key="/collections/main" style={MenuItemStyle} icon={<AppstoreOutlined style={MenuIconStyle} />}>
					Mod Collections
				</Menu.Item>
				<Menu.Item key="/settings" style={MenuItemStyle} icon={<SettingOutlined style={MenuIconStyle} />}>
					Settings
				</Menu.Item>
			</Menu>
		);
	}
}

export default (props: { disableNavigation: boolean; appState: AppState }) => {
	return <MenuBar {...props} navigate={useNavigate()} />;
};
