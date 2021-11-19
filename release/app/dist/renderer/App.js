"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line prettier/prettier
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
require("./App.global.less");
require("@fontsource/roboto/300.css");
require("@fontsource/roboto/400.css");
require("@fontsource/roboto/500.css");
require("@fontsource/roboto/700.css");
const ConfigLoadingView_1 = __importDefault(require("./views/ConfigLoadingView"));
const MainView_1 = __importDefault(require("./views/MainView"));
const ModLoadingView_1 = __importDefault(require("./views/ModLoadingView"));
const RawModlistView_1 = __importDefault(require("./views/RawModlistView"));
const SettingsView_1 = __importDefault(require("./views/SettingsView"));
const TTQMMBrowser_1 = __importDefault(require("./views/TTQMMBrowser"));
const SteamBrowser_1 = __importDefault(require("./views/SteamBrowser"));
function App() {
    return (react_1.default.createElement(react_router_dom_1.MemoryRouter, null,
        react_1.default.createElement(react_router_dom_1.Switch, null,
            react_1.default.createElement(react_router_dom_1.Route, { path: "/", exact: true, component: ConfigLoadingView_1.default }),
            react_1.default.createElement(react_router_dom_1.Route, { path: "/settings", exact: true, component: SettingsView_1.default }),
            react_1.default.createElement(react_router_dom_1.Route, { path: "/mods", exact: true, component: ModLoadingView_1.default }),
            react_1.default.createElement(react_router_dom_1.Route, { path: "/raw-mods", exact: true, component: RawModlistView_1.default }),
            react_1.default.createElement(react_router_dom_1.Route, { path: "/main", exact: true, component: MainView_1.default }),
            react_1.default.createElement(react_router_dom_1.Route, { path: "/steam", exact: true, component: SteamBrowser_1.default }),
            react_1.default.createElement(react_router_dom_1.Route, { path: "/ttqmm", exact: true, component: TTQMMBrowser_1.default }))));
}
exports.default = App;
//# sourceMappingURL=App.js.map