/* eslint-disable no-nested-ternary */
import React, { Component } from 'react';
import { Layout } from 'antd';

import { AppState, CollectionViewState } from 'renderer/model/AppState';
import MenuBar from './components/MenuBar';
import CollectionManagerComponent from './components/CollectionManagerComponent';
import { useNavigate, useLocation, NavigateFunction, Location } from 'react-router-dom';

const { Sider } = Layout;

class MainView extends Component<{navigate: NavigateFunction, location: Location}, CollectionViewState> {

	constructor(props: {navigate: NavigateFunction, location: Location}) {
		super(props);
		const appState = this.props.location.state as AppState;
		this.state = {
			launchingGame: false,
			...appState
		};
	}

	refreshMods() {
		this.props.navigate('/mods', {state: this.state});
	}

	render() {
		const { launchingGame, sidebarCollapsed } = this.state;

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
						<MenuBar disableNavigation={launchingGame} currentTab="main" appState={this.state} />
					</Sider>
					<CollectionManagerComponent
						setLaunchingGame={(launching: boolean) => {
							this.setState({ launchingGame: launching });
						}}
						appState={this.state}
						refreshModsCallback={() => {}}
					/>
				</Layout>
			</div>
		);
	}
}

export default (props: any) => {
	return <MainView {...props} navigate={useNavigate()} location={useLocation()}/>;
}
