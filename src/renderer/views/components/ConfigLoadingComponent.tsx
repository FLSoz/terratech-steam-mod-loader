import React, { Component } from 'react';
import { api, ValidChannel } from 'renderer/model/Api';
import { AppConfig, DEFAULT_CONFIG } from 'renderer/model/AppConfig';
import { ModCollection } from 'renderer/model/ModCollection';
import { AppState } from 'renderer/model/AppState';
import { validateAppConfig } from 'renderer/util/Validation';
import { Layout, Progress } from 'antd';
import { useNavigate, NavigateFunction, useOutletContext } from 'react-router-dom';

const { Footer, Content } = Layout;

interface ConfigLoadingState {
	loadingConfig?: boolean;
	userDataPathError?: string;
	configLoadError?: string;
	loadedCollections: number;
	totalCollections: number;
	updatingSteamMod: boolean;
}

class ConfigLoadingComponent extends Component<{ navigate: NavigateFunction; appState: AppState }, ConfigLoadingState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: { navigate: NavigateFunction; appState: AppState }) {
		super(props);
		this.state = {
			loadingConfig: true,
			totalCollections: -1,
			loadedCollections: 0,
			updatingSteamMod: true
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
		const { appState } = this.props;
		const { updateState } = appState;
		updateState(update);
	}

	readConfig() {
		const { appState } = this.props;
		const { updateState } = appState;
		// Attempt to load config. We allow app to proceed if it fails, but we show a warning
		api
			.readConfig()
			.then((response) => {
				if (response) {
					const config = response as AppConfig;
					updateState({ config });
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
		const { appState } = this.props;
		const { updateState } = appState;
		// Get user data path or die trying
		api
			.getUserDataPath()
			.then((path) => {
				updateState({ userDataPath: path });
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
		const { appState } = this.props;
		const { allCollections, allCollectionNames } = appState;
		const { loadedCollections } = this.state;
		if (collection) {
			allCollections!.set(collection.name, collection);
			allCollectionNames.add(collection.name);
		}
		this.setState({ loadedCollections: loadedCollections + 1 }, this.checkCanProceed);
	}

	validateConfig(config: AppConfig) {
		const { appState } = this.props;
		const { updateState } = appState;
		updateState({ configErrors: {} }, () => {
			validateAppConfig(config)
				.then((result) => {
					updateState({ configErrors: result });
					return result;
				})
				.catch((error) => {
					console.error(error);
					updateState({ configErrors: { undefined: `Internal exception while validating AppConfig:\n${error.toString()}` } });
				})
				.finally(() => {
					this.setState({ loadingConfig: false }, this.checkCanProceed);
				});
		});
	}

	proceedToNext() {
		const { appState } = this.props;
		const { config, configErrors, updateState, navigate } = appState;
		if (!!configErrors && Object.keys(configErrors).length > 0) {
			// We have an invalid configuration - go to Settings tab for enhanced validation logic
			config.currentTab = "settings";
			updateState({}, () => navigate('/settings'));
		} else {
			config.currentTab = "main";
			updateState({}, () => navigate('/loading/mods'));
		}
	}

	checkCanProceed() {
		const { appState } = this.props;
		const { config, allCollections, allCollectionNames, updateState } = appState;
		const { loadedCollections, loadingConfig, totalCollections, updatingSteamMod } = this.state;
		if (!updatingSteamMod && totalCollections >= 0 && loadedCollections >= totalCollections && !loadingConfig) {
			if (allCollectionNames.size > 0) {
				// We always override activeCollection with something
				if (config && config.activeCollection) {
					const collection = allCollections.get(config.activeCollection);
					if (collection) {
						updateState({ activeCollection: collection }, this.proceedToNext.bind(this));
						return;
					}
					// activeCollection is no longer there: default to first available in ASCII-betical order
				}
				const collectionName = [...allCollectionNames].sort()[0];
				config!.activeCollection = collectionName;
				updateState({ activeCollection: allCollections.get(collectionName) }, this.proceedToNext.bind(this));
			} else {
				// there are no collections - create a new defaultCollection
				config!.activeCollection = 'default';
				const defaultCollection: ModCollection = {
					mods: [],
					name: 'default'
				};
				allCollectionNames.add('default');
				allCollections.set('default', defaultCollection);
				updateState({ activeCollection: defaultCollection }, this.proceedToNext.bind(this));
			}
		}
	}

	render() {
		const { loadedCollections, totalCollections, configLoadError, userDataPathError } = this.state;
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
						status={configLoadError || userDataPathError ? 'exception' : undefined}
					/>
				</Footer>
			</Layout>
		);
	}
}

export default () => {
	return <ConfigLoadingComponent navigate={useNavigate()} appState={useOutletContext<AppState>()} />;
};
