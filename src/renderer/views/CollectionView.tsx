/* eslint-disable no-nested-ternary */
import React, { Component } from 'react';
import { useOutletContext, Outlet, useLocation, Location } from 'react-router-dom';
import { Layout, Button, Popover, notification } from 'antd';
import { SizeMe } from 'react-sizeme';
import {
	ModData,
	CollectionErrors,
	AppState,
	ModCollection,
	CollectionViewProps,
	AppConfig,
	ValidChannel,
	getRows,
	filterRows,
	getByUID,
	validateCollection,
	ModType,
	DisplayModData,
	CollectionViewType,
	CollectionManagerModalType,
	NotificationProps,
	ModErrorType,
	setupDescriptors
} from 'model';
import api from 'renderer/Api';
import { cancellablePromise, CancellablePromise, CancellablePromiseManager } from 'util/Promise';
import { pause } from 'util/Sleep';
import CollectionManagerToolbar from '../components/collections/CollectionManagementToolbar';
import ModDetailsFooter from '../components/collections/ModDetailsFooter';
import ModLoadingView from '../components/loading/ModLoading';
import CollectionManagerModal from '../components/collections/CollectionManagerModal';

const { Header, Footer, Content } = Layout;

interface CollectionManagerState {
	updatePromiseManager: CancellablePromiseManager;
	validationPromise?: CancellablePromise<CollectionErrors>;
	savingCollection?: boolean;
	launchGameWithErrors?: boolean;
	gameRunning?: boolean;
	acknowledgedEmptyModlist?: boolean;
	validatingMods?: boolean;
	validatedMods?: number;
	collectionErrors?: CollectionErrors;
	overrideGameRunning?: boolean;
	filteredRows?: ModData[];
	madeEdits: boolean;

	// modal
	modalType: CollectionManagerModalType;

	lastValidationStatus?: boolean;
	guidedFixActive?: boolean;

	currentRecord?: ModData;
	bigDetails?: boolean;
}

const openNotification = (props: NotificationProps, type?: 'info' | 'error' | 'success' | 'warn') => {
	notification[type || 'open']({ ...props });
};

class CollectionView extends Component<{ appState: AppState; location: Location }, CollectionManagerState> {
	constructor(props: { appState: AppState; location: Location }) {
		super(props);
		this.state = {
			updatePromiseManager: new CancellablePromiseManager(),
			filteredRows: undefined,
			gameRunning: false,
			validatingMods: false, // we don't validate on load
			collectionErrors: undefined,
			modalType: CollectionManagerModalType.NONE, // we don't validate on load
			madeEdits: false,
			bigDetails: true
		};

		this.handleClick = this.handleClick.bind(this);
		this.setGameRunningCallback = this.setGameRunningCallback.bind(this);
		this.launchGame = this.launchGame.bind(this);
		this.baseLaunchGame = this.baseLaunchGame.bind(this);
		this.pollGameRunning = this.pollGameRunning.bind(this);

		this.renameCollection = this.renameCollection.bind(this);
		this.createNewCollection = this.createNewCollection.bind(this);
		this.duplicateCollection = this.duplicateCollection.bind(this);
		this.deleteCollection = this.deleteCollection.bind(this);
		this.saveCollection = this.saveCollection.bind(this);

		this.pollGameRunning = this.pollGameRunning.bind(this);
		this.validateActiveCollection = this.validateActiveCollection.bind(this);
		this.onModMetadataUpdate = this.onModMetadataUpdate.bind(this);

		this.openModal = this.openModal.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.GAME_RUNNING, this.setGameRunningCallback);
		api.on(ValidChannel.MOD_METADATA_UPDATE, this.onModMetadataUpdate);

		const { appState } = this.props;
		if (!appState.loadingMods) {
			this.recalculateModData();
		}
	}

	componentWillUnmount() {
		const { updatePromiseManager: promiseManager, validationPromise } = this.state;
		promiseManager.cancelAllPromises();
		if (validationPromise) {
			validationPromise.cancel();
		}
		api.removeAllListeners(ValidChannel.GAME_RUNNING);
		api.removeListener(ValidChannel.MOD_METADATA_UPDATE, this.onModMetadataUpdate);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	handleClick(checked: boolean, uid: string) {
		const { appState } = this.props;
		const { activeCollection } = appState;
		if (activeCollection) {
			let changed = false;
			if (checked) {
				if (!activeCollection.mods.includes(uid)) {
					changed = true;
					activeCollection.mods.push(uid);
				}
			} else if (uid !== this.getModManagerUID()) {
				activeCollection.mods = activeCollection.mods.filter((mod) => mod !== uid);
				changed = true;
			} else {
				// display modal
				this.setState({ modalType: CollectionManagerModalType.DESELECTING_MOD_MANAGER });
			}
			if (changed) {
				const { validationPromise } = this.state;
				if (validationPromise) {
					validationPromise.cancel();
				}
				this.setState({ madeEdits: true }, () => appState.updateState({}, () => this.validateActiveCollection(false)));
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onModMetadataUpdate(uid: string, update: any) {
		const { appState } = this.props;
		const { mods } = appState;
		api.logger.debug(`Received update for mod ${uid}: ${JSON.stringify(update, null, 2)}`);
		const modData = mods.modIdToModDataMap.get(uid);
		if (modData) {
			const regenerateDescriptors = update.installed && !modData.installed;
			Object.assign(modData, update);
			if (regenerateDescriptors) {
				setupDescriptors(mods, appState.config.userOverrides);
			}
			this.validateActiveCollection(false);
		}
	}

	getModManagerUID() {
		const { appState } = this.props;
		return `${ModType.WORKSHOP}:${appState.config.workshopID}`;
	}

	setGameRunningCallback(running: boolean) {
		const { overrideGameRunning } = this.state;
		if (overrideGameRunning && running) {
			this.setState({ overrideGameRunning: false });
		}
		this.setState({ gameRunning: running });
	}

	setModErrors(collectionErrors: CollectionErrors, launchIfValid: boolean): boolean {
		const { appState } = this.props;
		const { mods, config } = appState;
		const { ignoredValidationErrors } = config;
		const rows = getRows(mods);

		if (!!collectionErrors && Object.keys(collectionErrors).length > 0) {
			let incompatibleModsFound = false;
			let invalidIdsFound = false;
			let missingSubscriptions = false;
			let missingDependenciesFound = false;

			const incompatibleIgnoredErrors = ignoredValidationErrors.get(ModErrorType.INCOMPATIBLE_MODS);
			const invalidIgnoredErrors = ignoredValidationErrors.get(ModErrorType.INVALID_ID);
			const dependencyIgnoredErrors = ignoredValidationErrors.get(ModErrorType.MISSING_DEPENDENCIES);

			let nonIgnoredFailed = false;

			rows.forEach((mod: DisplayModData) => {
				const thisModErrors = collectionErrors[mod.uid];
				if (thisModErrors) {
					if (incompatibleIgnoredErrors && incompatibleIgnoredErrors[mod.uid]) {
						if (thisModErrors.incompatibleMods) {
							const nonIgnoredErrors = thisModErrors.incompatibleMods.filter((uid) => !incompatibleIgnoredErrors[mod.uid].includes(uid));
							thisModErrors.incompatibleMods = nonIgnoredErrors.length > 0 ? nonIgnoredErrors : undefined;
						}
					}
					incompatibleModsFound ||= !!thisModErrors.incompatibleMods && thisModErrors.incompatibleMods.length > 0;
					if (invalidIgnoredErrors && invalidIgnoredErrors[mod.uid]) {
						if (thisModErrors.invalidId) {
							thisModErrors.invalidId = invalidIgnoredErrors[mod.uid].length > 0;
						}
					}
					invalidIdsFound ||= !!thisModErrors.invalidId;
					missingSubscriptions ||= !!thisModErrors.notSubscribed;
					if (dependencyIgnoredErrors && dependencyIgnoredErrors[mod.uid]) {
						if (thisModErrors.missingDependencies) {
							const nonIgnoredErrors = thisModErrors.missingDependencies.filter(
								(descriptor) => !dependencyIgnoredErrors[mod.uid].includes(descriptor.modID!)
							);
							thisModErrors.missingDependencies = nonIgnoredErrors.length > 0 ? nonIgnoredErrors : undefined;
						}
					}
					missingDependenciesFound ||= !!thisModErrors.missingDependencies && thisModErrors.missingDependencies.length > 0;
					mod.errors = thisModErrors;

					nonIgnoredFailed ||= !!thisModErrors.needsUpdate || !!thisModErrors.notInstalled;
				} else {
					mod.errors = undefined;
				}
			});
			this.setState({
				collectionErrors
			});
			nonIgnoredFailed ||= invalidIdsFound || incompatibleModsFound || missingDependenciesFound || missingSubscriptions;
			if (launchIfValid && nonIgnoredFailed) {
				this.setState({
					modalType:
						invalidIdsFound || incompatibleModsFound || missingDependenciesFound
							? CollectionManagerModalType.ERRORS_FOUND
							: CollectionManagerModalType.WARNINGS_FOUND
				});
			}
			return !nonIgnoredFailed;
		}
		rows.forEach((mod: DisplayModData) => {
			mod.errors = undefined;
		});
		this.setState({ collectionErrors: undefined });
		return true;
	}

	recalculateModData() {
		const { appState } = this.props;
		const { mods } = appState;

		this.setState(
			{
				filteredRows: filterRows(mods, appState.searchString)
			},
			() => {
				this.validateActiveCollection(false);
			}
		);
	}

	createNewCollection(name: string, mods?: string[]) {
		const { madeEdits, updatePromiseManager: promiseManager } = this.state;
		const { appState } = this.props;
		const { config, allCollectionNames, allCollections, activeCollection } = appState;
		if (madeEdits) {
			this.saveCollection(activeCollection as ModCollection, false);
		}

		this.setState({ savingCollection: true });
		const newCollection = {
			name,
			mods: mods || []
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
							placement: 'bottomLeft',
							duration: null
						},
						'error'
					);
				});
				openNotification(
					{
						message: `Created new collection ${name}`,
						placement: 'bottomRight',
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
						placement: 'bottomRight',
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
		const { madeEdits, updatePromiseManager: promiseManager } = this.state;
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
								placement: 'bottomLeft',
								duration: null
							},
							'error'
						);
					});
					openNotification(
						{
							message: `Duplicated collection ${oldName}`,
							placement: 'bottomRight',
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
							placement: 'bottomRight',
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
						placement: 'bottomRight',
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
		const { updatePromiseManager: promiseManager } = this.state;
		const { appState } = this.props;
		const { config, activeCollection } = appState;
		const oldName = activeCollection!.name;
		this.setState({ savingCollection: true });
		promiseManager
			.execute(api.renameCollection(activeCollection!, name))
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
								placement: 'bottomLeft',
								duration: null
							},
							'error'
						);
					});
					openNotification(
						{
							message: `Collection ${oldName} renamed to ${name}`,
							placement: 'bottomRight',
							duration: 1
						},
						'success'
					);
					this.setState({ madeEdits: false });
				} else {
					openNotification(
						{
							message: `Failed to rename collection ${oldName} to ${name}`,
							placement: 'bottomRight',
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
						placement: 'bottomRight',
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
		const { updatePromiseManager: promiseManager } = this.state;
		const { appState } = this.props;
		const { config, allCollectionNames, allCollections, activeCollection } = appState;
		this.setState({ savingCollection: true });
		const { name } = activeCollection!;
		promiseManager
			.execute(api.deleteCollection(name))
			.then((deleteSuccess) => {
				if (deleteSuccess || name === 'default') {
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
								placement: 'bottomLeft',
								duration: null
							},
							'error'
						);
					});
					openNotification(
						{
							message: `Collection ${activeCollection!.name} deleted`,
							placement: 'bottomRight',
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
							placement: 'bottomRight',
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
						placement: 'bottomRight',
						duration: null
					},
					'error'
				);
			})
			.finally(() => {
				this.setState({ savingCollection: false });
			});
	}

	changeActiveCollection() {
		const { updatePromiseManager: promiseManager } = this.state;
		const { appState } = this.props;
		const { config } = appState;

		promiseManager
			.execute(api.updateConfig(config as AppConfig))
			.catch((error) => {
				api.logger.error(error);
				openNotification(
					{
						message: 'Failed to udpate config',
						placement: 'bottomLeft',
						duration: null
					},
					'error'
				);
			})
			.finally(() => {
				this.setState({});
			});
	}

	pollGameRunning() {
		const { updatePromiseManager: promiseManager, gameRunning, overrideGameRunning } = this.state;
		if (gameRunning || overrideGameRunning) {
			api.send(ValidChannel.GAME_RUNNING);
			if (!promiseManager.isCancelled.value) {
				pause(5000, this.pollGameRunning);
			}
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
							placement: 'bottomRight',
							duration: null
						},
						'error'
					);
				} else {
					openNotification(
						{
							message: `Saved collection ${oldName}`,
							placement: 'bottomRight',
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

	baseLaunchGame(mods: ModData[]) {
		const { updatePromiseManager: promiseManager } = this.state;
		const { appState } = this.props;
		const { config, updateState } = appState;
		api.logger.info('launching game');
		updateState({ launchingGame: true });
		this.setState({ overrideGameRunning: true }, () => {
			this.pollGameRunning();
		});
		// add a visual delay so the user gets to see the nice spinning wheel
		promiseManager
			.execute(
				pause(
					1000,
					api.launchGame,
					config.gameExec,
					config!.workshopID,
					config!.closeOnLaunch,
					mods,
					config!.pureVanilla,
					config!.logParams,
					config!.extraParams
				)
			)
			.then((success) => {
				setTimeout(() => {
					this.setState({ overrideGameRunning: false });
				}, 5000);
				return success;
			})
			.finally(() => {
				updateState({ launchingGame: false });
				this.setState({
					gameRunning: true,
					launchGameWithErrors: false,
					modalType: CollectionManagerModalType.NONE
				});
			});
	}

	launchGame() {
		api.logger.info('validating and launching game');
		const { appState } = this.props;
		const { activeCollection, mods, updateState } = appState;
		const { madeEdits, lastValidationStatus } = this.state;
		updateState({ launchingGame: true });
		if (lastValidationStatus && !madeEdits) {
			const collectionMods = [...activeCollection!.mods];
			const modDataList = collectionMods.map((modUID: string) => {
				return getByUID(mods, modUID) as ModData;
			});
			this.baseLaunchGame(modDataList);
		} else {
			this.setState({ validatingMods: true, collectionErrors: undefined }, () => {
				this.validateActiveCollection(true);
			});
		}
	}

	processValidationResult(errors: CollectionErrors, launchIfValid: boolean) {
		const { updatePromiseManager } = this.state;
		const { appState } = this.props;
		const { activeCollection, mods } = appState;

		setTimeout(() => this.setState({ validatingMods: false }), 100);
		if (activeCollection) {
			let success = !errors || Object.keys(errors).length === 0;
			success = this.setModErrors(errors, launchIfValid) || success; // always set mod errors, and count it as a success if it returns successfully
			const collectionMods = [...activeCollection.mods];
			if (success) {
				this.setState({ lastValidationStatus: true });
				api.logger.debug(`To launch game?: ${launchIfValid}`);
				if (success && launchIfValid) {
					const modDataList = collectionMods.map((modUID: string) => {
						return getByUID(mods, modUID) as ModData;
					});
					this.baseLaunchGame(modDataList);
				}

				// eslint-disable-next-line promise/no-nesting
				updatePromiseManager
					.execute(api.updateCollection(activeCollection))
					.then((updateSuccess) => {
						if (!updateSuccess) {
							setTimeout(() => {
								openNotification(
									{
										message: `Failed to save collection ${activeCollection.name}`,
										placement: 'bottomRight',
										duration: null
									},
									'error'
								);
							}, 500);
						}
						setTimeout(() => {
							const { modalType } = this.state;
							if (modalType !== CollectionManagerModalType.DESELECTING_MOD_MANAGER) {
								this.setState({ modalType: CollectionManagerModalType.NONE });
							}
						}, 500);
						return updateSuccess;
					})
					.catch((error) => {
						api.logger.error(error);
						setTimeout(() => {
							openNotification(
								{
									message: `Failed to save collection ${activeCollection.name}`,
									placement: 'bottomRight',
									duration: null
								},
								'error'
							);
							this.setState({});
						}, 500);
					});
			} else {
				this.setState({ lastValidationStatus: false });
				api.logger.error('Failed to validate active collection');
			}
		}
	}

	validateActiveCollection(launchIfValid: boolean) {
		const { appState } = this.props;
		const { activeCollection, mods } = appState;
		this.setState(
			{
				validatingMods: true
			},
			() => {
				// Guarantee validation runs after state update
				if (activeCollection) {
					const collectionMods = [...activeCollection!.mods];
					api.logger.debug(`Selected mods: ${collectionMods}`);

					const validationPromise: CancellablePromise<CollectionErrors> = cancellablePromise(validateCollection(mods, activeCollection));

					validationPromise.promise
						.then(async (result) => {
							this.processValidationResult(result, launchIfValid);
							return result.success;
						})
						.catch((error) => {
							if (!error.cancelled) {
								api.logger.error(error.error);
								// validation is finished
								this.setState({
									lastValidationStatus: false,
									validatingMods: false
								});
							}
						});
					this.setState({ validationPromise });
				} else {
					api.logger.info('NO ACTIVE COLLECTION');
					this.baseLaunchGame([]);
				}
			}
		);
	}

	openModal(modalType: CollectionManagerModalType) {
		this.setState({ modalType });
	}

	// We allow you to load multiple mods with the same ID (bundle name), but only the local mod will be used
	// If multiple workshop mods have the same ID, and you select multiple, then we will force you to choose one to use
	renderModal(currentView: CollectionViewType) {
		const { modalType, launchGameWithErrors, currentRecord } = this.state;
		const { appState } = this.props;
		const { activeCollection, mods } = appState;

		return (
			<CollectionManagerModal
				appState={appState}
				launchAnyway={() => {
					this.setState({ launchGameWithErrors: true });
					const modList: ModData[] = (activeCollection ? [...activeCollection!.mods].map((mod) => getByUID(mods, mod)) : []) as ModData[];
					this.baseLaunchGame(modList);
				}}
				modalType={modalType}
				launchGameWithErrors={!!launchGameWithErrors}
				currentView={currentView}
				openNotification={openNotification}
				closeModal={() => {
					this.setState({ modalType: CollectionManagerModalType.NONE });
				}}
				currentRecord={currentRecord}
				deleteCollection={this.deleteCollection}
				createNewCollection={this.createNewCollection}
			/>
		);
	}

	renderContent(currentView: CollectionViewType) {
		const { filteredRows, madeEdits, lastValidationStatus, guidedFixActive, bigDetails, currentRecord } = this.state;
		const { appState } = this.props;
		const { mods, config } = appState;
		const { viewConfigs } = config;

		const rows = getRows(mods);

		return bigDetails && currentRecord ? null : (
			<SizeMe monitorHeight monitorWidth refreshMode="debounce">
				{({ size }) => {
					let actualContent = null;
					if (appState.loadingMods) {
						actualContent = (
							<ModLoadingView
								appState={appState}
								modLoadCompleteCallback={() => {
									this.recalculateModData();
								}}
							/>
						);
					} else if (guidedFixActive) {
						actualContent = null;
					} else {
						const collectionComponentProps: CollectionViewProps = {
							madeEdits,
							lastValidationStatus,
							rows,
							viewType: currentView,
							filteredRows: filteredRows || rows,
							height: size.height as number,
							width: size.width as number,
							collection: appState.activeCollection as ModCollection,
							launchingGame: appState.launchingGame,
							setEnabledModsCallback: (enabledMods: Set<string>) => {
								const managerUID = this.getModManagerUID();
								enabledMods.add(managerUID);
								api.logger.debug(`Setting active mods: ${[...enabledMods]}`);
								if (appState.activeCollection) {
									appState.activeCollection.mods = [...enabledMods].sort();
									const { validationPromise } = this.state;
									if (validationPromise) {
										validationPromise.cancel();
									}
									this.setState({ madeEdits: true }, () => appState.updateState({}, () => this.validateActiveCollection(false)));
								}
							},
							setEnabledCallback: (id: string) => {
								this.handleClick(true, id);
							},
							setDisabledCallback: (id: string) => {
								this.handleClick(false, id);
							},
							getModDetails: (uid: string, record: ModData, showBigDetails?: boolean) => {
								if (!currentRecord || currentRecord.uid !== uid) {
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									const change: any = { currentRecord: record };
									if (showBigDetails !== undefined) {
										change.bigDetails = showBigDetails;
									}
									this.setState(change);
								} else {
									this.setState({ currentRecord: undefined });
								}
							}
						};
						if (viewConfigs) {
							collectionComponentProps.config = viewConfigs[currentView];
						}
						actualContent = <Outlet context={{ ...collectionComponentProps }} />;
					}

					return (
						<Content key="collection" style={{ padding: '0px', overflowY: 'clip', overflowX: 'clip' }}>
							{actualContent}
						</Content>
					);
				}}
			</SizeMe>
		);
	}

	renderFooter(currentView: CollectionViewType) {
		const { currentRecord, bigDetails, lastValidationStatus } = this.state;
		const { appState } = this.props;
		if (currentView === CollectionViewType.MAIN && currentRecord) {
			if (appState.loadingMods) {
				return (
					<ModLoadingView
						appState={appState}
						modLoadCompleteCallback={() => {
							this.recalculateModData();
						}}
					/>
				);
			}
			return (
				<ModDetailsFooter
					key="mod-details"
					lastValidationStatus={lastValidationStatus}
					appState={appState}
					bigDetails={!!bigDetails}
					currentRecord={currentRecord}
					closeFooterCallback={() => {
						this.setState({ currentRecord: undefined });
					}}
					enableModCallback={(uid: string) => {
						this.handleClick(true, uid);
					}}
					disableModCallback={(uid: string) => {
						this.handleClick(false, uid);
					}}
					expandFooterCallback={(expand: boolean) => {
						this.setState({ bigDetails: expand });
					}}
					setModSubsetCallback={(changes: { [uid: string]: boolean }) => {
						const { activeCollection } = appState;
						if (activeCollection) {
							let changed = false;
							let deselectingModManager = false;
							Object.entries(changes).forEach(([uid, checked]: [string, boolean]) => {
								if (checked) {
									if (!activeCollection.mods.includes(uid)) {
										changed = true;
										activeCollection.mods.push(uid);
									}
								} else if (uid !== this.getModManagerUID()) {
									activeCollection.mods = activeCollection.mods.filter((mod) => mod !== uid);
									changed = true;
								} else {
									// display modal
									deselectingModManager = true;
								}
							});
							if (deselectingModManager) {
								this.setState({ modalType: CollectionManagerModalType.DESELECTING_MOD_MANAGER });
							}
							if (changed) {
								const { validationPromise } = this.state;
								if (validationPromise) {
									validationPromise.cancel();
								}
								this.setState({ madeEdits: true }, () => appState.updateState({}, () => this.validateActiveCollection(false)));
							}
						}
					}}
					openNotification={openNotification}
					validateCollection={() => {
						this.validateActiveCollection(false);
					}}
					openModal={this.openModal}
				/>
			);
		}
		const { gameRunning, overrideGameRunning, modalType } = this.state;
		const { launchingGame } = appState;

		const launchGameButton = (
			<Button
				type="primary"
				loading={launchingGame}
				disabled={overrideGameRunning || gameRunning || modalType !== CollectionManagerModalType.NONE || launchingGame}
				onClick={this.launchGame}
			>
				Launch Game
			</Button>
		);
		if (launchingGame) {
			return (
				<Footer className="MainFooter" style={{ justifyContent: 'center', display: 'flex', padding: 10 }}>
					<Popover content="Already launching game">{launchGameButton}</Popover>
				</Footer>
			);
		}
		if (gameRunning || !!overrideGameRunning) {
			return (
				<Footer className="MainFooter" style={{ justifyContent: 'center', display: 'flex', padding: 10 }}>
					<Popover content="Game already running">{launchGameButton}</Popover>
				</Footer>
			);
		}
		return (
			<Footer className="MainFooter" style={{ justifyContent: 'center', display: 'flex', padding: 10 }}>
				{launchGameButton}
			</Footer>
		);
	}

	render() {
		const { madeEdits, filteredRows, savingCollection, validatingMods, lastValidationStatus } = this.state;
		const { appState } = this.props;
		const { allCollections, searchString, config } = appState;
		const { currentPath } = config;
		let currentView: CollectionViewType = CollectionViewType.MAIN;
		if (currentPath) {
			const pathSplit = currentPath.split('collections/');
			currentView = pathSplit[pathSplit.length - 1] as CollectionViewType;
		}

		return (
			<Layout>
				<Header style={{ height: 120 }}>
					<CollectionManagerToolbar
						appState={appState}
						searchString={searchString || ''}
						validatingCollection={validatingMods}
						savingCollection={savingCollection}
						onSearchChangeCallback={(search) => {
							appState.searchString = search;
							this.setState({});
						}}
						validateCollectionCallback={() => {
							this.setState({ collectionErrors: undefined, validatingMods: true }, () => {
								this.validateActiveCollection(false);
							});
						}}
						madeEdits={madeEdits}
						lastValidationStatus={lastValidationStatus}
						onSearchCallback={(search) => {
							if (search && search.length > 0) {
								const newFilteredRows = filterRows(appState.mods, search);
								this.setState({ filteredRows: newFilteredRows });
							} else {
								this.setState({ filteredRows: undefined });
							}
							appState.searchString = search;
							this.setState({});
						}}
						changeActiveCollectionCallback={(name: string) => {
							appState.activeCollection = allCollections.get(name)!;
							config.activeCollection = name;
							this.changeActiveCollection();
						}}
						numResults={filteredRows ? filteredRows.length : appState.mods.modIdToModDataMap.size}
						newCollectionCallback={this.createNewCollection}
						duplicateCollectionCallback={this.duplicateCollection}
						renameCollectionCallback={this.renameCollection}
						saveCollectionCallback={() => {
							this.saveCollection(appState.activeCollection as ModCollection, true);
						}}
						openViewSettingsCallback={() => {
							if (!config.viewConfigs) {
								config.viewConfigs = {};
							}
							this.setState({ modalType: CollectionManagerModalType.VIEW_SETTINGS });
						}}
						openNotification={openNotification}
						openModal={this.openModal}
					/>
				</Header>
				{this.renderModal(currentView)}
				{this.renderContent(currentView)}
				{this.renderFooter(currentView)}
			</Layout>
		);
	}
}

export default () => {
	return <CollectionView appState={useOutletContext<AppState>()} location={useLocation()} />;
};
