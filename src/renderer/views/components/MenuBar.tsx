import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router';
import { AppState } from 'renderer/model/AppState';
import { Menu } from 'antd';
import { AppstoreOutlined, FileTextOutlined, GithubOutlined, SettingOutlined } from '@ant-design/icons';

interface MenuState {
	currentTab: string;
}

interface MenuProps extends RouteComponentProps {
	disableNavigation?: boolean;
	currentTab: string;
	appState: AppState;
}

export default class MenuBar extends Component<MenuProps, MenuState> {
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

		return (
			<Menu
				theme="dark"
				selectedKeys={[currentTab]}
				mode="inline"
				disabled={disableNavigation}
				onClick={(e) => {
					if (e.key !== currentTab) {
						const { history } = this.props;
						switch (e.key) {
							case 'raw':
								if (loadBeforeNavigation) {
									history.push('/mods', { ...appState, ...{ targetPathAfterLoad: '/raw-mods', modErrors: undefined } });
								} else {
									history.push('/raw-mods', { ...appState, ...{ modErrors: undefined } });
								}
								break;
							case 'settings':
								history.push('/settings', appState);
								break;
							case 'main':
								if (loadBeforeNavigation) {
									history.push('/mods', { ...appState, ...{ targetPathAfterLoad: '/main', modErrors: undefined } });
								} else {
									history.push('/main', { ...appState, ...{ modErrors: undefined } });
								}
								break;
							case 'steam':
								if (loadBeforeNavigation) {
									history.push('/mods', { ...appState, ...{ targetPathAfterLoad: '/steam', modErrors: undefined } });
								} else {
									history.push('/steam', { ...appState, ...{ modErrors: undefined } });
								}
								break;
							case 'ttqmm':
								if (loadBeforeNavigation) {
									history.push('/mods', { ...appState, ...{ targetPathAfterLoad: '/ttqmm', modErrors: undefined } });
								} else {
									history.push('/ttqmm', { ...appState, ...{ modErrors: undefined } });
								}
								break;
							default:
								break;
						}
					}
				}}
			>
				<Menu.Item key="main" icon={<AppstoreOutlined />}>
					Mod Collections
				</Menu.Item>
				<Menu.Item key="raw" icon={<FileTextOutlined />}>
					Raw Modlist
				</Menu.Item>
				<Menu.Item key="ttqmm" icon={<GithubOutlined />}>
					TTQMM Browser
				</Menu.Item>
				<Menu.Item key="settings" icon={<SettingOutlined />}>
					Settings
				</Menu.Item>
			</Menu>
		);
	}
}
