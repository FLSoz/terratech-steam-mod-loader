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
const react_1 = __importStar(require("react"));
const react_router_1 = require("react-router");
const antd_1 = require("antd");
const react_loading_1 = __importDefault(require("react-loading"));
const react_sizeme_1 = require("react-sizeme");
const Mod_1 = require("renderer/model/Mod");
const Api_1 = require("renderer/model/Api");
const Sleep_1 = require("renderer/util/Sleep");
const { Footer, Content } = antd_1.Layout;
class ModLoadingView extends react_1.Component {
    constructor(props) {
        super(props);
        this.CONFIG_PATH = undefined;
        const appState = props.location.state;
        const config = appState.config;
        if (!appState.activeCollection) {
            appState.activeCollection = {
                mods: [],
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
            appState
        };
        this.addModPathsCallback = this.addModPathsCallback.bind(this);
        this.loadModCallback = this.loadModCallback.bind(this);
    }
    // Register listener for mod load callback, start mod loading
    componentDidMount() {
        const { config } = this.state;
        Api_1.api.on(Api_1.ValidChannel.MOD_METADATA_RESULTS, this.loadModCallback);
        Api_1.api
            .listSubdirs(config.workshopDir)
            .then((folders) => {
            this.addModPathsCallback(folders, Mod_1.ModType.WORKSHOP);
            return null;
        })
            .catch((error) => {
            console.error(error);
            throw error;
        });
        Api_1.api
            .listSubdirs(config.localDir)
            .then((folders) => {
            this.addModPathsCallback(folders, Mod_1.ModType.LOCAL);
            return null;
        })
            .catch((error) => {
            console.error(error);
            throw error;
        });
    }
    componentWillUnmount() {
        Api_1.api.removeAllListeners(Api_1.ValidChannel.MOD_METADATA_RESULTS);
    }
    setStateCallback(update) {
        const { appState } = this.state;
        this.setState({
            appState: Object.assign(appState, update)
        });
    }
    // Add to current mod list, Go to main view when all mods loaded
    loadModCallback(mod) {
        const { appState, loadedMods } = this.state;
        if (mod) {
            const modsMap = appState.mods;
            Api_1.api.logger.info(`Loaded mod: ${mod.ID}`);
            Api_1.api.logger.info(JSON.stringify(mod, null, 2));
            modsMap.set(mod.WorkshopID ? `${mod.WorkshopID}` : mod.ID, mod);
            appState.mods = modsMap;
        }
        this.setState({
            loadedMods: loadedMods + 1
        }, () => {
            const { totalMods } = this.state;
            if (loadedMods + 1 >= totalMods) {
                this.goToMain();
            }
        });
    }
    addModPathsCallback(paths, type) {
        const count = paths.length;
        const { totalMods } = this.state;
        this.setState({
            totalMods: totalMods + count
        });
        if (type === Mod_1.ModType.WORKSHOP) {
            this.setState({
                countedWorkshopMods: true,
                workshopModPaths: paths
            }, this.conditionalLoadMods);
        }
        else {
            this.setState({
                countedLocalMods: true,
                localModPaths: paths
            }, this.conditionalLoadMods);
        }
    }
    conditionalLoadMods() {
        const { countedLocalMods, countedWorkshopMods, totalMods, loadingMods } = this.state;
        if (countedLocalMods && countedWorkshopMods && totalMods > 0 && !loadingMods) {
            this.setState({
                loadingMods: true
            });
            this.loadMods();
        }
    }
    loadMods() {
        const { localModPaths, workshopModPaths, config } = this.state;
        const sendRequest = (props, prefix, type) => {
            const path = props.value;
            Api_1.api.send(Api_1.ValidChannel.READ_MOD_METADATA, { prefixes: [prefix], path }, type, type === Mod_1.ModType.WORKSHOP ? parseInt(path, 10) : undefined);
        };
        (0, Sleep_1.delayForEach)(localModPaths, 10, sendRequest, config.localDir, Mod_1.ModType.LOCAL);
        (0, Sleep_1.delayForEach)(workshopModPaths, 10, sendRequest, config.workshopDir, Mod_1.ModType.WORKSHOP);
    }
    // TODO: Have an override for duplicate mod IDs - user picks which one is used
    goToMain() {
        const { appState } = this.state;
        const { history } = this.props;
        appState.firstModLoad = true;
        history.push('/main', appState);
    }
    render() {
        const { loadedMods, totalMods } = this.state;
        const percent = totalMods > 0 ? Math.round((100 * loadedMods) / totalMods) : 100;
        return (react_1.default.createElement(antd_1.Layout, { style: { minHeight: '100vh', minWidth: '100vw' } },
            react_1.default.createElement(react_sizeme_1.SizeMe, { monitorHeight: true, monitorWidth: true, refreshMode: "debounce" }, ({ size }) => {
                return (react_1.default.createElement(Content, null,
                    react_1.default.createElement("div", { style: {
                            position: 'absolute',
                            left: '50%',
                            top: '30%',
                            transform: 'translate(-50%, -50%)'
                        } },
                        react_1.default.createElement(react_loading_1.default, { type: "bars", color: "#DDD", width: size.width / 4 }))));
            }),
            react_1.default.createElement(Footer, null,
                react_1.default.createElement(antd_1.Progress, { strokeColor: {
                        from: '#108ee9',
                        to: '#87d068'
                    }, percent: percent }))));
    }
}
exports.default = (0, react_router_1.withRouter)(ModLoadingView);
//# sourceMappingURL=ModLoadingView.js.map