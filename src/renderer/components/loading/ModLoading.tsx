import React, { Component } from 'react';
import { Layout, Progress } from 'antd';
import { AppConfig, ModType, AppState, ModCollection, ValidChannel, ProgressTypes, SessionMods, setupDescriptors } from 'model';
import api from 'renderer/Api';
import { CheckCircleFilled } from '@ant-design/icons';

const { Content } = Layout;

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
			api.logger.silly(`Mod loading progress: ${progress}`);
			this.setState({ progress, progressMessage });
		}
	}

	// Add to current mod list, Go to main view when all mods loaded
	loadModsCallback(mods: SessionMods) {
		// We are done
		const { appState, modLoadCompleteCallback } = this.props;
		setupDescriptors(mods, appState.config.userOverrides);
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
				<Content style={{ backgroundColor: '#222' }}>
					<div className="e-loadholder" style={{ position: 'absolute', top: 'calc(45%)' }}>
						<div className="m-loader">
							<span className="e-text">Loading</span>
						</div>
					</div>
					<span style={{ width: 'calc(100%)', display: 'flex', justifyContent: 'center', position: 'absolute', top: 'calc(90%)' }}>
						<Progress
							style={{ width: 'calc(80%)' }}
							strokeColor={{
								from: '#108ee9',
								to: '#7c3bd0'
							}}
							percent={progress * 100}
							format={(percent) =>
								percent && percent >= 100 ? <CheckCircleFilled style={{ color: '#7c3bd0' }} /> : `${percent?.toFixed()}%`
							}
						/>
					</span>
				</Content>
			</Layout>
		);
	}
}
