/* eslint-disable no-nested-ternary */
import React, { Component, CSSProperties, ReactNode } from 'react';
import { useOutletContext, Outlet, useLocation, Location } from 'react-router-dom';
import { Layout, Button, Popover, Modal, notification, Checkbox, Typography, Col, Row, Tabs, Image } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { SizeMe } from 'react-sizeme';
import {
	ModData,
	CollectionErrors,
	ModErrors,
	AppState,
	ModCollection,
	CollectionViewProps,
	AppConfig,
	ValidChannel,
	ModDescriptor,
	getRows,
	filterRows,
	getByUID,
	validateCollection,
	ModType,
	DisplayModData,
	CollectionViewType
} from 'model';
import api from 'renderer/Api';
import { getIncompatibilityGroups } from 'util/Graph';
import { cancellablePromise, CancellablePromise, CancellablePromiseManager } from 'util/Promise';
import { pause } from 'util/Sleep';
import CollectionManagerToolbar from './CollectionManagementToolbar';
import ModLoadingView from './ModLoadingComponent';

import missing from '../../../../assets/missing.png';

const { Header, Footer, Content } = Layout;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

function getImagePreview(path?: string) {
	return <Image src={path} fallback={missing} />;
}

enum ModalType {
	NONE = 0,
	DESELCTING_MOD_MANAGER = 1,
	VALIDATING = 'validating',
	ERRORS_FOUND = 'errors_found',
	WARNINGS_FOUND = 'warnings_found'
}

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
	modalType: ModalType;

	lastValidationStatus?: boolean;
	guidedFixActive?: boolean;

	currentRecord?: ModData;
	bigDetails?: boolean;
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
			filteredRows: undefined,
			gameRunning: false,
			validatingMods: false, // we don't validate on load
			collectionErrors: undefined,
			modalType: ModalType.NONE, // we don't validate on load
			madeEdits: false
		};

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
				this.setState({ modalType: ModalType.DESELCTING_MOD_MANAGER });
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

	setModErrors(collectionErrors: CollectionErrors, launchIfValid: boolean) {
		const { appState } = this.props;
		const { mods } = appState;
		const rows = getRows(mods);

		if (!!collectionErrors && Object.keys(collectionErrors).length > 0) {
			let incompatibleModsFound = false;
			let invalidIdsFound = false;
			let missingSubscriptions = false;
			let missingDependenciesFound = false;

			rows.forEach((mod: DisplayModData) => {
				const thisModErrors = collectionErrors[mod.uid];
				if (thisModErrors) {
					mod.errors = thisModErrors;
					incompatibleModsFound ||= !!thisModErrors.incompatibleMods && thisModErrors.incompatibleMods.length > 0;
					invalidIdsFound ||= !!thisModErrors.invalidId;
					missingSubscriptions ||= !!thisModErrors.notSubscribed;
					missingDependenciesFound ||= !!thisModErrors.missingDependencies && thisModErrors.missingDependencies.length > 0;
				} else {
					mod.errors = undefined;
				}
			});
			this.setState({
				collectionErrors
			});
			if (launchIfValid) {
				this.setState({
					modalType:
						invalidIdsFound || incompatibleModsFound || missingDependenciesFound ? ModalType.ERRORS_FOUND : ModalType.WARNINGS_FOUND
				});
			}
		} else {
			rows.forEach((mod: DisplayModData) => {
				mod.errors = undefined;
			});
			this.setState({ collectionErrors: undefined });
		}
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

	baseLaunchGame(mods: ModData[]) {
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

		const success = !errors || Object.keys(errors).length === 0;

		setTimeout(() => this.setState({ validatingMods: false }), 100);
		if (activeCollection) {
			this.setModErrors(errors, launchIfValid);
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
										duration: null
									},
									'error'
								);
							}, 500);
						}
						setTimeout(() => {
							const { modalType } = this.state;
							if (modalType !== ModalType.DESELCTING_MOD_MANAGER) {
								this.setState({ modalType: ModalType.NONE });
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

	// We allow you to load multiple mods with the same ID (bundle name), but only the local mod will be used
	// If multiple workshop mods have the same ID, and you select multiple, then we will force you to choose one to use
	renderModal() {
		const { modalType, launchGameWithErrors } = this.state;
		const { appState } = this.props;
		const { activeCollection, mods, updateState, config } = appState;

		const launchAnyway = () => {
			this.setState({ launchGameWithErrors: true });
			const modList: ModData[] = (activeCollection ? [...activeCollection!.mods].map((mod) => getByUID(mods, mod)) : []) as ModData[];
			this.baseLaunchGame(modList);
		};

		switch (modalType) {
			case ModalType.DESELCTING_MOD_MANAGER: {
				const managerUID = this.getModManagerUID();
				const managerData: ModData = getByUID(mods, managerUID)!;
				return (
					<Modal
						title="Useless Operation"
						visible
						closable={false}
						footer={[
							<Button
								key="launch"
								type="primary"
								onClick={() => {
									this.setState({ modalType: ModalType.NONE });
								}}
							>
								OK
							</Button>
						]}
					>
						<p>You are attempting to deselect the mod manager.</p>
						<p>An external mod manager is current required for TerraTech to load some mods properly.</p>
						<p>Your current selected manager is {`${managerData.name} (${config.workshopID})`}</p>
						<p>If you would like to change your manager, do so by entering the workshop file ID in the settings tab.</p>
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
										modalType: ModalType.NONE
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
									updateState({ launchingGame: false });
									this.setState({ guidedFixActive: true });
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
										modalType: ModalType.NONE
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
									updateState({ launchingGame: false });
									this.setState({ guidedFixActive: true });
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
		const { filteredRows, madeEdits, lastValidationStatus, guidedFixActive, bigDetails } = this.state;
		const { appState } = this.props;
		const { mods, config } = appState;
		const { currentPath, viewConfigs } = config;
		let currentView: CollectionViewType = CollectionViewType.MAIN;
		if (currentPath) {
			const pathSplit = currentPath.split('collections/');
			currentView = pathSplit[pathSplit.length - 1] as CollectionViewType;
		}

		const rows = getRows(mods);

		return bigDetails ? null : (
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
								const { currentRecord } = this.state;
								if (!currentRecord || currentRecord.uid !== uid) {
									this.setState({ currentRecord: record, bigDetails: showBigDetails });
								} else {
									this.setState({ currentRecord: undefined, bigDetails: false });
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

	renderInfoTab(record: ModData) {
		return record.description;
	}

	renderInspectTab(record: ModData) {
		return JSON.stringify(record, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
	}

	renderDependenciesTab(record: ModData) {
		return JSON.stringify(record.dependsOn, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
	}

	renderFooter() {
		const { currentRecord, bigDetails } = this.state;
		if (currentRecord) {
			const normalStyle = { height: 400, width: '100%' };
			const bigStyle = { height: '100%', width: '100%' };
			return (
				<Row key="mod-details" justify="space-between" gutter={16} style={bigDetails ? bigStyle : normalStyle}>
					<Col span={2}>{getImagePreview(currentRecord.preview)}</Col>
					<Col span={22}>
						<Tabs
							defaultActiveKey="info"
							tabBarExtraContent={
								<Button
									icon={<CloseOutlined />}
									type="text"
									onClick={() => {
										this.setState({ bigDetails: false, currentRecord: undefined });
									}}
								/>
							}
						>
							<TabPane tab="Info" key="info">
								{this.renderInfoTab(currentRecord)}
							</TabPane>
							<TabPane tab="Inspect" key="inspect">
								{this.renderInspectTab(currentRecord)}
							</TabPane>
							<TabPane tab="Dependencies" key="dependencies">
								{this.renderDependenciesTab(currentRecord)}
							</TabPane>
						</Tabs>
					</Col>
				</Row>
			);
		}
		const { gameRunning, overrideGameRunning, modalType } = this.state;
		const { appState } = this.props;
		const { launchingGame } = appState;

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
		if (launchingGame) {
			return <Popover content="Already launching game">{launchGameButton}</Popover>;
		}
		if (gameRunning || !!overrideGameRunning) {
			return <Popover content="Game already running">{launchGameButton}</Popover>;
		}
		return launchGameButton;
	}

	render() {
		const { madeEdits, filteredRows, savingCollection, validatingMods, lastValidationStatus } = this.state;
		const { appState } = this.props;
		const { allCollections, searchString } = appState;

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
							this.setState({});
						}}
						numResults={filteredRows ? filteredRows.length : appState.mods.modIdToModDataMap.size}
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
				<Footer className="MainFooter" style={{ justifyContent: 'center', display: 'flex', padding: 10 }}>
					{this.renderFooter()}
				</Footer>
			</Layout>
		);
	}
}

export default () => {
	return <CollectionManagerComponent appState={useOutletContext<AppState>()} location={useLocation()} />;
};
