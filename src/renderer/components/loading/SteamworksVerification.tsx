import React, { Component } from 'react';
import { Layout, Button, Typography, Row, Col } from 'antd';
import { CheckOutlined, CloseOutlined, Loading3QuartersOutlined } from '@ant-design/icons';
import { useNavigate, NavigateFunction, useOutletContext } from 'react-router-dom';
import { AppState, ValidChannel } from 'model';
import api from 'renderer/Api';
import logo_steamworks from '../../../../assets/logo_steamworks.svg';

const { Content } = Layout;
const { Text } = Typography;

interface SteamworksVerificationState {
	verifying: boolean;
	error?: string;
}

interface VerificationMessage {
	inited: boolean;
	error?: string;
}

class SteamworksVerification extends Component<{ navigate: NavigateFunction; appState: AppState }, SteamworksVerificationState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: { navigate: NavigateFunction; appState: AppState }) {
		super(props);
		this.state = {
			verifying: true
		};

		this.verify = this.verify.bind(this);
		this.processVerificationMessage = this.processVerificationMessage.bind(this);
	}

	// Register listener for mod load callback, start mod loading
	componentDidMount() {
		// eslint-disable-next-line promise/catch-or-return
		api.invoke(ValidChannel.STEAMWORKS_INITED).then(this.processVerificationMessage);
	}

	getStatusIcon() {
		const { verifying, error } = this.state;
		if (verifying) {
			return <Loading3QuartersOutlined spin style={{ fontSize: 70, margin: 2.5, color: 'rgb(51,255,255)' }} />;
		}
		if (error) {
			return <CloseOutlined style={{ fontSize: 75, color: 'red' }} />;
		}
		return <CheckOutlined style={{ fontSize: 75, color: 'rgb(51,255,51)' }} />;
	}

	goToConfig() {
		const { appState, navigate } = this.props;
		const { config, initializedConfigs: initialized, updateState } = appState;
		if (!initialized) {
			updateState({ initializedConfigs: true }, () => {
				console.log('DOING CONFIG');
				navigate('/loading/config');
			});
		} else {
			config.currentPath = '/collections/main';
			navigate(config.currentPath);
		}
	}

	processVerificationMessage(message: VerificationMessage) {
		setTimeout(() => {
			if (message.inited) {
				this.setState({ error: undefined });
			} else {
				this.setState({ error: message.error });
			}
			this.setState({ verifying: false }, () => {
				setTimeout(() => {
					if (message.inited) {
						this.goToConfig();
					}
				}, 500);
			});
		}, 100);
		return message.inited;
	}

	verify() {
		this.setState({ verifying: true }, () => {
			// eslint-disable-next-line promise/catch-or-return
			api.invoke(ValidChannel.STEAMWORKS_INITED).then(this.processVerificationMessage);
		});
	}

	render() {
		const { verifying, error } = this.state;
		return (
			<Layout>
				<Content style={{ backgroundColor: '#222' }}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							height: '100vh'
						}}
					>
						<Row key="steamworks" justify="center" align="bottom" gutter={16}>
							<Col key="status">{this.getStatusIcon()}</Col>
							<Col key="logo">
								<img src={logo_steamworks} width={500} alt="" key="steamworks" />
							</Col>
						</Row>
						{error ? (
							<Row key="error" justify="center" style={{ marginTop: '16px' }}>
								<Text code type="danger">
									{error}
								</Text>
							</Row>
						) : null}
						{error ? (
							<Row key="retry" justify="center" style={{ margin: '16px' }}>
								<Button type="primary" onClick={this.verify} loading={verifying}>
									Retry Steamworks Initialization
								</Button>
							</Row>
						) : null}
					</div>
				</Content>
			</Layout>
		);
	}
}

export default () => {
	return <SteamworksVerification navigate={useNavigate()} appState={useOutletContext<AppState>()} />;
};
