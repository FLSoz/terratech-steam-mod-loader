import React, { Component } from 'react';
import { Layout, Progress } from 'antd';
import { AppConfig, ModData, ModType, AppState, ModCollection, ValidChannel, ProgressTypes, SessionMods, setupDescriptors } from 'model';
import api from 'renderer/Api';

const { Footer, Content } = Layout;

interface ModLoadingState {
	config: AppConfig;
	progress: number;
	progressMessage: string;
}

interface ModLoadingProps {
	appState: AppState;
	modLoadCompleteCallback: () => void;
}

export default class ModLoadingComponent extends Component<ModLoadingProps, ModLoadingState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: ModLoadingProps) {
		super(props);

		const { appState } = this.props;
		const config: AppConfig = appState.config as AppConfig;

		this.state = {
			config,
			progress: 0.0,
			progressMessage: 'Counting mods'
		};

		this.updateProgressCallback = this.updateProgressCallback.bind(this);
		this.loadModsCallback = this.loadModsCallback.bind(this);
	}

	// Register listener for mod load callback, start mod loading
	componentDidMount() {
		const { config } = this.state;
		const { appState } = this.props;
		api.on(ValidChannel.READ_MOD_METADATA, this.loadModsCallback);
		api.on(ValidChannel.PROGRESS_CHANGE, this.updateProgressCallback);
		const { allCollections } = appState;
		const allKnownMods: Set<string> = new Set(
			[...allCollections.values()]
				.map((value: ModCollection) => {
					return value.mods;
				})
				.flat()
		);
		allKnownMods.add(`${ModType.WORKSHOP}:${config.workshopID}`);
		api.send(ValidChannel.READ_MOD_METADATA, config.localDir, allKnownMods);
	}

	componentWillUnmount() {
		api.removeListener(ValidChannel.READ_MOD_METADATA, this.loadModsCallback);
		api.removeListener(ValidChannel.PROGRESS_CHANGE, this.updateProgressCallback);
	}

	updateProgressCallback(type: ProgressTypes, progress: number, progressMessage: string) {
		if (type === ProgressTypes.MOD_LOAD) {
			api.logger.debug(`Mod loading progress: ${progress}`);
			this.setState({ progress, progressMessage });
		}
	}

	// Add to current mod list, Go to main view when all mods loaded
	loadModsCallback(mods: SessionMods) {
		// We are done
		const { appState, modLoadCompleteCallback } = this.props;
		setupDescriptors(mods);
		appState.updateState({
			mods,
			firstModLoad: true,
			loadingMods: false
		});
		modLoadCompleteCallback();
	}

	render() {
		const { progress, progressMessage } = this.state;
		return (
			<Layout style={{ minHeight: '100vh', minWidth: '100vw' }}>
				<Footer>
					<Progress
						strokeColor={{
							from: '#108ee9',
							to: '#87d068'
						}}
						percent={progress * 100}
					/>
					{progressMessage}
				</Footer>
			</Layout>
		);
	}
}
