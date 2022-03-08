import React, { Component } from 'react';
import { AppState } from 'renderer/model/AppState';
import { Menu } from 'antd';
import { AppstoreOutlined, FileTextOutlined, GithubOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, NavigateFunction } from 'react-router-dom';

interface MenuState {
	currentTab: string;
}

interface MenuProps {
	disableNavigation?: boolean;
	currentTab: string;
	appState: AppState;
	navigate: NavigateFunction;
}

class MenuBar extends Component<MenuProps, MenuState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: MenuProps) {
		super(props);

		const { currentTab } = props;

		this.state = {
			currentTab
		};
	}

	render() {
		const { disableNavigation, appState } = this.props;
		const { currentTab } = this.state;
		const loadBeforeNavigation = !appState.firstModLoad;
		const MenuIconStyle = { fontSize: 28, lineHeight: 0, marginLeft: -4 };
		const MenuItemStyle = { display: 'flex', alignItems: 'center' };

		return (
			<Menu
				id="MenuBar"
				theme="dark"
				className="MenuBar"
				selectedKeys={[currentTab]}
				mode="inline"
				disabled={disableNavigation}
				onClick={(e) => {
					if (e.key !== currentTab) {
						this.setState({ currentTab: e.key });
						switch (e.key) {
							case 'raw':
								if (loadBeforeNavigation) {
									appState.updateState({ targetPathAfterLoad: '/collections/raw-mods' }, () => { appState.navigate('/loading/mods') });
								} else {
									appState.navigate('/collections/raw-mods');
								}
								break;
							case 'settings':
								appState.navigate('/settings');
								break;
							case 'main':
								if (loadBeforeNavigation) {
									appState.updateState({ targetPathAfterLoad: '/colections/main' }, () => { appState.navigate('/loading/mods') });
								} else {
									appState.navigate('/collections/main');
								}
								break;
							case 'steam':
								if (loadBeforeNavigation) {
									appState.updateState({ targetPathAfterLoad: '/browse/steam' }, () => { appState.navigate('/loading/mods') });
								} else {
									appState.navigate('/browse/steam');
								}
								break;
							case 'ttqmm':
								if (loadBeforeNavigation) {
									appState.updateState({ targetPathAfterLoad: '/browse/ttqmm' }, () => { appState.navigate('/loading/mods') });
									appState.navigate('/loading/mods');
								} else {
									appState.navigate('/browse/ttqmm');
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

export default (props: any) => {
	return <MenuBar {...props} navigate={useNavigate()}/>;
}
