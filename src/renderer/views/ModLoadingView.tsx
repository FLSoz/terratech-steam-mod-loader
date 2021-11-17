import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { Layout, Progress, Spin, Skeleton } from 'antd';
import ReactLoading from 'react-loading';
import { SizeMe } from 'react-sizeme';
import { AppConfig } from 'renderer/model/AppConfig';
import { Mod, ModType } from 'renderer/model/Mod';
import { ValidChannel, api } from 'renderer/model/Api';
import { AppState } from 'renderer/model/AppState';

const { Footer, Content } = Layout;

interface ModLoadingState {
	config: AppConfig;
	appState: AppState;
	loadingMods: boolean;
	countedWorkshopMods: boolean;
	countedLocalMods: boolean;
	countedTTQMMMods: boolean;
	workshopModPaths: string[];
	localModPaths: string[];
	ttqmmModPaths: string[];
	loadedMods: number;
	totalMods: number;
}

class ModLoadingView extends Component<RouteComponentProps, ModLoadingState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: RouteComponentProps) {
		super(props);

		const appState: AppState = props.location.state as AppState;
		const config: AppConfig = appState.config as AppConfig;

		if (!appState.activeCollection) {
			appState.activeCollection = {
				mods: [],
				name: 'default'
			};
		}

		this.state = {
			config,
			loadingMods: false,
			countedWorkshopMods: false,
			countedLocalMods: false,
			countedTTQMMMods: false,
			workshopModPaths: [],
			localModPaths: [],
			ttqmmModPaths: [],
			loadedMods: 0,
			totalMods: 0,
			appState
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
		const { appState } = this.state;
		this.setState({
			appState: Object.assign(appState, update)
		});
	}

	// Add to current mod list, Go to main view when all mods loaded
	loadModCallback(mod: Mod | null) {
		const { appState, loadedMods } = this.state;
		if (mod) {
			const modsMap: Map<string, Mod> = appState.mods;
			api.logger.info(`Loaded mod: ${mod.ID}`);
			api.logger.info(JSON.stringify(mod, null, 2));
			modsMap.set(mod.WorkshopID ? `${mod.WorkshopID}` : mod.ID, mod);
			appState.mods = modsMap;
		}
		this.setState(
			{
				loadedMods: loadedMods + 1
			},
			() => {
				const { totalMods } = this.state;
				if (loadedMods + 1 >= totalMods) {
					this.goToMain();
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
		localModPaths.forEach(async (modFolder) => {
			api.send(ValidChannel.READ_MOD_METADATA, { prefixes: [config.localDir], path: modFolder }, ModType.LOCAL, undefined);
		});
		workshopModPaths.forEach(async (modFolder) => {
			api.send(ValidChannel.READ_MOD_METADATA, { prefixes: [config.workshopDir], path: modFolder }, ModType.WORKSHOP, parseInt(modFolder, 10));
		});
	}

	// TODO: Have an override for duplicate mod IDs - user picks which one is used
	goToMain() {
		const { appState } = this.state;
		const { history } = this.props;
		appState.firstModLoad = true;
		history.push('/main', appState);
	}

	render() {
		const { loadedMods, totalMods } = this.state;
		const percent = totalMods > 0 ? Math.ceil((100 * loadedMods) / totalMods) : 100;
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
export default withRouter(ModLoadingView);
