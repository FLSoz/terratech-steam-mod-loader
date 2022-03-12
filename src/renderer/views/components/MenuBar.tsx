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
		const loadBeforeNavigation = !appState.firstModLoad;
		const MenuIconStyle = { fontSize: 28, lineHeight: 0, marginLeft: -4 };
		const MenuItemStyle = { display: 'flex', alignItems: 'center' };

		return (
			<Menu
				id="MenuBar"
				theme="dark"
				className="MenuBar"
				selectedKeys={[config.currentTab]}
				mode="inline"
				disabled={disableNavigation}
				onClick={(e) => {
					if (e.key !== config.currentTab) {
						config.currentTab = e.key;
						updateState({});
						switch (e.key) {
							case 'raw':
								if (loadBeforeNavigation) {
									updateState({ targetPathAfterLoad: '/collections/raw-mods' }, () => {
										navigate('/loading/mods');
									});
								} else {
									navigate('/collections/raw-mods');
								}
								break;
							case 'settings':
								navigate('/settings');
								break;
							case 'main':
								if (loadBeforeNavigation) {
									updateState({ targetPathAfterLoad: '/collections/main' }, () => {
										navigate('/loading/mods');
									});
								} else {
									navigate('/collections/main');
								}
								break;
							case 'steam':
								if (loadBeforeNavigation) {
									updateState({ targetPathAfterLoad: '/browse/steam' }, () => {
										navigate('/loading/mods');
									});
								} else {
									navigate('/browse/steam');
								}
								break;
							case 'ttqmm':
								if (loadBeforeNavigation) {
									updateState({ targetPathAfterLoad: '/browse/ttqmm' }, () => {
										navigate('/loading/mods');
									});
									navigate('/loading/mods');
								} else {
									navigate('/browse/ttqmm');
								}
								break;
							default:
								break;
						}
					}
				}}
			>
				<Menu.Item key="main" style={MenuItemStyle} icon={<AppstoreOutlined style={MenuIconStyle} />}>
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
