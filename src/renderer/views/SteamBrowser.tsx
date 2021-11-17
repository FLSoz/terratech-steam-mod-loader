import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { AppState } from 'renderer/model/AppState';
import { Layout } from 'antd';
import MenuBar from './components/MenuBar';

const { Header, Footer, Sider, Content } = Layout;

interface SteamBrowserState extends AppState {
	sidebarCollapsed?: boolean;
}
class SteamBrowserView extends Component<RouteComponentProps, SteamBrowserState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: RouteComponentProps) {
		super(props);
		const appState = props.location.state as AppState;
		this.state = {
			...appState
		};
	}

	componentDidMount() {}

	render() {
		const { sidebarCollapsed } = this.state;
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
						<MenuBar disableNavigation={false} currentTab="steam" history={history} location={location} match={match} appState={this.state} />
					</Sider>
					<Layout style={{ width: '100%' }}>
						<div />
					</Layout>
				</Layout>
			</div>
		);
	}
}
export default withRouter(SteamBrowserView);
