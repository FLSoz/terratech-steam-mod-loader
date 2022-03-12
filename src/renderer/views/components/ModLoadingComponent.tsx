import React, { Component } from 'react';
import { Layout, Progress } from 'antd';
import ReactLoading from 'react-loading';
import { SizeMe } from 'react-sizeme';
import { AppConfig } from 'renderer/model/AppConfig';
import { Mod, ModType } from 'renderer/model/Mod';
import { ValidChannel, api } from 'renderer/model/Api';
import { AppState } from 'renderer/model/AppState';
import { delayForEach, ForEachProps } from 'renderer/util/Sleep';
import { useOutletContext } from 'react-router-dom';

const { Footer, Content } = Layout;

interface ModLoadingState {
	config: AppConfig;
	loadingMods: boolean;
	countedWorkshopMods: boolean;
	countedLocalMods: boolean;
	countedTTQMMMods?: boolean;
	workshopModPaths: string[];
	localModPaths: string[];
	ttqmmModPaths?: string[];
	loadedMods: number;
	totalMods: number;
}

class ModLoadingComponent extends Component<{ appState: AppState }, ModLoadingState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: { appState: AppState }) {
		super(props);

		const { appState } = this.props;
		const config: AppConfig = appState.config as AppConfig;

		this.state = {
			config,
			loadingMods: false,
			countedWorkshopMods: false,
			countedLocalMods: false,
			workshopModPaths: [],
			localModPaths: [],
			loadedMods: 0,
			totalMods: 0
		};

		this.addModPathsCallback = this.addModPathsCallback.bind(this);
		this.loadModCallback = this.loadModCallback.bind(this);
	}

	// Register listener for mod load callback, start mod loading
	componentDidMount() {
		const { config } = this.state;
		api.on(ValidChannel.MOD_METADATA_RESULTS, this.loadModCallback);
		api
			.listSubdirs(config.workshopDir)
			.then((folders) => {
				this.addModPathsCallback(folders, ModType.WORKSHOP);
				return null;
			})
			.catch((error) => {
				console.error(error);
				throw error;
			});

		api
			.listSubdirs(config.localDir)
			.then((folders) => {
				this.addModPathsCallback(folders, ModType.LOCAL);
				return null;
			})
			.catch((error) => {
				console.error(error);
				throw error;
			});
	}

	componentWillUnmount() {
		api.removeAllListeners(ValidChannel.MOD_METADATA_RESULTS);
	}

	setStateCallback(update: AppState) {
		const { appState } = this.props;
		appState.updateState(update);
	}

	// Add to current mod list, Go to main view when all mods loaded
	loadModCallback(mod: Mod | null) {
		const { loadedMods } = this.state;
		const { appState } = this.props;
		if (mod) {
			const modsMap: Map<string, Mod> = appState.mods;
			api.logger.debug(`Loaded mod: ${mod.ID}`);
			// api.logger.debug(JSON.stringify(mod, null, 2));
			modsMap.set(mod.UID, mod);
			appState.mods = modsMap;
		}
		this.setState(
			{
				loadedMods: loadedMods + 1
			},
			() => {
				const { totalMods } = this.state;
				if (loadedMods + 1 >= totalMods) {
					api.logger.info(`Loading complete: moving to ${appState.targetPathAfterLoad}`);
					appState.firstModLoad = true;
					appState.navigate(appState.targetPathAfterLoad);
				} else {
					api.logger.info(`Loaded ${loadedMods} out of ${totalMods}`);
				}
			}
		);
	}

	addModPathsCallback(paths: string[], type: string) {
		const count = paths.length;
		const { totalMods } = this.state;
		this.setState({
			totalMods: totalMods + count
		});
		if (type === ModType.WORKSHOP) {
			this.setState(
				{
					countedWorkshopMods: true,
					workshopModPaths: paths
				},
				this.conditionalLoadMods
			);
		} else {
			this.setState(
				{
					countedLocalMods: true,
					localModPaths: paths
				},
				this.conditionalLoadMods
			);
		}
	}

	conditionalLoadMods() {
		const { countedLocalMods, countedWorkshopMods, totalMods, loadingMods } = this.state;
		if (countedLocalMods && countedWorkshopMods && totalMods > 0 && !loadingMods) {
			this.setState({
				loadingMods: true
			});
			this.loadMods();
		}
	}

	loadMods() {
		const { localModPaths, workshopModPaths, config } = this.state;
		const sendRequest = (props: ForEachProps<string>, prefix: string, type: ModType) => {
			const path: string = props.value;
			api.send(ValidChannel.READ_MOD_METADATA, { prefixes: [prefix], path }, type, type === ModType.WORKSHOP ? parseInt(path, 10) : undefined);
		};
		delayForEach(localModPaths, 100, sendRequest, config.localDir, ModType.LOCAL);
		delayForEach(workshopModPaths, 100, sendRequest, config.workshopDir, ModType.WORKSHOP);
	}

	render() {
		const { loadedMods, totalMods } = this.state;
		const percent = totalMods > 0 ? Math.round((100 * loadedMods) / totalMods) : 100;
		return (
			<Layout style={{ minHeight: '100vh', minWidth: '100vw' }}>
				<SizeMe monitorHeight monitorWidth refreshMode="debounce">
					{({ size }) => {
						return (
							<Content>
								<div
									style={{
										position: 'absolute',
										left: '50%',
										top: '30%',
										transform: 'translate(-50%, -50%)'
									}}
								>
									<ReactLoading type="bars" color="#DDD" width={(size.width as number) / 4} />
								</div>
							</Content>
						);
					}}
				</SizeMe>
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

export default () => {
	return <ModLoadingComponent appState={useOutletContext<AppState>()} />;
};
