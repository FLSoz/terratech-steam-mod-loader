/* eslint-disable no-nested-ternary */
import React, { Component, CSSProperties, ReactNode } from 'react';
import { useOutletContext, Outlet, useLocation, Location } from 'react-router-dom';
import { Layout, Button, Popover, Modal, notification, Checkbox, Typography } from 'antd';

import { SizeMe } from 'react-sizeme';
import {
	convertToModData,
	filterRows,
	Mod,
	ModData,
	ModError,
	ModErrors,
	ModErrorType,
	AppState,
	ModCollection,
	ModCollectionProps,
	AppConfig,
	ValidChannel
} from 'model';
import api from 'renderer/Api';
import { getIncompatibilityGroups, validateActiveCollection } from 'renderer/util/Validation';
import { cancellablePromise, CancellablePromise, CancellablePromiseManager } from 'renderer/util/Promise';
import { pause } from 'renderer/util/Sleep';
import CollectionManagerToolbar from './CollectionManagementToolbar';
import ModLoadingView from './ModLoadingComponent';

const { Header, Footer, Content } = Layout;
const { Text, Title } = Typography;

enum ModalType {
	NONE = 0,
	VALIDATING = 'validating',
	ERRORS_FOUND = 'errors_found',
	WARNINGS_FOUND = 'warnings_found',
	REMOVE_INVALID = 'remove_invalid_mods',
	SUBSCRIBE_DEPENDENCIES = 'subscribe_dependencies',
	SUBSCRIBE_REMOTE = 'subscribe_remote',
	INCOMPATIBLE_MOD = 'incompatible'
}

interface CollectionManagerState {
	updatePromiseManager: CancellablePromiseManager;
	validationPromise?: CancellablePromise<{ errors: ModErrors; success: boolean }>;
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

	modIdToModDataMap: Map<string, ModData>;

	// modal
	modalType: ModalType;
	invalidIdsFound?: boolean;
	missingDependenciesFound?: boolean;
	incompatibleModsFound?: boolean;
	missingSubscriptions?: boolean;

	lastValidationStatus?: boolean;
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

class CollectionManagerComponent extends Component<{ appState: AppState; location: Location }, CollectionManagerState> {
	constructor(props: { appState: AppState; location: Location }) {
		super(props);
		this.state = {
			updatePromiseManager: new CancellablePromiseManager(),
			rows: [],
			modIdToModDataMap: new Map<string, ModData>(),
			filteredRows: undefined,
			gameRunning: false,
			validatingMods: false, // we don't validate on load
			modErrors: undefined,
			modalType: ModalType.NONE, // we don't validate on load
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
		this.validateActiveCollection = this.validateActiveCollection.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.GAME_RUNNING, this.setGameRunningCallback);
		this.pollGameRunning();

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
		const { validationPromise } = this.state;
		if (validationPromise) {
			validationPromise.cancel();
		}
		this.setState({ madeEdits: true }, () => appState.updateState({}, () => this.validateActiveCollection(false)));
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
			const { validationPromise } = this.state;
			if (validationPromise) {
				validationPromise.cancel();
			}
			this.setState({ madeEdits: true }, () => appState.updateState({}, () => this.validateActiveCollection(false)));
		}
	}

	setGameRunningCallback(running: boolean) {
		const { overrideGameRunning } = this.state;
		if (overrideGameRunning && running) {
			this.setState({ overrideGameRunning: false });
		}
		this.setState({ gameRunning: running });
	}

	setModErrors(modErrors: ModErrors, launchIfValid: boolean) {
		const { rows } = this.state;
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
				} else {
					mod.errors = undefined;
				}
			});
			this.setState({
				modErrors,
				incompatibleModsFound,
				invalidIdsFound,
				missingSubscriptions,
				missingDependenciesFound
			});
			if (launchIfValid) {
				this.setState({
					modalType:
						invalidIdsFound || incompatibleModsFound || missingDependenciesFound ? ModalType.ERRORS_FOUND : ModalType.WARNINGS_FOUND
				});
			}
		} else {
			rows.forEach((mod: ModData) => {
				mod.errors = undefined;
			});
			this.setState({ modErrors: undefined });
		}
	}

	recalculateModData() {
		const { appState } = this.props;
		const { modIdToModDataMap } = this.state;
		const rows: ModData[] = appState.mods ? convertToModData(appState.mods) : [];
		rows.forEach((mod: ModData) => modIdToModDataMap.set(mod.uid, mod));
		this.setState(
			{
				rows
			},
			() => {
				this.validateActiveCollection(false);
			}
		);
	}

	createNewCollection(name: string) {
		const { madeEdits, updatePromiseManager: promiseManager } = this.state;
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
		const { updatePromiseManager: promiseManager } = this.state;
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
		const { updatePromiseManager: promiseManager } = this.state;
		const { appState } = this.props;
		const { config, updateState } = appState;
		api.logger.info('launching game');
		updateState({ launchingGame: true });
		this.setState({ overrideGameRunning: true });
		// add a visual delay so the user gets to see the nice spinning wheel
		promiseManager
			.execute(pause(1000, api.launchGame, config.gameExec, config!.workshopID, config!.closeOnLaunch, mods))
			.then((success) => {
				setTimeout(() => {
					this.setState({ overrideGameRunning: false });
				}, 7000);
				return success;
			})
			.finally(() => {
				updateState({ launchingGame: false });
				this.setState({
					gameRunning: true,
					launchGameWithErrors: false,
					modalType: ModalType.NONE
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
				return mods.get(modUID) as Mod;
			});
			this.baseLaunchGame(modDataList);
		} else {
			this.setState({ validatingMods: true, modErrors: undefined }, () => {
				this.validateActiveCollection(true);
			});
		}
	}

	processValidationResult(result: { errors: ModErrors; success: boolean }, launchIfValid: boolean) {
		const { updatePromiseManager } = this.state;
		const { appState } = this.props;
		const { activeCollection, mods } = appState;
		const { success, errors } = result;
		setTimeout(() => this.setState({ validatingMods: false }), 100);
		if (activeCollection) {
			this.setModErrors(errors, launchIfValid);
			const collectionMods = [...activeCollection.mods];
			if (success) {
				this.setState({ lastValidationStatus: true });
				api.logger.debug(`To launch game?: ${launchIfValid}`);
				if (success && launchIfValid) {
					const modDataList = collectionMods.map((modUID: string) => {
						return mods.get(modUID) as Mod;
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
										duration: null
									},
									'error'
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
		const { modIdToModDataMap } = this.state;
		const { appState } = this.props;
		const { activeCollection, mods, workshopToModID } = appState;
		this.setState(
			{
				validatingMods: true,
				invalidIdsFound: false,
				incompatibleModsFound: false,
				missingDependenciesFound: false,
				missingSubscriptions: false
			},
			() => {
				// Guarantee validation runs after state update
				if (activeCollection) {
					const collectionMods = [...activeCollection!.mods];
					api.logger.debug(`Selected mods: ${collectionMods}`);

					const validationPromise: CancellablePromise<{ errors: ModErrors; success: boolean }> = cancellablePromise(
						validateActiveCollection({
							modList: collectionMods.map((uid: string) => modIdToModDataMap.get(uid) as ModData),
							allMods: mods,
							workshopToModID
						})
					);

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

	checkNextErrorModal() {
		const { invalidIdsFound, missingDependenciesFound, missingSubscriptions, incompatibleModsFound } = this.state;
		if (invalidIdsFound) {
			this.setState({ modalType: ModalType.REMOVE_INVALID });
		} else if (incompatibleModsFound) {
			this.setState({ modalType: ModalType.INCOMPATIBLE_MOD });
		} else if (missingDependenciesFound) {
			this.setState({ modalType: ModalType.SUBSCRIBE_DEPENDENCIES });
		} else if (missingSubscriptions) {
			this.setState({ modalType: ModalType.SUBSCRIBE_REMOTE });
		} else {
			this.setState({ modalType: ModalType.NONE });
		}
	}

	// We allow you to load multiple mods with the same ID (bundle name), but only the local mod will be used
	// If multiple workshop mods have the same ID, and you select multiple, then we will force you to choose one to use
	renderModal() {
		const { modalType, launchGameWithErrors, modErrors, modIdToModDataMap } = this.state;
		const { appState } = this.props;
		const { activeCollection, mods, workshopToModID, updateState } = appState;

		const launchAnyway = () => {
			this.setState({ launchGameWithErrors: true });
			const modList: Mod[] = (activeCollection ? [...activeCollection!.mods].map((mod) => mods!.get(mod)) : []) as Mod[];
			this.baseLaunchGame(modList);
		};

		switch (modalType) {
			case ModalType.NONE:
				return null;
			case ModalType.VALIDATING: {
				return null;
				/* let progressPercent = 0;
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
					<Modal title={`Validating Mod Collection ${activeCollection ? activeCollection!.name : 'default'}`} visible closable={false} footer={null}>
						<div>
							<Space
								direction="vertical"
								size="large"
								style={{
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'center',
									flexDirection: 'column'
								}}
							>
								<Progress type="circle" percent={progressPercent} status={status} />
								{currentMod ? (
									<p>Validating mod {currentMod.config?.name ? currentMod.config!.name : currentMod.ID}</p>
								) : progressPercent >= 100 ? (
									<p>Validation complete!</p>
								) : null}
							</Space>
						</div>
					</Modal>
				); */
			}
			case ModalType.REMOVE_INVALID: {
				const badMods: string[] = [];
				Object.entries(modErrors!).forEach(([mod, errors]: [string, ModError[]]) => {
					const isThisError = errors.filter((error: ModError) => error.errorType === ModErrorType.INVALID_ID).length > 0;
					if (isThisError) {
						badMods.push(mod);
					}
				});
				return (
					<Modal
						title="Invalid Mods Found"
						visible
						closable={false}
						footer={[
							<Button
								key="auto-fix"
								danger
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									const currentMods: Set<string> = new Set(activeCollection!.mods);
									badMods.forEach((mod: string) => {
										delete modErrors![mod];
										currentMods.delete(mod);
									});
									activeCollection!.mods = [...currentMods].sort();
									this.setState({ invalidIdsFound: false, madeEdits: true }, this.checkNextErrorModal);
									updateState({ launchingGame: false });
								}}
							>
								Remove
							</Button>,
							<Button
								key="cancel"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									this.setState({ invalidIdsFound: false }, this.checkNextErrorModal);
									updateState({ launchingGame: false });
								}}
							>
								Keep
							</Button>
						]}
					>
						<p>
							One or more mods are marked as invalid. This means that we are unable to locate the mods either locally, or on the workshop.
						</p>
						<p>Do you want to remove them from the collection?</p>
						<table key="invalid_mods">
							<thead>
								<tr>
									<td>Invalid Mods:</td>
								</tr>
							</thead>
							<tbody>
								{badMods.map((modUID: string) => {
									return (
										<tr key={modUID}>
											<td>{modUID}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
						<p>
							NOTE: Invalid local mods will do nothing, but invalid workshop mods will still be loaded by 0ModManager, even though you
							haven&apos;t subscribed to them.
						</p>
					</Modal>
				);
			}
			case ModalType.SUBSCRIBE_DEPENDENCIES: {
				const badMods: Set<string> = new Set();
				const missingDependencies: Set<string> = new Set();
				Object.entries(modErrors!).forEach(([mod, errors]: [string, ModError[]]) => {
					const thisError = errors.filter((error: ModError) => error.errorType === ModErrorType.MISSING_DEPENDENCY);
					if (thisError.length > 0) {
						thisError[0].values!.forEach((missingDependency: string) => {
							missingDependencies.add(missingDependency);
							badMods.add(mod);
						});
					}
				});
				return (
					<Modal
						title="Missing Dependencies Detected"
						visible
						closable={false}
						footer={[
							<Button
								key="auto-fix"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									const missingDependencyUIDs = [...missingDependencies].map((badDependency: string) => {
										let foundDependency = false;
										let dependencyWorkshopID = badDependency;
										workshopToModID.forEach((modID: string, workshopID: bigint) => {
											let parsedDependency = null;
											try {
												parsedDependency = BigInt(badDependency);
											} catch (e) {
												// we failed to parse - means we know the mod ID
											}
											if (!foundDependency && (badDependency === modID || parsedDependency === workshopID)) {
												foundDependency = true;
												dependencyWorkshopID = workshopID.toString();
											}
										});
										return `workshop:${dependencyWorkshopID}`;
									});

									const currentMods: Set<string> = new Set(activeCollection!.mods);
									missingDependencyUIDs.forEach((modUID: string) => {
										currentMods.add(modUID);
									});
									badMods.forEach((modUID: string) => {
										let errors: ModError[] = modErrors![modUID];
										errors = errors.filter((error: ModError) => error.errorType !== ModErrorType.MISSING_DEPENDENCY);
										const modData = modIdToModDataMap.get(modUID);
										if (errors.length > 0) {
											modErrors![modUID] = errors;
											modData!.errors = errors;
										} else {
											delete modErrors![modUID];
											modData!.errors = undefined;
										}
									});
									activeCollection!.mods = [...currentMods].sort();
									this.setState({ missingDependenciesFound: false, madeEdits: true }, this.checkNextErrorModal);
									updateState({ launchingGame: false });
								}}
							>
								Add dependencies
							</Button>,
							<Button
								key="ignore"
								type="primary"
								danger
								disabled={launchGameWithErrors}
								onClick={() => {
									this.setState({ missingDependenciesFound: false }, this.checkNextErrorModal);
									updateState({ launchingGame: false });
								}}
							>
								Ignore dependencies
							</Button>
						]}
					>
						<p>
							One or more mods are missing their dependencies. There is a high chance the game will break if they are not subscribed to.
						</p>
						<p>Do you want to continue anyway?</p>
						<table key="missing_items">
							<thead>
								<tr>
									<td>Missing Dependencies:</td>
								</tr>
							</thead>
							<tbody>
								{[...missingDependencies].map((modUID: string) => {
									return (
										<tr key={modUID}>
											<td>{modUID}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</Modal>
				);
			}
			case ModalType.SUBSCRIBE_REMOTE: {
				const badMods: string[] = [];
				Object.entries(modErrors!).forEach(([mod, errors]: [string, ModError[]]) => {
					const isThisError = errors.filter((error: ModError) => error.errorType === ModErrorType.NOT_SUBSCRIBED).length > 0;
					if (isThisError) {
						badMods.push(mod);
					}
				});
				return (
					<Modal
						title="Unsubscribed Mods Detected"
						visible
						closable={false}
						footer={[
							<Button
								key="auto-fix"
								danger
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									const currentMods: Set<string> = new Set(activeCollection!.mods);
									badMods.forEach((modUID: string) => {
										let errors: ModError[] = modErrors![modUID];
										errors = errors.filter((error: ModError) => error.errorType !== ModErrorType.NOT_SUBSCRIBED);
										const modData = modIdToModDataMap.get(modUID);
										if (errors.length > 0) {
											modErrors![modUID] = errors;
											modData!.errors = errors;
										} else {
											delete modErrors![modUID];
											modData!.errors = undefined;
										}
										currentMods.delete(modUID);
									});
									activeCollection!.mods = [...currentMods].sort();
									this.setState({ missingSubscriptions: false, madeEdits: true }, this.checkNextErrorModal);
									updateState({ launchingGame: false });
								}}
							>
								Remove
							</Button>,
							<Button
								key="cancel"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									this.setState({ missingSubscriptions: false }, this.checkNextErrorModal);
									updateState({ launchingGame: false });
								}}
							>
								Keep
							</Button>
						]}
					>
						<p>
							One or more mods are selected that you are not subscribed to. Steam may not update them properly unless you subscribe to them.
						</p>
						<p>Do you want to keep them in your collection?</p>
						<table key="unsubscribed_items">
							<thead>
								<tr>
									<td>Unsubscribed Mods:</td>
								</tr>
							</thead>
							<tbody>
								{badMods.map((modUID: string) => {
									let modString = modUID;
									const modData = modIdToModDataMap.get(modUID);
									if (modData) {
										modString = `(${modData.id}) ${modData.name}`;
									}
									return (
										<tr key={modUID}>
											<td>{modString}</td>
										</tr>
									);
								})}
							</tbody>
						</table>

						<p>NOTE: If they are kept in your collection, they will still appear in-game, even though you have not subscribed to them.</p>
					</Modal>
				);
			}
			case ModalType.INCOMPATIBLE_MOD: {
				const badMods: string[] = [];
				const incompatibilities: { [modUID: string]: string[] } = {};
				Object.entries(modErrors!).forEach(([mod, errors]: [string, ModError[]]) => {
					const thisError = errors.filter((error: ModError) => error.errorType === ModErrorType.INCOMPATIBLE_MODS);
					if (thisError.length > 0) {
						badMods.push(mod);
						incompatibilities[mod] = thisError[0].values!;
					}
				});
				const incompatibilityGroups: string[][] = getIncompatibilityGroups(incompatibilities);
				let allValid = true;
				const groupProps: { values: string[]; valid: boolean; currentSelected: string[] }[] = [];
				incompatibilityGroups.forEach((group: string[]) => {
					const currentSelected = group.filter((modUID: string) => activeCollection!.mods.includes(modUID));
					const groupValid = currentSelected.length <= 1;
					if (!groupValid) {
						allValid = false;
					}
					groupProps.push({ values: group, currentSelected, valid: groupValid });
				});
				return (
					<Modal
						title="Incompatible Mods Detected"
						visible
						closable={false}
						footer={[
							<Button
								key="cancel"
								danger={!allValid}
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									this.setState({ incompatibleModsFound: false }, this.checkNextErrorModal);
									updateState({ launchingGame: false });
								}}
							>
								Accept Changes
							</Button>
						]}
					>
						<p>You have selected several mods which are incompatible with each other.</p>
						<p>Modify your selected mods here and decide which ones to keep.</p>
						{groupProps.map((group: { values: string[]; valid: boolean; currentSelected: string[] }) => {
							const { values, currentSelected, valid } = group;
							return (
								<Checkbox.Group
									options={values.map((modUID: string) => {
										const modData = modIdToModDataMap.get(modUID);
										return {
											value: modUID,
											label: `${modData!.name} (${modUID})`
										};
									})}
									value={currentSelected}
									onChange={(checkedValue: any) => {
										console.log(checkedValue);
									}}
								/>
							);
						})}
					</Modal>
				);
			}
			case ModalType.ERRORS_FOUND:
				return (
					<Modal
						title="Errors Found in Configuration"
						visible
						closable={false}
						footer={[
							<Button
								key="cancel"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									this.setState({
										modalType: ModalType.NONE,
										invalidIdsFound: false,
										incompatibleModsFound: false,
										missingDependenciesFound: false,
										missingSubscriptions: false
									});
									updateState({ launchingGame: false });
								}}
							>
								Manually Fix
							</Button>,
							/* <Button
								key="auto-fix"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									this.checkNextErrorModal();
									updateState({ launchingGame: false });
								}}
							>
								Guided Fix
							</Button>, */
							<Button
								key="launch"
								danger
								type="primary"
								disabled={launchGameWithErrors}
								loading={launchGameWithErrors}
								onClick={launchAnyway}
							>
								Launch Anyway
							</Button>
						]}
					>
						<p>One or more mods have either missing dependencies, or is selected alongside incompatible mods.</p>
						<p>Launching the game with this mod list may lead to crashes, or even save game corruption.</p>
						<p>
							Mods that share the same Mod ID (Not the same as Workshop ID) are explicitly incompatible, and only the first one TerraTech
							loads will be used. All others will be ignored.
						</p>

						<p>Do you want to continue anyway?</p>
					</Modal>
				);
			case ModalType.WARNINGS_FOUND:
				return (
					<Modal
						title="Minor Errors Found in Configuration"
						visible
						closable={false}
						footer={[
							<Button
								key="cancel"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									this.setState({
										modalType: ModalType.NONE,
										invalidIdsFound: false,
										incompatibleModsFound: false,
										missingDependenciesFound: false,
										missingSubscriptions: false
									});
									updateState({ launchingGame: false });
								}}
							>
								Manually Fix
							</Button>,
							/* <Button
								key="auto-fix"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									this.checkNextErrorModal();
									updateState({ launchingGame: false });
								}}
							>
								Guided Fix
							</Button>, */
							<Button
								key="launch"
								danger
								type="primary"
								disabled={launchGameWithErrors}
								loading={launchGameWithErrors}
								onClick={launchAnyway}
							>
								Launch Anyway
							</Button>
						]}
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
		const { rows, filteredRows, madeEdits, lastValidationStatus } = this.state;
		const { appState } = this.props;

		return (
			<SizeMe monitorHeight monitorWidth refreshMode="debounce">
				{({ size }) => {
					const collectionComponentProps: ModCollectionProps = {
						madeEdits,
						lastValidationStatus,
						rows,
						filteredRows: filteredRows || rows,
						height: size.height as number,
						width: size.width as number,
						collection: appState.activeCollection as ModCollection,
						launchingGame: appState.launchingGame,
						setEnabledModsCallback: (enabledMods: Set<string>) => {
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
						getModContextMenu: (id: string, data: ModData) => {},
						getModDetails: (id: string, data: ModData) => {}
					};

					return (
						<Content key="collection" style={{ padding: '0px', overflowY: 'clip', overflowX: 'clip' }}>
							{appState.loadingMods ? (
								<ModLoadingView
									appState={appState}
									modLoadCompleteCallback={() => {
										this.recalculateModData();
									}}
								/>
							) : (
								<Outlet context={{ ...collectionComponentProps }} />
							)}
						</Content>
					);
				}}
			</SizeMe>
		);
	}

	render() {
		const { madeEdits, filteredRows, gameRunning, overrideGameRunning, modalType, savingCollection, validatingMods, lastValidationStatus } =
			this.state;
		const { appState } = this.props;
		const { allCollections, searchString, launchingGame } = appState;

		const launchGameButton = (
			<Button
				type="primary"
				loading={launchingGame}
				disabled={overrideGameRunning || gameRunning || modalType !== ModalType.NONE || launchingGame}
				onClick={this.launchGame}
			>
				Launch Game
			</Button>
		);

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
							this.setState({ modErrors: undefined, validatingMods: true }, () => {
								this.validateActiveCollection(false);
							});
						}}
						madeEdits={madeEdits}
						lastValidationStatus={lastValidationStatus}
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

export default () => {
	return <CollectionManagerComponent appState={useOutletContext<AppState>()} location={useLocation()} />;
};
