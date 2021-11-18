/* eslint-disable no-nested-ternary */
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { Layout } from 'antd';

import { AppState, CollectionViewState } from 'renderer/model/AppState';
import MenuBar from './components/MenuBar';
import CollectionManagerComponent from './components/CollectionManagerComponent';

const { Sider } = Layout;

class MainView extends Component<RouteComponentProps, CollectionViewState> {
	constructor(props: RouteComponentProps) {
		super(props);
		const appState = props.location.state as AppState;
		this.state = {
			launchingGame: false,
			...appState
		};
	}

	refreshMods() {
		const { history } = this.props;
		history.push('/mods', this.state);
	}

	render() {
		const { launchingGame, sidebarCollapsed } = this.state;
		const { history, location, match } = this.props;

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
						<MenuBar disableNavigation={launchingGame} currentTab="main" history={history} location={location} match={match} appState={this.state} />
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
export default withRouter(MainView);
