import React, { Component } from 'react';
import { AppState } from 'model';
import { Layout, Skeleton } from 'antd';
import { useLocation, Location } from 'react-router-dom';
import MenuBar from '../MenuBar';

const { Sider, Content } = Layout;

class TTQMMBrowserView extends Component<{ location: Location }, AppState> {
	CONFIG_PATH: string | undefined = undefined;

	componentDidMount() {}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

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
						<MenuBar disableNavigation={false} appState={this.state} />
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (props: any) => {
	return <TTQMMBrowserView {...props} location={useLocation()} />;
};
