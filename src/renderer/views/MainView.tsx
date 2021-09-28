import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';

import ModCollectionComponent from './components/ModCollectionComponent';
import { Mod, ModType } from '../model/Mod';
import { AppState } from '../model/AppState';
import { DEFAULT_WORKSHOP_ID, TT_APP_ID } from '../Constants';
import local from '../../../assets/local.png';
import steam from '../../../assets/steam.png';
import ttmm from '../../../assets/ttmm.png';
import icon from '../../../assets/icon.svg';

class MainView extends Component<RouteComponentProps, AppState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: RouteComponentProps) {
		super(props);
		const appState = props.location.state as AppState;
		this.state = appState;

		this.handleSelectAllClick = this.handleSelectAllClick.bind(this);
		this.handleClick = this.handleClick.bind(this);
		// this.isItemSelected = this.isItemSelected.bind(this);
	}

	componentDidMount() {}

	handleSelectAllClick(event: any) {
		const { mods, activeCollection } = this.state;
		if (mods && activeCollection) {
			if (event.target.checked) {
				[...mods.values()].forEach((mod) => {
					activeCollection.mods.add(mod.ID);
				});
			} else {
				activeCollection.mods.clear();
			}
		}
		this.setState({});
	}

	handleClick(event: any, id: string) {
		const { activeCollection } = this.state;
		if (activeCollection) {
			if (event.target.checked) {
				activeCollection.mods.add(id);
			} else {
				activeCollection.mods.delete(id);
			}
		}
		this.setState({});
	}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

	refreshMods() {
		const { history } = this.props;
		history.push('/mods', this.state);
	}

	isItemSelected(id: string): boolean {
		const { activeCollection } = this.state;
		return activeCollection ? activeCollection.mods.has(id) : false;
	}

	updatedActiveCollection(): boolean {
		return false;
	}

	render() {
		const { mods, activeCollection } = this.state;
		console.log(mods ? [...mods.values()].length : 'FAILED');
		const rows = mods
			? [...mods?.values()].map((mod: Mod) => {
					return {
						id: mod.ID,
						type: mod.type,
						preview: mod.config?.preview,
						name: mod.config ? mod.config.name : mod.ID,
						description: mod.config?.description,
						author: mod.config?.author,
						dependsOn: mod.config?.dependsOn
					};
			  })
			: [];

		return (
			<div style={{ display: 'flex', width: 1024, height: 728 }}>
				<ModCollectionComponent
					mods={mods!}
					forceUpdate={this.updatedActiveCollection()}
					collection={activeCollection!}
					setEnabledModsCallback={(enabledMods: Set<string>) => {
						if (activeCollection) {
							enabledMods.forEach((element) => {
								activeCollection?.mods.add(element);
							});
						}
					}}
					setDisabledModsCallback={(disabledMods: Set<string>) => {
						if (activeCollection) {
							disabledMods.forEach((element) => {
								activeCollection?.mods.delete(element);
							});
						}
					}}
					setAllEnabledCallback={() => {
						this.handleSelectAllClick(true);
					}}
					clearAllEnabledCallback={() => {
						this.handleSelectAllClick(false);
					}}
					setEnabledCallback={(id: string) => {
						this.handleClick(true, id);
					}}
					setDisabledCallback={(id: string) => {
						this.handleClick(false, id);
					}}
				/>
			</div>
		);
	}
}
export default withRouter(MainView);
