/* eslint-disable no-nested-ternary */
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { Layout, Button, Popover, Modal, Progress, Spin } from 'antd';

import { SizeMe } from 'react-sizeme';
import { Mod } from 'renderer/model/Mod';
import { AppState } from 'renderer/model/AppState';
import { api, ValidChannel } from 'renderer/model/Api';
import { ModCollection, ModError, ModErrors, ModErrorType } from 'renderer/model/ModCollection';
import { validateActiveCollection } from 'renderer/util/Validation';
import ModCollectionComponent from './components/ModCollectionComponent';
import MenuBar from './components/MenuBar';
import ModCollectionManager from './components/ModCollectionManager';

const { Header, Footer, Sider, Content } = Layout;

interface MainState extends AppState {
	savingCollection?: boolean;
	launchingGame?: boolean;
	launchGameWithErrors?: boolean;
	gameRunning?: boolean;
	acknowledgedEmptyModlist?: boolean;
	validatingMods?: boolean;
	validatedMods?: number;
	modErrors?: ModErrors;
	modalActive?: boolean;
}

class MainView extends Component<RouteComponentProps, MainState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: RouteComponentProps) {
		super(props);
		const appState = props.location.state as AppState;
		this.state = { gameRunning: false, validatingMods: false, modErrors: undefined, sidebarCollapsed: true, launchingGame: false, ...appState };

		this.validateActiveCollection(false);
		this.handleSelectAllClick = this.handleSelectAllClick.bind(this);
		this.handleClick = this.handleClick.bind(this);
		this.setGameRunningCallback = this.setGameRunningCallback.bind(this);
		this.launchGame = this.launchGame.bind(this);
		this.baseLaunchGame = this.baseLaunchGame.bind(this);

		this.renameCollection = this.renameCollection.bind(this);
		this.createNewCollection = this.createNewCollection.bind(this);
		this.duplicateCollection = this.duplicateCollection.bind(this);
		this.deleteCollection = this.deleteCollection.bind(this);
		// this.isItemSelected = this.isItemSelected.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.GAME_RUNNING, this.setGameRunningCallback);
		this.pollGameRunning();
	}

	componentWillUnmount() {
		api.removeAllListeners(ValidChannel.GAME_RUNNING);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	handleSelectAllClick(event: any) {
		const { mods, activeCollection } = this.state;
		if (mods && activeCollection) {
			if (event.target.checked) {
				activeCollection.mods = [...mods.values()].map((mod) => mod.ID);
			} else {
				activeCollection.mods = [];
			}
		}
		this.setState({});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	handleClick(checked: boolean, id: string) {
		const { activeCollection } = this.state;
		if (activeCollection) {
			if (checked) {
				if (!activeCollection.mods.includes(id)) {
					activeCollection.mods.push(id);
				}
			} else {
				activeCollection.mods = activeCollection.mods.filter((mod) => mod !== id);
			}
			this.setState({});
		}
	}

	setGameRunningCallback(running: boolean) {
		this.setState({ gameRunning: running });
	}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

	createNewCollection(name: string) {
		const { config, allCollectionNames, allCollections } = this.state;
		this.setState({ savingCollection: true });
		const newCollection = {
			name,
			mods: []
		};
		api
			.updateCollection(newCollection)
			.then(() => {
				allCollectionNames.add(name);
				allCollections.set(name, newCollection);
				config.activeCollection = name;
				// eslint-disable-next-line promise/no-nesting
				api.updateConfig(config).catch((error) => {
					api.logger.error(error);
					// TODO: notify if fails
				});
				this.setState({ activeCollection: newCollection });
				return true;
			})
			.catch((error) => {
				api.logger.error(error);
				// TODO: notify of failure
			})
			.finally(() => {
				this.setState({ savingCollection: false });
			});
	}

	duplicateCollection(name: string) {
		const { config, allCollectionNames, allCollections, activeCollection } = this.state;
		this.setState({ savingCollection: true });
		const newCollection = {
			name,
			mods: activeCollection ? [...activeCollection!.mods] : []
		};
		api
			.updateCollection(newCollection)
			.then((writeSuccess) => {
				if (writeSuccess) {
					allCollectionNames.add(name);
					allCollections.set(name, newCollection);
					config.activeCollection = name;
					// update config - TODO: notify if fails
					// eslint-disable-next-line promise/no-nesting
					api.updateConfig(config).catch((error) => {
						api.logger.error(error);
						// TODO: notify if fails
					});
					this.setState({ activeCollection: newCollection });
				} else {
					// TODO: notify of write success
				}
				return writeSuccess;
			})
			.catch((error) => {
				api.logger.error(error);
				// TODO: notify of failure
			})
			.finally(() => {
				this.setState({ savingCollection: false });
			});
	}

	renameCollection(name: string) {
		const { config, activeCollection } = this.state;
		this.setState({ savingCollection: true });
		api
			.renameCollection(activeCollection!.name, name)
			.then((updateSuccess) => {
				if (updateSuccess) {
					activeCollection!.name = name;
					config.activeCollection = name;
					// update config - TODO: notify if fails
					// eslint-disable-next-line promise/no-nesting
					api.updateConfig(config).catch((error) => {
						api.logger.error(error);
						// TODO: notify if fails
					});
				} else {
					// TODO: notify of failure to rename
				}
				return updateSuccess;
			})
			.catch((error) => {
				api.logger.error(error);
				// TODO: notify of failure
			})
			.finally(() => {
				this.setState({ savingCollection: false });
			});
	}

	deleteCollection() {
		const { config, allCollectionNames, allCollections, activeCollection } = this.state;
		this.setState({ savingCollection: true });
		const { name } = activeCollection!;
		api
			.deleteCollection(name)
			.then((deleteSuccess) => {
				if (deleteSuccess) {
					allCollectionNames.delete(name);
					allCollections.delete(name);

					let newCollection: ModCollection = {
						name: 'default',
						mods: []
					};
					let newCollectionName = 'default';

					if (allCollectionNames.size > 0) {
						// eslint-disable-next-line prefer-destructuring
						newCollectionName = [...allCollectionNames].sort()[0];
						newCollection = allCollections.get(newCollectionName)!;
					}

					config.activeCollection = newCollectionName;
					// update config - TODO: notify if fails
					// eslint-disable-next-line promise/no-nesting
					api.updateConfig(config).catch((error) => {
						api.logger.error(error);
						// TODO: notify if fails
					});
					this.setState({ activeCollection: newCollection });
				} else {
					// TODO: notify of write success
				}
				return deleteSuccess;
			})
			.catch((error) => {
				api.logger.error(error);
				// TODO: notify of failure
			})
			.finally(() => {
				this.setState({ savingCollection: false });
			});
	}

	pollGameRunning() {
		api.send(ValidChannel.GAME_RUNNING);
		setTimeout(() => {
			this.pollGameRunning();
		}, 5000);
	}

	addCollection(name: string) {
		const { allCollectionNames, allCollections } = this.state;
		allCollectionNames?.add(name);
		allCollections?.set(name, { name, mods: [] });
	}

	// eslint-disable-next-line class-methods-use-this
	saveCollection(collection: ModCollection) {
		api.updateCollection(collection);
	}

	baseLaunchGame(mods: Mod[]) {
		const { config } = this.state;
		api.logger.info('launching game');
		const launchPromise = api.launchGame(config.steamExec, config.workshopID, config.closeOnLaunch, mods);
		if (!config?.closeOnLaunch) {
			launchPromise.finally(() => {
				this.setState({ launchingGame: false, gameRunning: true, launchGameWithErrors: false, modalActive: false });
			});
		}
	}

	launchGame() {
		this.setState({ launchingGame: true });
		this.validateActiveCollection(true);
	}

	refreshMods() {
		const { history } = this.props;
		history.push('/mods', this.state);
	}

	isItemSelected(id: string): boolean {
		const { activeCollection } = this.state;
		return activeCollection ? activeCollection.mods.includes(id) : false;
	}

	updatedActiveCollection(): boolean {
		return false;
	}

	validateActiveCollection(launchIfValid: boolean) {
		const { activeCollection, mods } = this.state;
		this.setState({ validatingMods: true, modalActive: true });
		if (activeCollection) {
			const collectionMods = [...activeCollection!.mods];
			api.logger.info('Selected mods:');
			api.logger.info(collectionMods);
			validateActiveCollection({
				modList: collectionMods,
				allMods: mods,
				updateValidatedModsCallback: (validatedMods: number) => {
					this.setState({ validatedMods });
				},
				setModErrorsCallback: (modErrors: ModErrors) => {
					this.setState({ modErrors });
				}
			})
				.then((success) => {
					if (success) {
						api.logger.info(`To launch game?: ${launchIfValid}`);
						if (success && launchIfValid) {
							const modDataList = collectionMods.map((modID) => {
								return mods.get(modID) as Mod;
							});
							this.baseLaunchGame(modDataList);
						}
						// eslint-disable-next-line promise/no-nesting
						api
							.updateCollection(activeCollection!)
							.then((updateSuccess) => {
								if (!updateSuccess) {
									// TODO: notify of failed update
								}
								return updateSuccess;
							})
							.catch((error) => {
								api.logger.error(error);
								// TODO: notify of failed update
							});
					} else {
						api.logger.error('Failed to validate active collection');
						// TODO: notify of failed update
						// remove modal, since we are done validating - success or fail
						this.setState({ modalActive: false });
					}
					return success;
				})
				.catch((error) => {
					api.logger.error(error);
					// TODO: notify of failed update
					// remove modal, since we are done validating - success or fail
					this.setState({ modalActive: false });
				})
				.finally(() => {
					// TODO: notify of failed update
					// validation is finished
					this.setState({ validatingMods: false });
				});
		} else {
			api.logger.info('NO ACTIVE COLLECTION');
			this.baseLaunchGame([]);
		}
	}

	// We allow you to load multiple mods with the same ID (bundle name), but only the local mod will be used
	// If multiple workshop mods have the same ID, and you select multiple, then we will force you to choose one to use
	renderModal() {
		const { launchingGame, launchGameWithErrors, validatingMods, validatedMods, activeCollection, modErrors, mods } = this.state;
		if (launchingGame) {
			if (validatingMods) {
				let progressPercent = 0;
				let currentMod: Mod | undefined;
				if (!activeCollection?.mods) {
					progressPercent = 100;
				} else {
					const currentlyValidatedMods = validatedMods || 0;
					progressPercent = (100 * currentlyValidatedMods) / activeCollection.mods.length;
					if (progressPercent < 100) {
						const collectionMods = [...activeCollection.mods];
						currentMod = mods?.get(collectionMods[currentlyValidatedMods]);
					}
				}
				let status: 'active' | 'exception' | 'success' = 'active';
				if (modErrors) {
					status = 'exception';
				} else if (progressPercent >= 100) {
					status = 'success';
				}
				return (
					<Modal title="Validating Mod Collection" visible closable={false} footer={null}>
						{currentMod ? (
							<p>Validating mod {currentMod.config?.name ? currentMod.config!.name : currentMod.ID}</p>
						) : progressPercent >= 100 ? (
							<p>All mods validated!</p>
						) : null}
						<Progress type="circle" percent={progressPercent} status={status} />
					</Modal>
				);
			}
			if (modErrors) {
				return (
					<Modal
						title="Errors Found in Configuration"
						visible
						closable={false}
						okText="Launch Anyway"
						cancelText="Address Errors"
						onOk={() => {
							this.setState({ launchGameWithErrors: true });
							const modList: Mod[] = (activeCollection ? [...activeCollection!.mods].map((mod) => mods!.get(mod)) : []) as Mod[];
							this.baseLaunchGame(modList);
						}}
						onCancel={() => {
							this.setState({ launchingGame: false, modalActive: false });
						}}
						okButtonProps={{ disabled: launchGameWithErrors, loading: launchGameWithErrors }}
						cancelButtonProps={{ disabled: launchGameWithErrors }}
					>
						<p>One or more mods have either missing dependencies, or is selected alongside incompatible mods.</p>
						<p>Launching the game with this mod list may lead to crashes, or even save game corruption.</p>
						<p>
							Mods that share the same Mod ID (Not the same as Workshop ID) are explicitly incompatible, and only the first one TerraTech loads will be used.
							All others will be ignored.
						</p>

						<p>Do you want to continue anyway?</p>
					</Modal>
				);
			}
		}
		return null;
	}

	renderContent() {
		const { mods, activeCollection, launchingGame, searchString } = this.state;
		return (
			<SizeMe monitorHeight monitorWidth refreshMode="debounce">
				{({ size }) => {
					return (
						<Content key="collection" style={{ padding: '0px', overflowY: 'clip', overflowX: 'clip' }}>
							<Spin spinning={launchingGame} tip="Launching Game...">
								<ModCollectionComponent
									searchString={searchString}
									mods={mods!}
									height={size.height as number}
									width={size.width as number}
									forceUpdate={this.updatedActiveCollection()}
									collection={activeCollection!}
									setEnabledModsCallback={(enabledMods: Set<string>) => {
										if (activeCollection) {
											activeCollection.mods = [...enabledMods].sort();
											this.setState({});
										}
									}}
									setEnabledCallback={(id: string) => {
										this.handleClick(true, id);
									}}
									setDisabledCallback={(id: string) => {
										this.handleClick(false, id);
									}}
								/>
							</Spin>
						</Content>
					);
				}}
			</SizeMe>
		);
	}

	render() {
		const { gameRunning, launchingGame, sidebarCollapsed, modalActive, searchString, savingCollection, allCollections } = this.state;
		const { history, location, match } = this.props;

		const launchGameButton = (
			<Button loading={launchingGame} disabled={gameRunning || modalActive || launchingGame} onClick={this.launchGame}>
				Launch Game
			</Button>
		);

		return (
			<div style={{ display: 'flex', width: '100%', height: '100%' }}>
				<Layout style={{ minHeight: '100vh' }}>
					<Sider
						collapsible
						collapsed={sidebarCollapsed}
						onCollapse={(collapsed) => {
							this.setState({ sidebarCollapsed: collapsed });
						}}
					>
						<div className="logo" />
						<MenuBar
							disableNavigation={launchingGame || modalActive}
							currentTab="main"
							history={history}
							location={location}
							match={match}
							appState={this.state}
						/>
					</Sider>
					<Layout>
						<Header style={{ height: 120 }}>
							<ModCollectionManager
								searchString={searchString}
								appState={this.state}
								savingCollection={savingCollection}
								onSearchCallback={(search) => {
									this.setState({ searchString: search });
								}}
								changeActiveCollectionCallback={(name: string) => {
									this.setState({ activeCollection: allCollections.get(name)! });
								}}
								newCollectionCallback={this.createNewCollection}
								duplicateCollectionCallback={this.duplicateCollection}
								renameCollectionCallback={this.renameCollection}
								deleteCollectionCallback={this.deleteCollection}
							/>
						</Header>
						{this.renderModal()}
						{this.renderContent()}
						<Footer style={{ justifyContent: 'center', display: 'flex' }}>
							{launchingGame ? (
								<Popover content="Already launching game">{launchGameButton}</Popover>
							) : gameRunning ? (
								<Popover content="Game already running">{launchGameButton}</Popover>
							) : (
								launchGameButton
							)}
						</Footer>
					</Layout>
				</Layout>
			</div>
		);
	}
}
export default withRouter(MainView);
