import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { api, ValidChannel } from 'renderer/model/Api';
import { AppConfig, DEFAULT_CONFIG } from 'renderer/model/AppConfig';
import { ModCollection } from 'renderer/model/ModCollection';
import { AppState } from 'renderer/model/AppState';
import { validateAppConfig } from 'renderer/util/Validation';
import { Layout, Progress } from 'antd';

const { Footer, Content } = Layout;

interface ConfigLoadingState extends AppState {
	loadingConfig?: boolean;
	savingConfig?: boolean;
	userDataPathError?: string;
	configLoadError?: string;
	configErrors?: { [field: string]: string };
	loadedCollections: number;
	totalCollections: number;
}

class ConfigLoadingView extends Component<RouteComponentProps, ConfigLoadingState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: RouteComponentProps) {
		super(props);

		this.state = {
			config: DEFAULT_CONFIG,
			loadingConfig: true,
			userDataPath: '',
			savingConfig: false,
			targetPathAfterLoad: '/main',
			totalCollections: -1,
			loadedCollections: 0,
			allCollections: new Map(),
			mods: new Map()
		};
		this.loadCollectionCallback = this.loadCollectionCallback.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.COLLECTION_RESULTS, this.loadCollectionCallback);
		this.readUserDataPath();
		this.readConfig();
		this.loadCollections();
	}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

	readConfig() {
		// Attempt to load config. We allow app to proceed if it fails, but we show a warning
		api
			.readConfig()
			.then((response) => {
				if (response) {
					const config = response as AppConfig;
					this.setState({ config });
					this.validateConfig(config);
				} else {
					console.log('No config present - using default config');
					this.validateConfig(DEFAULT_CONFIG);
				}
				return null;
			})
			.catch((error) => {
				console.error(error);
				this.setState({ configLoadError: error.toString() });
				this.validateConfig(DEFAULT_CONFIG);
			});
	}

	readUserDataPath() {
		// Get user data path or die trying
		api
			.getUserDataPath()
			.then((path) => {
				this.setState({ userDataPath: path });
				return path;
			})
			.catch((error) => {
				console.error(error);
				this.setState({ userDataPathError: error.toString() });
			});
	}

	loadCollections() {
		// Attempt to load collections. We allow app to proceed if it fails
		api
			.readCollectionsList()
			.then((collections) => {
				if (collections && collections.length > 0) {
					this.setState({ totalCollections: collections.length });
					collections.forEach((collection: string) => api.readCollection(collection));
				} else {
					this.setState({ totalCollections: 0 });
				}
				return null;
			})
			.catch((error) => {
				console.error(error);
				throw error;
			});
	}

	loadCollectionCallback(collection: ModCollection | null) {
		const { allCollections, loadedCollections } = this.state;
		if (collection) {
			allCollections!.set(collection.name, collection);
		}
		this.setState({ loadedCollections: loadedCollections + 1 }, this.checkCanProceed);
	}

	validateConfig(config: AppConfig) {
		this.setState({ configErrors: undefined });
		validateAppConfig(config)
			.then((result) => {
				this.setState({ configErrors: result });
				return result;
			})
			.catch((error) => {
				console.error(error);
				this.setState({ configErrors: { undefined: `Internal exception while validating AppConfig:\n${error.toString()}` } });
			})
			.finally(() => {
				this.setState({ loadingConfig: false }, this.checkCanProceed);
			});
	}

	checkCanProceed() {
		const { loadedCollections, loadingConfig, totalCollections, configErrors } = this.state;
		if (totalCollections >= 0 && loadedCollections >= totalCollections && !loadingConfig) {
			const { history } = this.props;
			if (configErrors) {
				// We have an invalid configuration - go to Settings tab for enhanced validation logic
				history.push('/settings', this.state);
			} else {
				history.push('/mods', this.state);
			}
		}
	}

	render() {
		const { loadedCollections, totalCollections } = this.state;
		const percent = totalCollections > 0 ? Math.ceil((100 * loadedCollections) / totalCollections) : 100;
		return (
			<Layout style={{ minHeight: '100vh', minWidth: '100vw' }}>
				<Content />
				<Footer>
					<Progress
						strokeColor={{
							from: '#108ee9',
							to: '#87d068'
						}}
						percent={percent}
					/>
				</Footer>
			</Layout>
		);
	}
}
export default withRouter(ConfigLoadingView);
