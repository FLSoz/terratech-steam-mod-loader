import React, { Component } from 'react';
import { AppState } from 'renderer/model/AppState';
import { Menu } from 'antd';
import { AppstoreOutlined, FileTextOutlined, GithubOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, NavigateFunction } from 'react-router-dom';

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
						switch (e.key) {
							case 'raw':
								if (loadBeforeNavigation) {
									this.props.navigate('/mods', {state: { ...appState, ...{ targetPathAfterLoad: '/raw-mods', modErrors: undefined } }});
								} else {
									this.props.navigate('/raw-mods', {state: { ...appState, ...{ modErrors: undefined } }});
								}
								break;
							case 'settings':
								this.props.navigate('/settings', {state: appState});
								break;
							case 'main':
								if (loadBeforeNavigation) {
									this.props.navigate('/mods', {state: { ...appState, ...{ targetPathAfterLoad: '/main', modErrors: undefined } }});
								} else {
									this.props.navigate('/main', {state: { ...appState, ...{ modErrors: undefined } }});
								}
								break;
							case 'steam':
								if (loadBeforeNavigation) {
									this.props.navigate('/mods', {state: { ...appState, ...{ targetPathAfterLoad: '/steam', modErrors: undefined } }});
								} else {
									this.props.navigate('/steam', {state: { ...appState, ...{ modErrors: undefined } }});
								}
								break;
							case 'ttqmm':
								if (loadBeforeNavigation) {
									this.props.navigate('/mods', {state: { ...appState, ...{ targetPathAfterLoad: '/ttqmm', modErrors: undefined } }});
								} else {
									this.props.navigate('/ttqmm', {state: { ...appState, ...{ modErrors: undefined } }});
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
				<Menu.Item key="raw" style={MenuItemStyle} icon={<FileTextOutlined style={MenuIconStyle} />}>
					Raw Modlist
				</Menu.Item>
				<Menu.Item key="ttqmm" style={MenuItemStyle} icon={<GithubOutlined style={MenuIconStyle} />}>
					TTQMM Browser
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
