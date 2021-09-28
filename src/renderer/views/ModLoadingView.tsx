import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { AppConfig } from 'renderer/model/AppConfig';
import { Mod, ModType } from 'renderer/model/Mod';
import { ValidChannel, api } from 'renderer/model/Api';
import { Progress } from 'antd';
import { AppState } from '../model/AppState';
import icon from '../../../assets/icon.svg';

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

		const state: AppState = props.location.state as AppState;
		const config: AppConfig = state.config as AppConfig;

		if (!state.activeCollection) {
			state.activeCollection = {
				mods: new Set(),
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
			appState: state
		};

		this.addModPathsCallback = this.addModPathsCallback.bind(this);
		this.loadModCallback = this.loadModCallback.bind(this);
	}

	componentDidMount() {
		const { config } = this.state;
		api.on(ValidChannel.MOD_METADATA_RESULTS, this.loadModCallback);
		api
			.listSubdirs(config.workshopDir)
			.then((folders) => {
				console.log(folders);
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
				console.log(folders);
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

	loadModCallback(mod: Mod | null) {
		const { appState, loadedMods } = this.state;
		if (mod) {
			const modsMap: Map<string, Mod> = appState.mods
				? appState.mods
				: new Map();
			console.log(`Loaded mod: ${mod.ID}`);
			console.log(JSON.stringify(mod, null, 4));
			modsMap.set(mod.WorkshopID ? mod.WorkshopID : mod.ID, mod);
			appState.mods = modsMap;
		}
		this.setState(
			{
				loadedMods: loadedMods + 1
			},
			() => {
				const { totalMods } = this.state;
				if (loadedMods + 1 === totalMods) {
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
		const { countedLocalMods, countedWorkshopMods, totalMods, loadingMods } =
			this.state;
		if (
			countedLocalMods &&
			countedWorkshopMods &&
			totalMods > 0 &&
			!loadingMods
		) {
			this.setState({
				loadingMods: true
			});
			this.loadMods();
		}
	}

	loadMods() {
		const { localModPaths, workshopModPaths, config } = this.state;
		localModPaths.forEach((modFolder) => {
			api.send(
				ValidChannel.READ_MOD_METADATA,
				{ prefixes: [config.localDir], path: modFolder },
				ModType.LOCAL,
				undefined
			);
		});
		workshopModPaths.forEach((modFolder) => {
			api.send(
				ValidChannel.READ_MOD_METADATA,
				{ prefixes: [config.workshopDir], path: modFolder },
				ModType.WORKSHOP,
				parseInt(modFolder, 10)
			);
		});
	}

	// Have an override for duplicate mod IDs - user picks which one is used
	processDuplicates() {
		const test = this.props;
	}

	goToMain() {
		const { appState } = this.state;
		const { history } = this.props;
		history.push('/main', appState);
	}

	render() {
		const { loadedMods, totalMods } = this.state;
		return (
			<div>
				<div className="Hello">
					<img width="200px" alt="icon" src={icon} />
				</div>
				<h1>LOADING MODS</h1>
				<Progress
					strokeColor={{
						from: '#108ee9',
						to: '#87d068'
					}}
					percent={
						totalMods > 0 ? 100 * Math.ceil(loadedMods / totalMods) : 100
					}
				/>
			</div>
		);
	}
}
export default withRouter(ModLoadingView);
