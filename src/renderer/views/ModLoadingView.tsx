import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { AppConfig } from 'renderer/model/AppConfig';
import { Mod, ModType } from 'renderer/model/Mod';
import { ValidChannel, api } from 'renderer/model/Api';
import LinearProgress from '@mui/material/LinearProgress';
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

	constructor(props: any) {
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
		api.on(ValidChannel.MOD_METADATA_RESULTS, this.loadModCallback);
		api.listSubdirs(this.state.config.workshopDir).then((folders) => {
			console.log(folders);
			this.addModPathsCallback(folders, ModType.WORKSHOP);
		});

		api.listSubdirs(this.state.config.localDir).then((folders) => {
			console.log(folders);
			this.addModPathsCallback(folders, ModType.LOCAL);
		});
	}

	componentWillUnmount() {
		api.removeAllListeners(ValidChannel.MOD_METADATA_RESULTS);
	}

	setStateCallback(update: AppState) {
		this.setState({
			appState: Object.assign(this.state.appState, update)
		});
	}

	loadModCallback(mod: Mod | null) {
		if (mod) {
			const modsMap: Map<string, Mod> = this.state.appState.mods
				? this.state.appState.mods
				: new Map();
			console.log(`Loaded mod: ${mod.ID}`);
			console.log(JSON.stringify(mod, null, 4));
			modsMap.set(mod.WorkshopID ? mod.WorkshopID : mod.ID, mod);
			this.state.appState.mods = modsMap;
		}
		this.setState(
			{
				loadedMods: this.state.loadedMods + 1
			},
			() => {
				if (this.state.loadedMods === this.state.totalMods) {
					this.goToMain();
				}
			}
		);
	}

	addModPathsCallback(paths: string[], type: string) {
		const count = paths.length;
		this.setState({
			totalMods: this.state.totalMods + count
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
		if (
			this.state.countedLocalMods &&
			this.state.countedWorkshopMods &&
			this.state.totalMods > 0 &&
			!this.state.loadingMods
		) {
			this.setState({
				loadingMods: true
			});
			this.loadMods();
		}
	}

	loadMods() {
		this.state.localModPaths.forEach((modFolder) => {
			api.send(
				ValidChannel.READ_MOD_METADATA,
				{ prefixes: [this.state.config.localDir], path: modFolder },
				ModType.LOCAL,
				undefined
			);
		});
		this.state.workshopModPaths.forEach((modFolder) => {
			api.send(
				ValidChannel.READ_MOD_METADATA,
				{ prefixes: [this.state.config.workshopDir], path: modFolder },
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
		this.props.history.push('/main', this.state.appState);
	}

	render() {
		return (
			<div>
				<div className="Hello">
					<img width="200px" alt="icon" src={icon} />
				</div>
				<h1>LOADING MODS</h1>
				<LinearProgress variant="indeterminate" />
			</div>
		);
	}
}
export default withRouter(ModLoadingView);
