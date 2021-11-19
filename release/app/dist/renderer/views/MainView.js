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
const react_router_1 = require("react-router");
const antd_1 = require("antd");
const MenuBar_1 = __importDefault(require("./components/MenuBar"));
const CollectionManagerComponent_1 = __importDefault(require("./components/CollectionManagerComponent"));
const { Sider } = antd_1.Layout;
class MainView extends react_1.Component {
    constructor(props) {
        super(props);
        const appState = props.location.state;
        this.state = {
            launchingGame: false,
            ...appState
        };
    }
    refreshMods() {
        const { history } = this.props;
        history.push('/mods', this.state);
    }
    render() {
        const { launchingGame, sidebarCollapsed } = this.state;
        const { history, location, match } = this.props;
        return (react_1.default.createElement("div", { style: { display: 'flex', width: '100%', height: '100%' } },
            react_1.default.createElement(antd_1.Layout, { style: { minHeight: '100vh' } },
                react_1.default.createElement(Sider, { className: "MenuBar", collapsible: true, collapsed: sidebarCollapsed, onCollapse: (collapsed) => {
                        this.setState({ sidebarCollapsed: collapsed });
                    } },
                    react_1.default.createElement("div", { className: "logo" }),
                    react_1.default.createElement(MenuBar_1.default, { disableNavigation: launchingGame, currentTab: "main", history: history, location: location, match: match, appState: this.state })),
                react_1.default.createElement(CollectionManagerComponent_1.default, { setLaunchingGame: (launching) => {
                        this.setState({ launchingGame: launching });
                    }, appState: this.state, refreshModsCallback: () => { } }))));
    }
}
exports.default = (0, react_router_1.withRouter)(MainView);
//# sourceMappingURL=MainView.js.map