"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-nested-ternary */
const react_1 = __importStar(require("react"));
const antd_1 = require("antd");
const react_sizeme_1 = require("react-sizeme");
const Mod_1 = require("renderer/model/Mod");
const Api_1 = require("renderer/model/Api");
const Validation_1 = require("renderer/util/Validation");
const Promise_1 = require("renderer/util/Promise");
const Sleep_1 = require("renderer/util/Sleep");
const MainCollectionComponent_1 = __importDefault(require("./MainCollectionComponent"));
const CollectionManagementToolbar_1 = __importDefault(require("./CollectionManagementToolbar"));
const { Header, Footer, Content } = antd_1.Layout;
const openNotification = (props, type) => {
    antd_1.notification[type || 'open']({ ...props });
};
class CollectionManagerComponent extends react_1.Component {
    constructor(props) {
        super(props);
        const { appState } = props;
        const rows = appState.mods ? (0, Mod_1.convertToModData)(appState.mods) : [];
        this.state = {
            promiseManager: new Promise_1.CancellablePromiseManager(),
            rows,
            filteredRows: undefined,
            gameRunning: false,
            validatingMods: true,
            modErrors: undefined,
            modalActive: true,
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
        Api_1.api.on(Api_1.ValidChannel.GAME_RUNNING, this.setGameRunningCallback);
        this.pollGameRunning();
        this.validateActiveCollection(false);
    }
    componentWillUnmount() {
        const { promiseManager } = this.state;
        promiseManager.cancelAllPromises();
        Api_1.api.removeAllListeners(Api_1.ValidChannel.GAME_RUNNING);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleSelectAllClick(event) {
        const { appState } = this.props;
        const { mods, activeCollection } = appState;
        if (mods && activeCollection) {
            if (event.target.checked) {
                activeCollection.mods = [...mods.values()].map((mod) => mod.ID);
            }
            else {
                activeCollection.mods = [];
            }
        }
        this.setState({});
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleClick(checked, id) {
        const { appState } = this.props;
        const { activeCollection } = appState;
        if (activeCollection) {
            if (checked) {
                if (!activeCollection.mods.includes(id)) {
                    activeCollection.mods.push(id);
                }
            }
            else {
                activeCollection.mods = activeCollection.mods.filter((mod) => mod !== id);
            }
            this.setState({ madeEdits: true });
        }
    }
    setGameRunningCallback(running) {
        const { overrideGameRunning } = this.state;
        if (overrideGameRunning && running) {
            this.setState({ overrideGameRunning: false });
        }
        this.setState({ gameRunning: running });
    }
    createNewCollection(name) {
        const { madeEdits, promiseManager } = this.state;
        const { appState } = this.props;
        const { config, allCollectionNames, allCollections, activeCollection } = appState;
        if (madeEdits) {
            this.saveCollection(activeCollection, false);
        }
        this.setState({ savingCollection: true });
        const newCollection = {
            name,
            mods: []
        };
        promiseManager
            .execute(Api_1.api.updateCollection(newCollection))
            .then(() => {
            allCollectionNames.add(name);
            allCollections.set(name, newCollection);
            config.activeCollection = name;
            // eslint-disable-next-line promise/no-nesting
            Api_1.api.updateConfig(config).catch((error) => {
                Api_1.api.logger.error(error);
                openNotification({
                    message: 'Failed to udpate config',
                    duration: null
                }, 'error');
            });
            openNotification({
                message: `Created new collection ${name}`,
                duration: 1
            }, 'success');
            appState.activeCollection = newCollection;
            this.setState({});
            return true;
        })
            .catch((error) => {
            Api_1.api.logger.error(error);
            openNotification({
                message: `Failed to create new collection ${name}`,
                duration: null
            }, 'error');
        })
            .finally(() => {
            this.setState({ savingCollection: false });
        });
    }
    duplicateCollection(name) {
        const { madeEdits, promiseManager } = this.state;
        const { appState } = this.props;
        const { config, allCollectionNames, allCollections, activeCollection } = appState;
        this.setState({ savingCollection: true });
        const newCollection = {
            name,
            mods: activeCollection ? [...activeCollection.mods] : []
        };
        const oldName = activeCollection.name;
        if (madeEdits) {
            this.saveCollection(activeCollection, false);
        }
        promiseManager
            .execute(Api_1.api.updateCollection(newCollection))
            .then((writeSuccess) => {
            if (writeSuccess) {
                allCollectionNames.add(name);
                allCollections.set(name, newCollection);
                config.activeCollection = name;
                // eslint-disable-next-line promise/no-nesting
                Api_1.api.updateConfig(config).catch((error) => {
                    Api_1.api.logger.error(error);
                    openNotification({
                        message: 'Failed to update config',
                        duration: null
                    }, 'error');
                });
                openNotification({
                    message: `Duplicated collection ${oldName}`,
                    duration: 1
                }, 'success');
                appState.activeCollection = newCollection;
                this.setState({ madeEdits: false });
            }
            else {
                openNotification({
                    message: `Failed to create new collection ${name}`,
                    duration: null
                }, 'error');
            }
            return writeSuccess;
        })
            .catch((error) => {
            Api_1.api.logger.error(error);
            openNotification({
                message: `Failed to duplicate collection ${oldName}`,
                duration: null
            }, 'error');
        })
            .finally(() => {
            this.setState({ savingCollection: false });
        });
    }
    renameCollection(name) {
        const { promiseManager } = this.state;
        const { appState } = this.props;
        const { config, activeCollection } = appState;
        const oldName = activeCollection.name;
        this.setState({ savingCollection: true });
        promiseManager
            .execute(Api_1.api.renameCollection(activeCollection.name, name))
            .then((updateSuccess) => {
            if (updateSuccess) {
                activeCollection.name = name;
                config.activeCollection = name;
                // eslint-disable-next-line promise/no-nesting
                Api_1.api.updateConfig(config).catch((error) => {
                    Api_1.api.logger.error(error);
                    openNotification({
                        message: 'Failed to update config',
                        duration: null
                    }, 'error');
                });
                openNotification({
                    message: `Collection ${oldName} renamed to ${name}`,
                    duration: 1
                }, 'success');
                this.setState({ madeEdits: false });
            }
            else {
                openNotification({
                    message: `Failed to rename collection ${oldName} to ${name}`,
                    duration: null
                }, 'error');
            }
            return updateSuccess;
        })
            .catch((error) => {
            Api_1.api.logger.error(error);
            openNotification({
                message: `Failed to rename collection ${oldName} to ${name}`,
                duration: null
            }, 'error');
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
        const { name } = activeCollection;
        promiseManager
            .execute(Api_1.api.deleteCollection(name))
            .then((deleteSuccess) => {
            if (deleteSuccess) {
                allCollectionNames.delete(name);
                allCollections.delete(name);
                let newCollection = {
                    name: 'default',
                    mods: []
                };
                let newCollectionName = 'default';
                if (allCollectionNames.size > 0) {
                    // eslint-disable-next-line prefer-destructuring
                    newCollectionName = [...allCollectionNames].sort()[0];
                    newCollection = allCollections.get(newCollectionName);
                }
                config.activeCollection = newCollectionName;
                // eslint-disable-next-line promise/no-nesting
                Api_1.api.updateConfig(config).catch((error) => {
                    Api_1.api.logger.error(error);
                    openNotification({
                        message: 'Failed to update config',
                        duration: null
                    }, 'error');
                });
                openNotification({
                    message: `Collection ${activeCollection.name} deleted`,
                    duration: 1
                }, 'success');
                appState.activeCollection = newCollection;
                this.setState({ madeEdits: false });
            }
            else {
                openNotification({
                    message: 'Failed to delete collection',
                    duration: null
                }, 'error');
            }
            return deleteSuccess;
        })
            .catch((error) => {
            Api_1.api.logger.error(error);
            openNotification({
                message: 'Failed to delete collection',
                duration: null
            }, 'error');
        })
            .finally(() => {
            this.setState({ savingCollection: false });
        });
    }
    pollGameRunning() {
        const { promiseManager } = this.state;
        Api_1.api.send(Api_1.ValidChannel.GAME_RUNNING);
        if (!promiseManager.isCancelled.value) {
            (0, Sleep_1.pause)(5000, this.pollGameRunning);
        }
    }
    addCollection(name) {
        const { appState } = this.props;
        const { allCollections, allCollectionNames } = appState;
        allCollectionNames === null || allCollectionNames === void 0 ? void 0 : allCollectionNames.add(name);
        allCollections === null || allCollections === void 0 ? void 0 : allCollections.set(name, { name, mods: [] });
    }
    // eslint-disable-next-line class-methods-use-this
    saveCollection(collection, pureSave) {
        this.setState({ savingCollection: true });
        const oldName = collection.name;
        Api_1.api
            .updateCollection(collection)
            .then((writeSuccess) => {
            if (!writeSuccess) {
                openNotification({
                    message: `Failed to save collection ${oldName}`,
                    duration: null
                }, 'error');
            }
            else {
                openNotification({
                    message: `Saved collection ${oldName}`,
                    duration: 1
                }, 'success');
            }
            return writeSuccess;
        })
            .catch((error) => {
            Api_1.api.logger.error(error);
        })
            .finally(() => {
            if (pureSave) {
                this.setState({ savingCollection: false, madeEdits: false });
            }
        });
    }
    baseLaunchGame(mods) {
        const { promiseManager } = this.state;
        const { appState, setLaunchingGame } = this.props;
        const { config } = appState;
        Api_1.api.logger.info('launching game');
        setLaunchingGame(true);
        this.setState({ overrideGameRunning: true });
        // add a visual delay so the user gets to see the nice spinning wheel
        promiseManager
            .execute((0, Sleep_1.pause)(1000, Api_1.api.launchGame, config.steamExec, config.workshopID, config.closeOnLaunch, mods))
            .then((success) => {
            setTimeout(() => {
                this.setState({ overrideGameRunning: false });
            }, 7000);
            return success;
        })
            .finally(() => {
            setLaunchingGame(false);
            this.setState({ gameRunning: true, launchGameWithErrors: false, modalActive: false });
        });
    }
    launchGame() {
        console.log('launching game');
        const { setLaunchingGame } = this.props;
        setLaunchingGame(true);
        this.setState({ validatingMods: true, modErrors: undefined, validatedMods: 0 }, () => {
            this.validateActiveCollection(true);
        });
    }
    validateActiveCollection(launchIfValid) {
        const { promiseManager } = this.state;
        const { appState } = this.props;
        const { activeCollection, mods } = appState;
        this.setState({ modalActive: true });
        if (activeCollection) {
            const collectionMods = [...activeCollection.mods];
            Api_1.api.logger.info('Selected mods:');
            Api_1.api.logger.info(collectionMods);
            promiseManager
                .execute((0, Validation_1.validateActiveCollection)({
                modList: collectionMods,
                allMods: mods,
                updateValidatedModsCallback: (validatedMods) => {
                    Api_1.api.logger.info(`We have validated ${validatedMods} mods`);
                    this.setState({ validatedMods });
                },
                setModErrorsCallback: (modErrors) => {
                    this.setState({ modErrors });
                }
            }))
                .then((success) => {
                if (success) {
                    Api_1.api.logger.info(`To launch game?: ${launchIfValid}`);
                    if (success && launchIfValid) {
                        const modDataList = collectionMods.map((modID) => {
                            return mods.get(modID);
                        });
                        this.baseLaunchGame(modDataList);
                    }
                    // eslint-disable-next-line promise/no-nesting
                    promiseManager
                        .execute(Api_1.api.updateCollection(activeCollection))
                        .then((updateSuccess) => {
                        if (!updateSuccess) {
                            setTimeout(() => {
                                openNotification({
                                    message: `Failed to save collection ${activeCollection.name}`,
                                    duration: null
                                }, 'error');
                            }, 500);
                        }
                        else {
                            setTimeout(() => {
                                openNotification({
                                    message: 'Collection validated',
                                    duration: 1
                                }, 'success');
                            }, 500);
                        }
                        setTimeout(() => {
                            this.setState({ modalActive: false });
                        }, 500);
                        return updateSuccess;
                    })
                        .catch((error) => {
                        Api_1.api.logger.error(error);
                        setTimeout(() => {
                            openNotification({
                                message: `Failed to save collection ${activeCollection.name}`,
                                duration: null
                            }, 'error');
                            this.setState({ modalActive: false });
                        }, 500);
                    });
                }
                else {
                    Api_1.api.logger.error('Failed to validate active collection');
                }
                return success;
            })
                .catch((error) => {
                Api_1.api.logger.error(error);
                setTimeout(() => {
                    this.setState({ modalActive: false });
                }, 500);
                setTimeout(() => {
                    openNotification({
                        message: `Failed to validate collection ${activeCollection.name}`,
                        duration: null
                    }, 'error');
                }, 500);
            })
                .finally(() => {
                // validation is finished
                setTimeout(() => {
                    this.setState({ validatingMods: false });
                }, 500);
            });
        }
        else {
            Api_1.api.logger.info('NO ACTIVE COLLECTION');
            this.baseLaunchGame([]);
        }
    }
    // We allow you to load multiple mods with the same ID (bundle name), but only the local mod will be used
    // If multiple workshop mods have the same ID, and you select multiple, then we will force you to choose one to use
    renderModal() {
        var _a;
        const { modalActive, launchGameWithErrors, validatingMods, validatedMods, modErrors } = this.state;
        const { appState, setLaunchingGame } = this.props;
        const { activeCollection, mods, launchingGame } = appState;
        if (modalActive || launchingGame) {
            if (validatingMods) {
                let progressPercent = 0;
                let currentMod;
                if (!(activeCollection === null || activeCollection === void 0 ? void 0 : activeCollection.mods)) {
                    progressPercent = 100;
                }
                else {
                    const currentlyValidatedMods = validatedMods || 0;
                    progressPercent = Math.round((100 * currentlyValidatedMods) / activeCollection.mods.length);
                    if (progressPercent < 100) {
                        const collectionMods = [...activeCollection.mods];
                        currentMod = mods === null || mods === void 0 ? void 0 : mods.get(collectionMods[currentlyValidatedMods]);
                    }
                }
                let status = 'active';
                if (modErrors) {
                    status = 'exception';
                }
                else if (progressPercent >= 100) {
                    status = 'success';
                }
                return (react_1.default.createElement(antd_1.Modal, { title: `Validating Mod Collection ${activeCollection.name}`, visible: true, closable: false, footer: null },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement(antd_1.Space, { direction: "vertical", size: "large", style: { display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' } },
                            react_1.default.createElement(antd_1.Progress, { type: "circle", percent: progressPercent, status: status }),
                            currentMod ? (react_1.default.createElement("p", null,
                                "Validating mod ",
                                ((_a = currentMod.config) === null || _a === void 0 ? void 0 : _a.name) ? currentMod.config.name : currentMod.ID)) : progressPercent >= 100 ? (react_1.default.createElement("p", null, "Validation complete!")) : null))));
            }
            if (modErrors) {
                return (react_1.default.createElement(antd_1.Modal, { title: "Errors Found in Configuration", visible: true, closable: false, okText: "Launch Anyway", cancelText: "Address Errors", onOk: () => {
                        this.setState({ launchGameWithErrors: true });
                        const modList = (activeCollection ? [...activeCollection.mods].map((mod) => mods.get(mod)) : []);
                        this.baseLaunchGame(modList);
                    }, onCancel: () => {
                        console.log('cancel error modal');
                        setLaunchingGame(false);
                        this.setState({ modalActive: false });
                    }, okButtonProps: { disabled: launchGameWithErrors, loading: launchGameWithErrors, danger: true }, cancelButtonProps: { disabled: launchGameWithErrors } },
                    react_1.default.createElement("p", null, "One or more mods have either missing dependencies, or is selected alongside incompatible mods."),
                    react_1.default.createElement("p", null, "Launching the game with this mod list may lead to crashes, or even save game corruption."),
                    react_1.default.createElement("p", null, "Mods that share the same Mod ID (Not the same as Workshop ID) are explicitly incompatible, and only the first one TerraTech loads will be used. All others will be ignored."),
                    react_1.default.createElement("p", null, "Do you want to continue anyway?")));
            }
        }
        return null;
    }
    renderContent() {
        const { rows, filteredRows } = this.state;
        const { appState, collectionComponent } = this.props;
        return (react_1.default.createElement(react_sizeme_1.SizeMe, { monitorHeight: true, monitorWidth: true, refreshMode: "debounce" }, ({ size }) => {
            const collectionComponentProps = {
                rows,
                filteredRows: filteredRows || rows,
                height: size.height,
                width: size.width,
                collection: appState.activeCollection,
                setEnabledModsCallback: (enabledMods) => {
                    if (appState.activeCollection) {
                        appState.activeCollection.mods = [...enabledMods].sort();
                        this.setState({ madeEdits: true });
                    }
                },
                setEnabledCallback: (id) => {
                    this.handleClick(true, id);
                },
                setDisabledCallback: (id) => {
                    this.handleClick(false, id);
                }
            };
            return (react_1.default.createElement(Content, { key: "collection", style: { padding: '0px', overflowY: 'clip', overflowX: 'clip' } },
                react_1.default.createElement(antd_1.Spin, { spinning: appState.launchingGame, tip: "Launching Game..." }, collectionComponent ? collectionComponent(collectionComponentProps) : react_1.default.createElement(MainCollectionComponent_1.default, { ...collectionComponentProps }))));
        }));
    }
    render() {
        const { madeEdits, filteredRows, gameRunning, overrideGameRunning, modalActive, savingCollection, validatingMods } = this.state;
        const { appState } = this.props;
        const { allCollections, searchString, launchingGame } = appState;
        const launchGameButton = (react_1.default.createElement(antd_1.Button, { type: "primary", loading: launchingGame, disabled: overrideGameRunning || gameRunning || modalActive || launchingGame, onClick: this.launchGame }, "Launch Game"));
        return (react_1.default.createElement(antd_1.Layout, null,
            react_1.default.createElement(Header, { style: { height: 120 } },
                react_1.default.createElement(CollectionManagementToolbar_1.default, { appState: appState, searchString: searchString, validatingCollection: validatingMods, savingCollection: savingCollection, onSearchChangeCallback: (search) => {
                        appState.searchString = search;
                        this.setState({});
                    }, validateCollectionCallback: () => {
                        this.setState({ validatingMods: true }, () => {
                            this.validateActiveCollection(false);
                        });
                    }, madeEdits: madeEdits, onSearchCallback: (search) => {
                        if (search && search.length > 0) {
                            const { rows } = this.state;
                            const newFilteredRows = (0, Mod_1.filterRows)(rows, search);
                            this.setState({ filteredRows: newFilteredRows });
                        }
                        else {
                            this.setState({ filteredRows: undefined });
                        }
                        appState.searchString = search;
                        this.setState({});
                    }, changeActiveCollectionCallback: (name) => {
                        appState.activeCollection = allCollections.get(name);
                        this.setState({});
                    }, numResults: filteredRows ? filteredRows.length : undefined, newCollectionCallback: this.createNewCollection, duplicateCollectionCallback: this.duplicateCollection, renameCollectionCallback: this.renameCollection, deleteCollectionCallback: this.deleteCollection, saveCollectionCallback: () => {
                        this.saveCollection(appState.activeCollection, true);
                    } })),
            this.renderModal(),
            this.renderContent(),
            react_1.default.createElement(Footer, { className: "MainFooter", style: { justifyContent: 'center', display: 'flex' } }, launchingGame ? (react_1.default.createElement(antd_1.Popover, { content: "Already launching game" }, launchGameButton)) : gameRunning || !!overrideGameRunning ? (react_1.default.createElement(antd_1.Popover, { content: "Game already running" }, launchGameButton)) : (launchGameButton))));
    }
}
exports.default = CollectionManagerComponent;
//# sourceMappingURL=CollectionManagerComponent.js.map