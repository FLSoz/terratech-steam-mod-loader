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
	updatingSteamMod: boolean;
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
			allCollectionNames: new Set(),
			mods: new Map(),
			updatingSteamMod: true,
			activeCollection: {
				name: 'default',
				mods: []
			},
			searchString: ''
		};
		this.loadCollectionCallback = this.loadCollectionCallback.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.COLLECTION_RESULTS, this.loadCollectionCallback);
		this.readUserDataPath();
		this.readConfig();
		this.loadCollections();
		this.updateSteamMod();
	}

	componentWillUnmount() {
		api.removeAllListeners(ValidChannel.COLLECTION_RESULTS);
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
					api.logger.info('No config present - using default config');
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

	updateSteamMod() {
		this.setState({ updatingSteamMod: false }, this.checkCanProceed);
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
		const { allCollections, allCollectionNames, loadedCollections } = this.state;
		if (collection) {
			allCollections!.set(collection.name, collection);
			allCollectionNames.add(collection.name);
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

	proceedToNext() {
		const { configErrors } = this.state;
		const { history } = this.props;
		if (configErrors) {
			// We have an invalid configuration - go to Settings tab for enhanced validation logic
			history.push('/settings', this.state);
		} else {
			history.push('/mods', this.state);
		}
	}

	checkCanProceed() {
		const { activeCollection, loadedCollections, loadingConfig, totalCollections, updatingSteamMod, config, allCollections, allCollectionNames } = this.state;
		if (!updatingSteamMod && totalCollections >= 0 && loadedCollections >= totalCollections && !loadingConfig) {
			console.log('hello world');
			if (allCollectionNames.size > 0) {
				// We always override activeCollection with something
				if (config && config.activeCollection) {
					const collection = allCollections.get(config.activeCollection);
					if (collection) {
						this.setState({ activeCollection: collection }, this.proceedToNext);
					} else {
						// activeCollection is no longer there: default to first available in ASCII-betical order
					}
				}
				const collectionName = [...allCollectionNames].sort()[0];
				config.activeCollection = collectionName;
				this.setState({ activeCollection: allCollections.get(collectionName)! }, this.proceedToNext);
			} else {
				// activeCollection has already been set to default. Add to maps
				config.activeCollection = 'default';
				allCollectionNames.add('default');
				allCollections.set('default', activeCollection);
				this.setState({}, this.proceedToNext);
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
