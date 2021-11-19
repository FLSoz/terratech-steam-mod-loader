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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const antd_1 = require("antd");
const icons_1 = require("@ant-design/icons");
class MenuBar extends react_1.Component {
    constructor(props) {
        super(props);
        this.CONFIG_PATH = undefined;
        const { currentTab } = props;
        this.state = {
            currentTab
        };
    }
    render() {
        const { disableNavigation, appState } = this.props;
        const { currentTab } = this.state;
        const loadBeforeNavigation = !appState.firstModLoad;
        const MenuIconStyle = { fontSize: 28, lineHeight: 0, marginLeft: -4 };
        const MenuItemStyle = { display: 'flex', alignItems: 'center' };
        return (react_1.default.createElement(antd_1.Menu, { id: "MenuBar", theme: "dark", className: "MenuBar", selectedKeys: [currentTab], mode: "inline", disabled: disableNavigation, onClick: (e) => {
                if (e.key !== currentTab) {
                    const { history } = this.props;
                    switch (e.key) {
                        case 'raw':
                            if (loadBeforeNavigation) {
                                history.push('/mods', { ...appState, ...{ targetPathAfterLoad: '/raw-mods', modErrors: undefined } });
                            }
                            else {
                                history.push('/raw-mods', { ...appState, ...{ modErrors: undefined } });
                            }
                            break;
                        case 'settings':
                            history.push('/settings', appState);
                            break;
                        case 'main':
                            if (loadBeforeNavigation) {
                                history.push('/mods', { ...appState, ...{ targetPathAfterLoad: '/main', modErrors: undefined } });
                            }
                            else {
                                history.push('/main', { ...appState, ...{ modErrors: undefined } });
                            }
                            break;
                        case 'steam':
                            if (loadBeforeNavigation) {
                                history.push('/mods', { ...appState, ...{ targetPathAfterLoad: '/steam', modErrors: undefined } });
                            }
                            else {
                                history.push('/steam', { ...appState, ...{ modErrors: undefined } });
                            }
                            break;
                        case 'ttqmm':
                            if (loadBeforeNavigation) {
                                history.push('/mods', { ...appState, ...{ targetPathAfterLoad: '/ttqmm', modErrors: undefined } });
                            }
                            else {
                                history.push('/ttqmm', { ...appState, ...{ modErrors: undefined } });
                            }
                            break;
                        default:
                            break;
                    }
                }
            } },
            react_1.default.createElement(antd_1.Menu.Item, { key: "main", style: MenuItemStyle, icon: react_1.default.createElement(icons_1.AppstoreOutlined, { style: MenuIconStyle }) }, "Mod Collections"),
            react_1.default.createElement(antd_1.Menu.Item, { key: "raw", style: MenuItemStyle, icon: react_1.default.createElement(icons_1.FileTextOutlined, { style: MenuIconStyle }) }, "Raw Modlist"),
            react_1.default.createElement(antd_1.Menu.Item, { key: "ttqmm", style: MenuItemStyle, icon: react_1.default.createElement(icons_1.GithubOutlined, { style: MenuIconStyle }) }, "TTQMM Browser"),
            react_1.default.createElement(antd_1.Menu.Item, { key: "settings", style: MenuItemStyle, icon: react_1.default.createElement(icons_1.SettingOutlined, { style: MenuIconStyle }) }, "Settings")));
    }
}
exports.default = MenuBar;
//# sourceMappingURL=MenuBar.js.map