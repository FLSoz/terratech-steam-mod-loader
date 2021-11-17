import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { AppState } from 'renderer/model/AppState';
import { Layout } from 'antd';
import MenuBar from './components/MenuBar';

const { Header, Footer, Sider, Content } = Layout;

interface TTQMMBrowserState extends AppState {
	sidebarCollapsed?: boolean;
}
class TTQMMBrowserView extends Component<RouteComponentProps, TTQMMBrowserState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: RouteComponentProps) {
		super(props);
		const appState = props.location.state as AppState;
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
						<MenuBar disableNavigation={false} currentTab="ttqmm" history={history} location={location} match={match} appState={this.state} />
					</Sider>
					<Layout style={{ width: '100%' }}>
						<div />
					</Layout>
				</Layout>
			</div>
		);
	}
}
export default withRouter(TTQMMBrowserView);
