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
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-nested-ternary */
const react_1 = __importStar(require("react"));
const react_router_1 = require("react-router");
const antd_1 = require("antd");
const Api_1 = require("renderer/model/Api");
const MenuBar_1 = __importDefault(require("./components/MenuBar"));
const { Header, Footer, Sider, Content } = antd_1.Layout;
const { Option } = antd_1.Select;
const { TextArea } = antd_1.Input;
class RawModlistView extends react_1.Component {
    constructor(props) {
        super(props);
        this.CONFIG_PATH = undefined;
        const appState = props.location.state;
        this.state = { gameRunning: false, validatingMods: false, modErrors: undefined, sidebarCollapsed: true, ...appState, launchingGame: false };
        this.launchGame = this.launchGame.bind(this);
        this.setGameRunningCallback = this.setGameRunningCallback.bind(this);
    }
    componentDidMount() {
        this.readConfig();
        Api_1.api.on(Api_1.ValidChannel.GAME_RUNNING, this.setGameRunningCallback);
        this.pollGameRunning();
    }
    componentWillUnmount() {
        Api_1.api.removeAllListeners(Api_1.ValidChannel.GAME_RUNNING);
    }
    setStateCallback(update) {
        this.setState(update);
    }
    setGameRunningCallback(running) {
        this.setState({ gameRunning: running });
    }
    pollGameRunning() {
        Api_1.api.send(Api_1.ValidChannel.GAME_RUNNING);
        setTimeout(() => {
            this.pollGameRunning();
        }, 5000);
    }
    baseLaunchGame(rawModList) {
        const { config, text, mods } = this.state;
        if (text) {
            const modList = rawModList.map((mod) => mods.get(mod));
            const launchPromise = Api_1.api.launchGame(config.steamExec, config.workshopID, config.closeOnLaunch, modList);
            if (!(config === null || config === void 0 ? void 0 : config.closeOnLaunch)) {
                launchPromise.finally(() => {
                    this.setState({ launchingGame: false, gameRunning: true, launchGameWithErrors: false, modalActive: false });
                });
            }
        }
    }
    launchGame() {
        this.setState({ launchingGame: true });
        this.validateMods(true);
    }
    validateFunctionAsync(modList) {
        const { mods } = this.state;
        const failures = {};
        let failed = false;
        modList.forEach(async (mod, index) => {
            const modExists = mods.has(mod);
            if (!modExists) {
                try {
                    const workshopID = parseFloat(mod);
                    if (Number.isNaN(workshopID)) {
                        failed = true;
                        failures[index] = `Local mod ${mod} does not exist`;
                    }
                    else {
                        const modDetails = await Api_1.api.invoke(Api_1.ValidChannel.QUERY_STEAM, BigInt(mod));
                        if (!modDetails) {
                            failed = true;
                            failures[index] = `Mod ${mod} could not be located on the Steam Workshop`;
                        }
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }
                catch (error) {
                    console.error(error);
                    failed = true;
                    failures[index] = error.toString();
                }
            }
            await setTimeout(() => { }, 500);
        });
        if (failed) {
            this.setState({ modErrors: failures });
        }
        return failed;
    }
    validateMods(launchIfValid) {
        this.setState({ validatingMods: true, modalActive: true });
        const { text } = this.state;
        if (text) {
            const mods = text.split(/\r\n|\n\r|\n|\r/);
            const validationPromise = new Promise((resolve, reject) => {
                try {
                    const isValid = this.validateFunctionAsync(mods);
                    resolve(isValid);
                }
                catch (error) {
                    reject(error);
                }
            });
            validationPromise
                .then((isValid) => {
                this.setState({ validatingMods: false });
                if (isValid && launchIfValid) {
                    this.baseLaunchGame(mods);
                }
                return isValid;
            })
                .catch((error) => {
                console.error(error);
                this.setState({ validatingMods: false });
            });
        }
        else {
            this.baseLaunchGame([]);
        }
    }
    readConfig() {
        const { config } = this.state;
        Api_1.api
            .readFile({ prefixes: [config.localDir], path: 'renderer/modlist.txt' })
            .then((res) => {
            const lines = res.split(/\r\n|\n\r|\n|\r/);
            this.setState({
                text: lines
                    .map((line) => {
                    const matches = line.match(/:(.*)/);
                    if (matches && matches.length > 1) {
                        return matches[1];
                    }
                    return line;
                })
                    .join('\n')
            });
            return true;
        })
            .catch((error) => {
            console.error(error);
        })
            .finally(() => {
            this.setState({ readingLast: false });
        });
    }
    renderModal() {
        var _a;
        const { launchingGame, launchGameWithErrors, validatingMods, validatedMods, activeCollection, modErrors, mods, text } = this.state;
        const failed = !!modErrors;
        if (launchingGame) {
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
                if (failed) {
                    status = 'exception';
                }
                else if (progressPercent >= 100) {
                    status = 'success';
                }
                return (react_1.default.createElement(antd_1.Modal, { title: "Validating Mod Collection", visible: true, closable: false, footer: null },
                    currentMod ? (react_1.default.createElement("p", null,
                        "Validating mod ",
                        ((_a = currentMod.config) === null || _a === void 0 ? void 0 : _a.name) ? currentMod.config.name : currentMod.ID)) : progressPercent >= 100 ? (react_1.default.createElement("p", null, "All mods validated!")) : null,
                    react_1.default.createElement("p", null,
                        react_1.default.createElement(antd_1.Progress, { type: "circle", percent: progressPercent, status: status }))));
            }
            if (failed) {
                return (react_1.default.createElement(antd_1.Modal, { title: "Errors Found in Configuration", visible: true, closable: false, okText: "Launch Anyway", cancelText: "Address Errors", onOk: () => {
                        this.setState({ launchGameWithErrors: true });
                        this.baseLaunchGame(text ? text.split(/\r\n|\n\r|\n|\r/) : []);
                    }, onCancel: () => {
                        this.setState({ launchingGame: false });
                    }, okButtonProps: { disabled: launchGameWithErrors, loading: launchGameWithErrors }, cancelButtonProps: { disabled: launchGameWithErrors } },
                    react_1.default.createElement("p", null, "One or more local mods do not exist. Launching the game with this configuration may lead to a crash"),
                    react_1.default.createElement("p", null, "Do you want to continue anyway?")));
            }
        }
        return null;
    }
    render() {
        const { sidebarCollapsed, launchingGame, gameRunning, text, modErrors, readingLast } = this.state;
        const { history, location, match } = this.props;
        const launchGameButton = (react_1.default.createElement(antd_1.Button, { loading: launchingGame, disabled: gameRunning || readingLast || launchingGame, onClick: this.launchGame }, "Launch Game"));
        let optionalHelp;
        if (modErrors) {
            optionalHelp = [...Object.keys(modErrors)]
                .map((key) => {
                const lineNumber = parseInt(key, 10);
                return `Error on line ${lineNumber}: ${modErrors[lineNumber]}`;
            })
                .join('\n');
        }
        return (react_1.default.createElement("div", { style: { display: 'flex', width: '100%', height: '100%' } },
            react_1.default.createElement(antd_1.Layout, { style: { minHeight: '100vh' } },
                react_1.default.createElement(Sider, { className: "MenuBar", collapsible: true, collapsed: sidebarCollapsed, onCollapse: (collapsed) => {
                        this.setState({ sidebarCollapsed: collapsed });
                    } },
                    react_1.default.createElement("div", { className: "logo" }),
                    react_1.default.createElement(MenuBar_1.default, { disableNavigation: readingLast || launchingGame, currentTab: "raw", history: history, location: location, match: match, appState: this.state })),
                react_1.default.createElement(antd_1.Layout, { style: { width: '100%' } },
                    react_1.default.createElement(antd_1.Spin, { spinning: launchingGame, tip: "Launching Game..." },
                        this.renderModal(),
                        react_1.default.createElement(Content, null,
                            react_1.default.createElement(antd_1.Form, null,
                                react_1.default.createElement(antd_1.Form.Item, { validateStatus: modErrors ? 'error' : 'success', help: optionalHelp },
                                    react_1.default.createElement(TextArea, { placeholder: "Enter list of mods here. Use Mod IDs for local mods, and Workshop IDs for Workshop mods.", autoSize: true, bordered: false, onChange: (e) => this.setState({ text: e.target.value }), value: text, disabled: readingLast })))),
                        react_1.default.createElement(Footer, { style: { justifyContent: 'center', display: 'flex' } }, readingLast ? (react_1.default.createElement(antd_1.Popover, { content: "Reading last modlist" }, launchGameButton)) : launchingGame ? (react_1.default.createElement(antd_1.Popover, { content: "Already launching game" }, launchGameButton)) : gameRunning ? (react_1.default.createElement(antd_1.Popover, { content: "Game already running" }, launchGameButton)) : (launchGameButton)))))));
    }
}
exports.default = (0, react_router_1.withRouter)(RawModlistView);
//# sourceMappingURL=RawModlistView.js.map