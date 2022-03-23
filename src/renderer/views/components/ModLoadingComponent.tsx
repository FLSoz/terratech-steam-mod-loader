import React, { Component } from 'react';
import { Layout, Progress } from 'antd';
import ReactLoading from 'react-loading';
import { SizeMe } from 'react-sizeme';
import { AppConfig } from 'renderer/model/AppConfig';
import { Mod, ModType } from 'renderer/model/Mod';
import { ValidChannel, api, ProgressTypes } from 'renderer/model/Api';
import { AppState } from 'renderer/model/AppState';
import { delayForEach, ForEachProps } from 'renderer/util/Sleep';
import { useOutletContext } from 'react-router-dom';
import { chunk } from 'renderer/util/Util';
import { ProgressType } from 'antd/lib/progress/progress';

const { Footer, Content } = Layout;

interface ModLoadingState {
	config: AppConfig;
	progress: number;
	progressMessage: string;
}

class ModLoadingComponent extends Component<{ appState: AppState }, ModLoadingState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: { appState: AppState }) {
		super(props);

		const { appState } = this.props;
		const config: AppConfig = appState.config as AppConfig;

		this.state = {
			config,
			progress: 0.0,
			progressMessage: 'Counting mods'
		};

		this.updateProgressCallback = this.updateProgressCallback.bind(this);
		this.loadModCallback = this.loadModCallback.bind(this);
		this.batchLoadModCallback = this.batchLoadModCallback.bind(this);
	}

	// Register listener for mod load callback, start mod loading
	componentDidMount() {
		const { config } = this.state;
		api.on(ValidChannel.MOD_METADATA_RESULTS, this.loadModCallback);
		api.on(ValidChannel.BATCH_MOD_METADATA_RESULTS, this.batchLoadModCallback);
		api.on(ValidChannel.PROGRESS_CHANGE, this.updateProgressCallback);
		api.send(ValidChannel.READ_MOD_METADATA, config.localDir);
	}

	componentWillUnmount() {
		api.removeAllListeners(ValidChannel.MOD_METADATA_RESULTS);
		api.removeAllListeners(ValidChannel.BATCH_MOD_METADATA_RESULTS);
		api.removeListener(ValidChannel.PROGRESS_CHANGE, this.updateProgressCallback);
	}

	setStateCallback(update: AppState) {
		const { appState } = this.props;
		appState.updateState(update);
	}

	updateProgressCallback(type: ProgressTypes, progress: number, progressMessage: string) {
		if (type === ProgressTypes.MOD_LOAD) {
			this.setState({ progress, progressMessage }, () => {
				if (progress >= 1.0) {
					const { appState } = this.props;

					// Update all Workshop dependencies to work off of Mod IDs
					const { mods, workshopToModID } = appState;
					mods.forEach((currMod: Mod) => {
						if (currMod.WorkshopID) {
							workshopToModID.set(currMod.WorkshopID, currMod.ID);
							api.logger.debug(`Discovered workshop mod ${currMod.UID} has ID of ${currMod.ID}`);
						}
					});

					// We are done
					api.logger.info(`Loading complete: moving to ${appState.targetPathAfterLoad}`);
					appState.firstModLoad = true;
					appState.navigate(appState.targetPathAfterLoad);
				}
			});
		}
	}

	// Add to current mod list, Go to main view when all mods loaded
	loadModCallback(mod: Mod | null) {
		const { appState } = this.props;
		if (mod) {
			const modsMap: Map<string, Mod> = appState.mods;
			api.logger.debug(`Loaded mod: ${mod.ID} (${mod.UID})`);
			// api.logger.debug(JSON.stringify(mod, null, 2));
			modsMap.set(mod.UID, mod);
			appState.mods = modsMap;
		}
	}

	batchLoadModCallback(modsBatch: (Mod | null)[], batchSize: number) {
		const { appState } = this.props;
		modsBatch.forEach((mod: Mod | null) => {
			if (mod) {
				const modsMap: Map<string, Mod> = appState.mods;
				api.logger.debug(`Loaded mod: ${mod.ID} (${mod.UID})`);
				// api.logger.debug(JSON.stringify(mod, null, 2));
				modsMap.set(mod.UID, mod);
				appState.mods = modsMap;
			}
		});
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
				</Footer>
			</Layout>
		);
	}
}

export default () => {
	return <ModLoadingComponent appState={useOutletContext<AppState>()} />;
};
