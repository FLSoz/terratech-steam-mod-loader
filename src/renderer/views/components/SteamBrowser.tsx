import React, { Component } from 'react';
import { AppState } from 'renderer/model/AppState';
import { Layout, Skeleton } from 'antd';
import MenuBar from './MenuBar';
import { useNavigate, useLocation, Location } from 'react-router-dom';

const { Sider, Content } = Layout;

class SteamBrowserView extends Component<{location: Location}, AppState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: {location: Location}) {
		super(props);
	}

	componentDidMount() {}

	render() {
		const { sidebarCollapsed } = this.state;
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
						<MenuBar disableNavigation={false} currentTab="steam" appState={this.state} />
					</Sider>
					<Layout style={{ width: '100%' }}>
						<Content>
							<Skeleton active round />
						</Content>
					</Layout>
				</Layout>
			</div>
		);
	}
}

export default (props: any) => {
	return <SteamBrowserView {...props} location={useLocation()}/>;
}
