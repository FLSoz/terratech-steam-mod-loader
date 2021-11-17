/* eslint-disable no-nested-ternary */
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { Layout, Button, Popover, Modal, Progress, Spin, Space } from 'antd';

import { SizeMe } from 'react-sizeme';
import { convertToModData, filterRows, Mod, ModData } from 'renderer/model/Mod';
import { AppState } from 'renderer/model/AppState';
import { api, ValidChannel } from 'renderer/model/Api';
import { ModCollection, ModErrors } from 'renderer/model/ModCollection';
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
	overrideGameRunning?: boolean;
	rows: ModData[];
	filteredRows?: ModData[];
}

class MainView extends Component<RouteComponentProps, MainState> {
	constructor(props: RouteComponentProps) {
		super(props);
		const appState = props.location.state as AppState;
		const rows: ModData[] = appState.mods ? convertToModData(appState.mods) : [];
		this.state = {
			rows,
			filteredRows: undefined,
			gameRunning: false,
			validatingMods: true, // we validate on load
			modErrors: undefined,
			sidebarCollapsed: true,
			launchingGame: false,
			modalActive: true, // we validate on load
			...appState
		};

		this.handleSelectAllClick = this.handleSelectAllClick.bind(this);
		this.handleClick = this.handleClick.bind(this);
		this.setGameRunningCallback = this.setGameRunningCallback.bind(this);
		this.launchGame = this.launchGame.bind(this);
		this.baseLaunchGame = this.baseLaunchGame.bind(this);

		this.renameCollection = this.renameCollection.bind(this);
		this.createNewCollection = this.createNewCollection.bind(this);
		this.duplicateCollection = this.duplicateCollection.bind(this);
		this.deleteCollection = this.deleteCollection.bind(this);
		this.saveCollection = this.saveCollection.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.GAME_RUNNING, this.setGameRunningCallback);
		this.pollGameRunning();
		this.validateActiveCollection(false);
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
		const { overrideGameRunning } = this.state;
		if (overrideGameRunning && running) {
			this.setState({ overrideGameRunning: false });
		}
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
		this.setState({ savingCollection: true });
		api.updateCollection(collection).finally(() => {
			this.setState({ savingCollection: false });
		});
	}

	baseLaunchGame(mods: Mod[]) {
		const { config } = this.state;
		api.logger.info('launching game');
		this.setState({ overrideGameRunning: true, launchingGame: true });
		// add a visual delay so the user gets to see the nice spinning wheel
		setTimeout(() => {
			const launchPromise = api.launchGame(config.steamExec, config.workshopID, config.closeOnLaunch, mods);
			if (!config?.closeOnLaunch) {
				launchPromise.finally(() => {
					this.setState({ launchingGame: false, gameRunning: true, launchGameWithErrors: false, modalActive: false });
				});
				setTimeout(() => {
					this.setState({ overrideGameRunning: false });
				}, 7000);
			}
		}, 1000);
	}

	launchGame() {
		console.log('launching game');
		this.setState({ validatingMods: true, launchingGame: true, modErrors: undefined, validatedMods: 0 }, () => {
			this.validateActiveCollection(true);
		});
	}

	refreshMods() {
		const { history } = this.props;
		history.push('/mods', this.state);
	}

	validateActiveCollection(launchIfValid: boolean) {
		const { activeCollection, mods } = this.state;
		this.setState({ modalActive: true });
		if (activeCollection) {
			const collectionMods = [...activeCollection!.mods];
			api.logger.info('Selected mods:');
			api.logger.info(collectionMods);
			validateActiveCollection({
				modList: collectionMods,
				allMods: mods,
				updateValidatedModsCallback: (validatedMods: number) => {
					api.logger.info(`We have validated ${validatedMods} mods`);
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
					}
					return success;
				})
				.catch((error) => {
					api.logger.error(error);
					// TODO: notify of failed update
					setTimeout(() => {
						this.setState({ modalActive: false });
					}, 2000);
				})
				.finally(() => {
					// TODO: notify of failed update
					// validation is finished
					setTimeout(() => {
						this.setState({ validatingMods: false });
					}, 2000);
				});
		} else {
			api.logger.info('NO ACTIVE COLLECTION');
			this.baseLaunchGame([]);
		}
	}

	// We allow you to load multiple mods with the same ID (bundle name), but only the local mod will be used
	// If multiple workshop mods have the same ID, and you select multiple, then we will force you to choose one to use
	renderModal() {
		const { modalActive, launchingGame, launchGameWithErrors, validatingMods, validatedMods, activeCollection, modErrors, mods } = this.state;
		if (modalActive || launchingGame) {
			if (validatingMods) {
				let progressPercent = 0;
				let currentMod: Mod | undefined;
				if (!activeCollection?.mods) {
					progressPercent = 100;
				} else {
					const currentlyValidatedMods = validatedMods || 0;
					progressPercent = Math.round((100 * currentlyValidatedMods) / activeCollection.mods.length);
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
					<Modal title={`Validating Mod Collection ${activeCollection.name}`} visible closable={false} footer={null}>
						<div>
							<Space direction="vertical" size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
								<Progress type="circle" percent={progressPercent} status={status} />
								{currentMod ? (
									<p>Validating mod {currentMod.config?.name ? currentMod.config!.name : currentMod.ID}</p>
								) : progressPercent >= 100 ? (
									<p>Validation complete!</p>
								) : null}
							</Space>
						</div>
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
							console.log('cancel error modal');
							this.setState({ launchingGame: false, modalActive: false });
						}}
						okButtonProps={{ disabled: launchGameWithErrors, loading: launchGameWithErrors, danger: true }}
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
		const { mods, activeCollection, launchingGame, rows, filteredRows } = this.state;
		return (
			<SizeMe monitorHeight monitorWidth refreshMode="debounce">
				{({ size }) => {
					return (
						<Content key="collection" style={{ padding: '0px', overflowY: 'clip', overflowX: 'clip' }}>
							<Spin spinning={launchingGame} tip="Launching Game...">
								<ModCollectionComponent
									rows={rows}
									filteredRows={filteredRows || rows}
									mods={mods!}
									height={size.height as number}
									width={size.width as number}
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
		const { filteredRows, gameRunning, overrideGameRunning, launchingGame, sidebarCollapsed, modalActive, savingCollection, allCollections, searchString } =
			this.state;
		const { history, location, match } = this.props;

		const launchGameButton = (
			<Button type="primary" loading={launchingGame} disabled={overrideGameRunning || gameRunning || modalActive || launchingGame} onClick={this.launchGame}>
				Launch Game
			</Button>
		);

		return (
			<div style={{ display: 'flex', width: '100%', height: '100%' }}>
				<Layout style={{ minHeight: '100vh' }}>
					<Sider
						className="MenuBar"
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
								appState={this.state}
								searchString={searchString}
								savingCollection={savingCollection}
								onSearchChangeCallback={(search) => {
									this.setState({ searchString: search });
								}}
								onSearchCallback={(search) => {
									if (search && search.length > 0) {
										const { rows } = this.state;
										const newFilteredRows = filterRows(rows, search);
										this.setState({ filteredRows: newFilteredRows });
									} else {
										this.setState({ filteredRows: undefined });
									}
									this.setState({ searchString: search });
								}}
								changeActiveCollectionCallback={(name: string) => {
									this.setState({ activeCollection: allCollections.get(name)! });
								}}
								numResults={filteredRows ? filteredRows.length : undefined}
								newCollectionCallback={this.createNewCollection}
								duplicateCollectionCallback={this.duplicateCollection}
								renameCollectionCallback={this.renameCollection}
								deleteCollectionCallback={this.deleteCollection}
								saveCollectionCallback={() => {
									const { activeCollection } = this.state;
									this.saveCollection(activeCollection);
								}}
							/>
						</Header>
						{this.renderModal()}
						{this.renderContent()}
						<Footer className="MainFooter" style={{ justifyContent: 'center', display: 'flex' }}>
							{launchingGame ? (
								<Popover content="Already launching game">{launchGameButton}</Popover>
							) : gameRunning || !!overrideGameRunning ? (
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
