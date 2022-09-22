/* eslint-disable react/no-unused-state */
/* eslint-disable no-nested-ternary */
import React, { Component } from 'react';
import { Layout } from 'antd';

import { AppState, SessionMods, ModCollection, ValidChannel } from 'model';
import { Outlet, useLocation, Location, useNavigate, NavigateFunction } from 'react-router-dom';

import api from 'renderer/Api';
import MenuBar from './components/MenuBar';
import { DEFAULT_CONFIG } from './Constants';

const { Sider } = Layout;

class App extends Component<{ location: Location; navigate: NavigateFunction }, AppState> {
	constructor(props: { location: Location; navigate: NavigateFunction }) {
		super(props);
		this.state = {
			config: DEFAULT_CONFIG,
			userDataPath: '',
			mods: new SessionMods('', []),
			workshopToModID: new Map<bigint, string>(),
			allCollections: new Map<string, ModCollection>(),
			allCollectionNames: new Set<string>(),
			activeCollection: undefined,
			firstModLoad: false,
			sidebarCollapsed: true,
			searchString: '',
			launchingGame: false,
			initializedConfigs: false,
			savingConfig: false,
			configErrors: {},
			updateState: this.updateState.bind(this),
			navigate: this.navigate.bind(this)
		};

		this.onModLoadRequested = this.onModLoadRequested.bind(this);
	}

	componentDidMount() {
		const { navigate } = this.props;
		setTimeout(() => {
			navigate('/loading/steamworks');
		}, 1);
		api.on(ValidChannel.MOD_REFRESH_REQUESTED, this.onModLoadRequested);
		api.on(ValidChannel.RELOAD_STEAMWORKS, () => {
			navigate('/loading/steamworks');
		});
	}

	componentWillUnmount() {
		api.removeListener(ValidChannel.MOD_REFRESH_REQUESTED, this.onModLoadRequested);
	}

	onModLoadRequested() {
		this.setState({ loadingMods: true });
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	updateState(props: any, callback?: () => void) {
		this.setState({ ...props }, () => {
			if (callback) {
				callback();
			}
		});
	}

	navigate(path: string) {
		const { navigate } = this.props;
		navigate(path);
	}

	render() {
		const { launchingGame, sidebarCollapsed, savingConfig, madeConfigEdits, configErrors } = this.state;
		const { location } = this.props;
		return (
			<div style={{ display: 'flex', width: '100%', height: '100%' }}>
				<Layout style={{ minHeight: '100vh' }}>
					<Sider
						className="MenuBar"
						collapsible
						collapsed={sidebarCollapsed}
						onCollapse={(collapsed) => {
							this.setState({ sidebarCollapsed: collapsed });
						}}
					>
						<div className="logo" />
						<MenuBar
							disableNavigation={
								launchingGame ||
								location.pathname.includes('loading') ||
								savingConfig ||
								madeConfigEdits ||
								(!!configErrors && Object.keys(configErrors).length > 0)
							}
							appState={this.state}
						/>
					</Sider>
					<Outlet context={this.state} />
				</Layout>
			</div>
		);
	}
}

export default () => {
	return <App location={useLocation()} navigate={useNavigate()} />;
};
