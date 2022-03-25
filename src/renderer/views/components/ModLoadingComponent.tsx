import React, { Component } from 'react';
import { Layout, Progress } from 'antd';
import { AppConfig, Mod, ModType, AppState, ModCollection } from 'model';
import { ValidChannel, api, ProgressTypes } from 'renderer/Api';

const { Footer, Content } = Layout;

interface ModLoadingState {
	config: AppConfig;
	progress: number;
	progressMessage: string;
	checkedDependencies: Set<string>;
}

interface ModLoadingProps {
	appState: AppState;
	modLoadCompleteCallback: (...args: any) => void;
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
			progressMessage: 'Counting mods',
			checkedDependencies: new Set()
		};

		this.updateProgressCallback = this.updateProgressCallback.bind(this);
		this.loadModCallback = this.loadModCallback.bind(this);
		this.batchLoadModCallback = this.batchLoadModCallback.bind(this);
	}

	// Register listener for mod load callback, start mod loading
	componentDidMount() {
		const { config } = this.state;
		const { appState } = this.props;
		api.on(ValidChannel.MOD_METADATA_RESULTS, this.loadModCallback);
		api.on(ValidChannel.BATCH_MOD_METADATA_RESULTS, this.batchLoadModCallback);
		api.on(ValidChannel.PROGRESS_CHANGE, this.updateProgressCallback);
		const { allCollections } = appState;
		const allKnownWorkshopMods: Set<BigInt> = new Set();
		[...allCollections.values()].forEach((value: ModCollection) => {
			value.mods.forEach((modUID: string) => {
				if (modUID.startsWith(`${ModType.WORKSHOP}`)) {
					const workshopID = modUID.split(':')[1];
					try {
						allKnownWorkshopMods.add(BigInt(workshopID));
					} catch (e) {
						api.logger.error(`Error reading known mod ${modUID} from collection ${value.name}`);
						api.logger.error(e);

						const modsMap: Map<string, Mod> = appState.mods;
						const failedMod: Mod = {
							UID: modUID,
							ID: workshopID,
							type: ModType.WORKSHOP,
							path: ''
						};
						// api.logger.debug(JSON.stringify(mod, null, 2));
						modsMap.set(modUID, failedMod);
					}
				}
			});
		});
		api.send(ValidChannel.READ_MOD_METADATA, config.localDir, [...allKnownWorkshopMods]);
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
				if (progress >= 2.0) {
					const { appState, modLoadCompleteCallback } = this.props;

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
					appState.loadingMods = false;
					appState.navigate(appState.targetPathAfterLoad);

					modLoadCompleteCallback(mods);
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
					{progressMessage}
				</Footer>
			</Layout>
		);
	}
}
