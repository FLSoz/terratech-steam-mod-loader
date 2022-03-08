/* eslint-disable no-nested-ternary */
import React, { Component, CSSProperties, ReactNode } from 'react';
import { useOutletContext, Outlet } from 'react-router-dom';
import { Layout, Button, Popover, Modal, Progress, Spin, Space, notification } from 'antd';

import sizeMe, { SizeMe } from 'react-sizeme';
import { convertToModData, filterRows, Mod, ModData, ModError, ModErrors, ModErrorType } from 'renderer/model/Mod';
import { AppState } from 'renderer/model/AppState';
import { api, ValidChannel } from 'renderer/model/Api';
import { ModCollection, ModCollectionProps } from 'renderer/model/ModCollection';
import { validateActiveCollection } from 'renderer/util/Validation';
import { CancellablePromiseManager } from 'renderer/util/Promise';
import { pause } from 'renderer/util/Sleep';
import ModCollectionComponent from './MainCollectionComponent';
import ModCollectionManager from './CollectionManagementToolbar';
import { AppConfig } from 'renderer/model/AppConfig';

const { Header, Footer, Content } = Layout;

enum ModalType {
	NONE = 0,
	VALIDATING = 'validating',
	ERRORS_FOUND = 'errors_found',
	WARNINGS_FOUND = 'warnings_found',
	REMOVE_INVALID = 'remove_invalid_mods',
	SUBSCRIBE_DEPENDENCIES = 'subscribe_dependencies',
	INCOMPATIBLE_MOD = 'incompatible'
}

interface CollectionManagerState {
	promiseManager: CancellablePromiseManager;
	savingCollection?: boolean;
	launchGameWithErrors?: boolean;
	gameRunning?: boolean;
	acknowledgedEmptyModlist?: boolean;
	validatingMods?: boolean;
	validatedMods?: number;
	modErrors?: ModErrors;
	overrideGameRunning?: boolean;
	rows: ModData[];
	filteredRows?: ModData[];
	madeEdits: boolean;
	modIdToModDataMap: Map<string, ModData>,

	// modal
	modalType: ModalType,
	invalidIdsFound?: boolean,
	missingDependenciesFound?: boolean,
	incompatibleModsFound?: boolean,
	missingSubscriptions?: boolean
}

interface NotificationProps {
	placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
	message: ReactNode;
	description?: ReactNode;
	btn?: ReactNode;
	className?: string;
	closeIcon?: ReactNode;
	duration: number | null;
	key?: string;
	style?: CSSProperties;
	onClick?: () => void;
	onClose?: () => void;
	top?: number;
	bottom?: number;
}

const openNotification = (props: NotificationProps, type?: 'info' | 'error' | 'success' | 'warn') => {
	notification[type || 'open']({ ...props });
};

class CollectionManagerComponent extends Component<{appState: AppState}, CollectionManagerState> {
	constructor(props: {appState: AppState}) {
		super(props);
		const { appState } = props;
		const rows: ModData[] = appState.mods ? convertToModData(appState.mods) : [];
		const modIdToModDataMap = new Map<string, ModData>();
		rows.forEach((mod: ModData) => modIdToModDataMap.set(mod.uid, mod));

		this.state = {
			promiseManager: new CancellablePromiseManager(),
			rows,
			modIdToModDataMap,
			filteredRows: undefined,
			gameRunning: false,
			validatingMods: true, // we validate on load
			modErrors: undefined,
			modalType: ModalType.VALIDATING, // we validate on load
			madeEdits: false
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

		this.pollGameRunning = this.pollGameRunning.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.GAME_RUNNING, this.setGameRunningCallback);
		this.pollGameRunning();
		this.validateActiveCollection(false);
	}

	componentWillUnmount() {
		const { promiseManager } = this.state;
		promiseManager.cancelAllPromises();
		api.removeAllListeners(ValidChannel.GAME_RUNNING);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	handleSelectAllClick(event: any) {
		const { appState } = this.props;
		const { mods, activeCollection } = appState;
		if (mods && activeCollection) {
			if (event.target.checked) {
				activeCollection.mods = [...mods.values()].map((mod) => mod.UID);
			} else {
				activeCollection.mods = [];
			}
		}
		this.setState({});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	handleClick(checked: boolean, id: string) {
		const { appState } = this.props;
		const { activeCollection } = appState;
		if (activeCollection) {
			if (checked) {
				if (!activeCollection.mods.includes(id)) {
					activeCollection.mods.push(id);
				}
			} else {
				activeCollection.mods = activeCollection.mods.filter((mod) => mod !== id);
			}
			this.setState({ madeEdits: true });
		}
	}

	setGameRunningCallback(running: boolean) {
		const { overrideGameRunning } = this.state;
		if (overrideGameRunning && running) {
			this.setState({ overrideGameRunning: false });
		}
		this.setState({ gameRunning: running });
	}

	createNewCollection(name: string) {
		const { madeEdits, promiseManager } = this.state;
		const { appState } = this.props;
		const { config, allCollectionNames, allCollections, activeCollection } = appState;
		if (madeEdits) {
			this.saveCollection(activeCollection as ModCollection, false);
		}

		this.setState({ savingCollection: true });
		const newCollection = {
			name,
			mods: []
		};
		promiseManager
			.execute(api.updateCollection(newCollection))
			.then(() => {
				allCollectionNames.add(name);
				allCollections.set(name, newCollection);
				config!.activeCollection = name;
				// eslint-disable-next-line promise/no-nesting
				api.updateConfig(config as AppConfig).catch((error) => {
					api.logger.error(error);
					openNotification(
						{
							message: 'Failed to udpate config',
							duration: null
						},
						'error'
					);
				});
				openNotification(
					{
						message: `Created new collection ${name}`,
						duration: 1
					},
					'success'
				);
				appState.activeCollection = newCollection;
				this.setState({});
				return true;
			})
			.catch((error) => {
				api.logger.error(error);
				openNotification(
					{
						message: `Failed to create new collection ${name}`,
						duration: null
					},
					'error'
				);
			})
			.finally(() => {
				this.setState({ savingCollection: false });
			});
	}

	duplicateCollection(name: string) {
		const { madeEdits, promiseManager } = this.state;
		const { appState } = this.props;
		const { config, allCollectionNames, allCollections, activeCollection } = appState;
		this.setState({ savingCollection: true });
		const newCollection = {
			name,
			mods: activeCollection ? [...activeCollection!.mods] : []
		};

		const oldName = activeCollection!.name;
		if (madeEdits) {
			this.saveCollection(activeCollection as ModCollection, false);
		}

		promiseManager
			.execute(api.updateCollection(newCollection))
			.then((writeSuccess) => {
				if (writeSuccess) {
					allCollectionNames.add(name);
					allCollections.set(name, newCollection);
					config!.activeCollection = name;
					// eslint-disable-next-line promise/no-nesting
					api.updateConfig(config as AppConfig).catch((error) => {
						api.logger.error(error);
						openNotification(
							{
								message: 'Failed to update config',
								duration: null
							},
							'error'
						);
					});
					openNotification(
						{
							message: `Duplicated collection ${oldName}`,
							duration: 1
						},
						'success'
					);
					appState.activeCollection = newCollection;
					this.setState({ madeEdits: false });
				} else {
					openNotification(
						{
							message: `Failed to create new collection ${name}`,
							duration: null
						},
						'error'
					);
				}
				return writeSuccess;
			})
			.catch((error) => {
				api.logger.error(error);
				openNotification(
					{
						message: `Failed to duplicate collection ${oldName}`,
						duration: null
					},
					'error'
				);
			})
			.finally(() => {
				this.setState({ savingCollection: false });
			});
	}

	renameCollection(name: string) {
		const { promiseManager } = this.state;
		const { appState } = this.props;
		const { config, activeCollection } = appState;
		const oldName = activeCollection!.name;
		this.setState({ savingCollection: true });
		promiseManager
			.execute(api.renameCollection(activeCollection!.name, name))
			.then((updateSuccess) => {
				if (updateSuccess) {
					activeCollection!.name = name;
					config!.activeCollection = name;
					// eslint-disable-next-line promise/no-nesting
					api.updateConfig(config as AppConfig).catch((error) => {
						api.logger.error(error);
						openNotification(
							{
								message: 'Failed to update config',
								duration: null
							},
							'error'
						);
					});
					openNotification(
						{
							message: `Collection ${oldName} renamed to ${name}`,
							duration: 1
						},
						'success'
					);
					this.setState({ madeEdits: false });
				} else {
					openNotification(
						{
							message: `Failed to rename collection ${oldName} to ${name}`,
							duration: null
						},
						'error'
					);
				}
				return updateSuccess;
			})
			.catch((error) => {
				api.logger.error(error);
				openNotification(
					{
						message: `Failed to rename collection ${oldName} to ${name}`,
						duration: null
					},
					'error'
				);
			})
			.finally(() => {
				this.setState({ savingCollection: false });
			});
	}

	deleteCollection() {
		const { promiseManager } = this.state;
		const { appState } = this.props;
		const { config, allCollectionNames, allCollections, activeCollection } = appState;
		this.setState({ savingCollection: true });
		const { name } = activeCollection!;
		promiseManager
			.execute(api.deleteCollection(name))
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

					config!.activeCollection = newCollectionName;
					// eslint-disable-next-line promise/no-nesting
					api.updateConfig(config as AppConfig).catch((error) => {
						api.logger.error(error);
						openNotification(
							{
								message: 'Failed to update config',
								duration: null
							},
							'error'
						);
					});
					openNotification(
						{
							message: `Collection ${activeCollection!.name} deleted`,
							duration: 1
						},
						'success'
					);
					appState.activeCollection = newCollection;
					this.setState({ madeEdits: false });
				} else {
					openNotification(
						{
							message: 'Failed to delete collection',
							duration: null
						},
						'error'
					);
				}
				return deleteSuccess;
			})
			.catch((error) => {
				api.logger.error(error);
				openNotification(
					{
						message: 'Failed to delete collection',
						duration: null
					},
					'error'
				);
			})
			.finally(() => {
				this.setState({ savingCollection: false });
			});
	}

	pollGameRunning() {
		const { promiseManager } = this.state;
		api.send(ValidChannel.GAME_RUNNING);
		if (!promiseManager.isCancelled.value) {
			pause(5000, this.pollGameRunning);
		}
	}

	addCollection(name: string) {
		const { appState } = this.props;
		const { allCollections, allCollectionNames } = appState;
		allCollectionNames?.add(name);
		allCollections?.set(name, { name, mods: [] });
	}

	// eslint-disable-next-line class-methods-use-this
	saveCollection(collection: ModCollection, pureSave: boolean) {
		this.setState({ savingCollection: true });
		const oldName = collection.name;
		api
			.updateCollection(collection)
			.then((writeSuccess) => {
				if (!writeSuccess) {
					openNotification(
						{
							message: `Failed to save collection ${oldName}`,
							duration: null
						},
						'error'
					);
				} else {
					openNotification(
						{
							message: `Saved collection ${oldName}`,
							duration: 1
						},
						'success'
					);
				}
				return writeSuccess;
			})
			.catch((error) => {
				api.logger.error(error);
			})
			.finally(() => {
				if (pureSave) {
					this.setState({ savingCollection: false, madeEdits: false });
				}
			});
	}

	baseLaunchGame(mods: Mod[]) {
		const { promiseManager } = this.state;
		const { appState } = this.props;
		const { config, updateState } = appState;
		api.logger.info('launching game');
		updateState({ launchingGame: true });
		this.setState({ overrideGameRunning: true });
		// add a visual delay so the user gets to see the nice spinning wheel
		promiseManager
			.execute(pause(1000, api.launchGame, config!.steamExec, config!.workshopID, config!.closeOnLaunch, mods))
			.then((success) => {
				setTimeout(() => {
					this.setState({ overrideGameRunning: false });
				}, 7000);
				return success;
			})
			.finally(() => {
				updateState({ launchingGame: false });
				this.setState({ gameRunning: true, launchGameWithErrors: false, modalType: ModalType.NONE });
			});
	}

	launchGame() {
		console.log('launching game');
		const { appState } = this.props;
		const { updateState } = appState;
		updateState({ launchingGame: true });
		this.setState({ validatingMods: true, modErrors: undefined, validatedMods: 0 }, () => {
			this.validateActiveCollection(true);
		});
	}

	validateActiveCollection(launchIfValid: boolean) {
		const { promiseManager, rows } = this.state;
		const { appState } = this.props;
		const { activeCollection, mods } = appState;
		this.setState({ modalType: ModalType.VALIDATING });
		if (activeCollection) {
			const collectionMods = [...activeCollection!.mods];
			api.logger.info('Selected mods:');
			api.logger.info(collectionMods);
			promiseManager
				.execute(
					validateActiveCollection({
						modList: collectionMods,
						allMods: mods,
						updateValidatedModsCallback: (validatedMods: number) => {
							api.logger.info(`We have validated ${validatedMods} mods`);
							this.setState({ validatedMods });
						},
						setModErrorsCallback: (modErrors: ModErrors) => {
							if (!!modErrors && Object.keys(modErrors).length > 0) {
								const foundErrorTypes = new Set<ModErrorType>();
								Object.values(modErrors).forEach((errors: ModError[]) => {
									errors.forEach((error: ModError) => foundErrorTypes.add(error.errorType));
								});

								const incompatibleModsFound = foundErrorTypes.has(ModErrorType.INCOMPATIBLE_MODS);
								const invalidIdsFound = foundErrorTypes.has(ModErrorType.INVALID_ID);
								const missingSubscriptions = foundErrorTypes.has(ModErrorType.NOT_SUBSCRIBED);
								const missingDependenciesFound = foundErrorTypes.has(ModErrorType.MISSING_DEPENDENCY);


								rows.forEach((mod: ModData) => {
									if (modErrors[mod.uid]) {
										mod.errors = modErrors[mod.uid];
									}
									else {
										mod.errors = undefined;
									}
								});
								this.setState({
									modalType: invalidIdsFound || incompatibleModsFound || missingDependenciesFound ? ModalType.ERRORS_FOUND : ModalType.WARNINGS_FOUND,
									modErrors,
									incompatibleModsFound,
									invalidIdsFound,
									missingSubscriptions,
									missingDependenciesFound
								});
							}
							else {
								rows.forEach((mod: ModData) => {
									mod.errors = undefined;
								});
								this.setState({ modErrors: undefined })
							}
						}
					})
				)
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
						promiseManager
							.execute(api.updateCollection(activeCollection!))
							.then((updateSuccess) => {
								if (!updateSuccess) {
									setTimeout(() => {
										openNotification(
											{
												message: `Failed to save collection ${activeCollection.name}`,
												duration: null
											},
											'error'
										);
									}, 500);
								} else {
									setTimeout(() => {
										openNotification(
											{
												message: 'Collection validated',
												duration: 1
											},
											'success'
										);
									}, 500);
								}
								setTimeout(() => {
									this.setState({ modalType: ModalType.NONE });
								}, 500);
								return updateSuccess;
							})
							.catch((error) => {
								api.logger.error(error);
								setTimeout(() => {
									openNotification(
										{
											message: `Failed to save collection ${activeCollection.name}`,
											duration: null
										},
										'error'
									);
									this.setState({ modalType: ModalType.NONE });
								}, 500);
							});
					} else {
						api.logger.error('Failed to validate active collection');
					}
					return success;
				})
				.catch((error) => {
					api.logger.error(error);
					setTimeout(() => {
						this.setState({ modalType: ModalType.NONE });
					}, 500);
					setTimeout(() => {
						openNotification(
							{
								message: `Failed to validate collection ${activeCollection.name}`,
								duration: null
							},
							'error'
						);
					}, 500);
				})
				.finally(() => {
					// validation is finished
					setTimeout(() => {
						this.setState({ validatingMods: false });
					}, 500);
				});
		} else {
			api.logger.info('NO ACTIVE COLLECTION');
			this.baseLaunchGame([]);
		}
	}

	// We allow you to load multiple mods with the same ID (bundle name), but only the local mod will be used
	// If multiple workshop mods have the same ID, and you select multiple, then we will force you to choose one to use
	renderModal() {
		const { modalType, launchGameWithErrors, validatedMods, modErrors, incompatibleModsFound, invalidIdsFound, missingDependenciesFound, missingSubscriptions } = this.state;
		const { appState } = this.props;
		const { activeCollection, mods, updateState } = appState;
		switch(modalType) {
			case ModalType.NONE:
				return null;
			case ModalType.VALIDATING:
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
						<Modal title={`Validating Mod Collection ${activeCollection!.name}`} visible closable={false} footer={null}>
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
			case ModalType.ERRORS_FOUND:
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
							this.setState({ modalType: ModalType.NONE });
							updateState({ launchingGame: false });
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
			case ModalType.WARNINGS_FOUND:
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
							console.log('cancel warningmodal');
							this.setState({ modalType: ModalType.NONE });
							updateState({ launchingGame: false });
						}}
						okButtonProps={{ disabled: launchGameWithErrors, loading: launchGameWithErrors, danger: true }}
						cancelButtonProps={{ disabled: launchGameWithErrors }}
					>
						<p>Unable to validate one or more mods in the collection.</p>
						<p>This is probably because you are not subscribed to them.</p>
						<p>Do you want to continue anyway?</p>
					</Modal>
				);
			default:
				return null;
		}
	}

	renderContent() {
		const { rows, filteredRows } = this.state;
		const { appState } = this.props;

		return (
			<SizeMe monitorHeight monitorWidth refreshMode="debounce">
				{({ size }) => {
					const collectionComponentProps: ModCollectionProps = {
						rows,
						filteredRows: filteredRows || rows,
						height: size.height as number,
						width: size.width as number,
						collection: appState.activeCollection as ModCollection,
						setEnabledModsCallback: (enabledMods: Set<string>) => {
							if (appState.activeCollection) {
								appState.activeCollection.mods = [...enabledMods].sort();
								this.setState({ madeEdits: true });
							}
						},
						setEnabledCallback: (id: string) => {
							this.handleClick(true, id);
						},
						setDisabledCallback: (id: string) => {
							this.handleClick(false, id);
						}
					};

					return (
						<Content key="collection" style={{ padding: '0px', overflowY: 'clip', overflowX: 'clip' }}>
							<Spin spinning={appState.launchingGame} tip="Launching Game...">
								<Outlet context={{...collectionComponentProps}}/>
							</Spin>
						</Content>
					);
				}}
			</SizeMe>
		);
	}

	render() {
		const { madeEdits, filteredRows, gameRunning, overrideGameRunning, modalType, savingCollection, validatingMods } = this.state;
		const { appState } = this.props;
		const { allCollections, searchString, launchingGame } = appState;

		const launchGameButton = (
			<Button type="primary" loading={launchingGame} disabled={overrideGameRunning || gameRunning || (modalType != ModalType.NONE) || launchingGame} onClick={this.launchGame}>
				Launch Game
			</Button>
		);

		return (
			<Layout>
				<Header style={{ height: 120 }}>
					<ModCollectionManager
						appState={appState}
						searchString={searchString || ""}
						validatingCollection={validatingMods}
						savingCollection={savingCollection}
						onSearchChangeCallback={(search) => {
							appState.searchString = search;
							this.setState({});
						}}
						validateCollectionCallback={() => {
							this.setState({ validatingMods: true }, () => {
								this.validateActiveCollection(false);
							});
						}}
						madeEdits={madeEdits}
						onSearchCallback={(search) => {
							if (search && search.length > 0) {
								const { rows } = this.state;
								const newFilteredRows = filterRows(rows, search);
								this.setState({ filteredRows: newFilteredRows });
							} else {
								this.setState({ filteredRows: undefined });
							}
							appState.searchString = search;
							this.setState({});
						}}
						changeActiveCollectionCallback={(name: string) => {
							appState.activeCollection = allCollections.get(name)!;
							this.setState({});
						}}
						numResults={filteredRows ? filteredRows.length : undefined}
						newCollectionCallback={this.createNewCollection}
						duplicateCollectionCallback={this.duplicateCollection}
						renameCollectionCallback={this.renameCollection}
						deleteCollectionCallback={this.deleteCollection}
						saveCollectionCallback={() => {
							this.saveCollection(appState.activeCollection as ModCollection, true);
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
		);
	}
}

export default (props: any) => {
	return <CollectionManagerComponent appState={useOutletContext<AppState>()}/>;
}
