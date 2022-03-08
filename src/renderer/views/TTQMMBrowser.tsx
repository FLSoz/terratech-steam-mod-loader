import React, { Component } from 'react';
import { AppState } from 'renderer/model/AppState';
import { Layout, Skeleton } from 'antd';
import MenuBar from './components/MenuBar';
import { useNavigate, useLocation, Location } from 'react-router-dom';

const { Sider, Content } = Layout;

interface TTQMMBrowserState extends AppState {
	sidebarCollapsed?: boolean;
}
class TTQMMBrowserView extends Component<{location: Location}, TTQMMBrowserState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: {location: Location}) {
		super(props);
		const appState = this.props.location.state as AppState;
		this.state = {
			...appState
		};
	}

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
						<MenuBar disableNavigation={false} currentTab="ttqmm" appState={this.state} />
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
	return <TTQMMBrowserView {...props} location={useLocation()}/>;
}
