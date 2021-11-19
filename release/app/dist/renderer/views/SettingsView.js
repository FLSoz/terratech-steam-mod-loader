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
const Api_1 = require("renderer/model/Api");
const icons_1 = require("@ant-design/icons");
const MenuBar_1 = __importDefault(require("./components/MenuBar"));
const { Sider, Content } = antd_1.Layout;
const { Search } = antd_1.Input;
class SettingsView extends react_1.Component {
    constructor(props) {
        super(props);
        this.formRef = react_1.default.createRef();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const passedState = props.location.state;
        const appState = passedState;
        const configErrors = passedState.configErrors ? passedState.configErrors : {};
        this.state = {
            editingConfig: { ...appState.config },
            ...appState,
            savingConfig: false,
            configErrors
        };
        this.saveChanges = this.saveChanges.bind(this);
        this.cancelChanges = this.cancelChanges.bind(this);
    }
    componentDidMount() {
        this.formRef.current.validateFields();
    }
    componentDidUpdate() { }
    saveChanges() {
        const { editingConfig, config } = this.state;
        this.setState({ savingConfig: true });
        Api_1.api
            .updateConfig(editingConfig)
            .then(() => {
            this.setState({ config: { ...editingConfig }, madeEdits: false });
            return true;
        })
            .catch((error) => {
            console.error(error);
            this.setState({ config });
        })
            .finally(() => {
            this.setState({ savingConfig: false });
        });
    }
    cancelChanges() {
        const { config } = this.state;
        this.setState({ editingConfig: { ...config }, madeEdits: false }, () => {
            this.formRef.current.resetFields();
        });
    }
    validateFile(field, value) {
        const { configErrors } = this.state;
        if (!!value && value.length > 0) {
            return Api_1.api
                .pathExists(value)
                .catch((error) => {
                console.error(error);
                configErrors[field] = error.toString();
                this.setState({});
                throw new Error(`Error while validating path:\n${error.toString()}`);
            })
                .then((success) => {
                if (!success) {
                    configErrors[field] = 'Provided path is invalid';
                    this.setState({});
                    throw new Error('Provided path is invalid');
                }
                delete configErrors[field];
                this.setState({});
                return true;
            });
        }
        return Promise.reject(new Error('Steam Executable Path is required'));
    }
    render() {
        const { sidebarCollapsed, editingConfig, madeEdits, savingConfig, configErrors } = this.state;
        const { history, location, match } = this.props;
        Api_1.api.logger.info(editingConfig);
        Api_1.api.logger.info(configErrors);
        return (react_1.default.createElement("div", { style: { display: 'flex', width: '100%', height: '100%' } },
            react_1.default.createElement(antd_1.Layout, { style: { minHeight: '100vh' } },
                react_1.default.createElement(Sider, { className: "MenuBar", collapsible: true, collapsed: sidebarCollapsed, onCollapse: (collapsed) => {
                        this.setState({ sidebarCollapsed: collapsed });
                    } },
                    react_1.default.createElement("div", { className: "logo" }),
                    react_1.default.createElement(MenuBar_1.default, { disableNavigation: savingConfig || madeEdits || (!!configErrors && Object.keys(configErrors).length > 0), currentTab: "settings", history: history, location: location, match: match, appState: this.state })),
                react_1.default.createElement(antd_1.Layout, { style: { width: '100%' } },
                    react_1.default.createElement(Content, { className: "Settings" },
                        react_1.default.createElement(antd_1.PageHeader, { className: "site-page-header", title: "Settings" }),
                        react_1.default.createElement(antd_1.Form
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        , { 
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ref: this.formRef, onFinish: this.saveChanges, labelCol: { span: 10, lg: 8, xl: 6, xxl: 4 }, wrapperCol: { span: 14 }, initialValues: { remember: true }, autoComplete: "off", style: {
                                margin: 40,
                                alignContent: 'center',
                                justifyContent: 'center'
                            }, name: "control-ref" },
                            react_1.default.createElement(antd_1.Form.Item, { name: "steamExec", label: "Steam Executable", initialValue: editingConfig.steamExec, rules: [
                                    {
                                        required: true,
                                        validator: (_, value) => {
                                            return this.validateFile('steamExec', value);
                                        }
                                    }
                                ], tooltip: "Path to Steam executable", help: configErrors.steamExec && configErrors.steamExec.startsWith('OVERRIDE:') ? configErrors.steamExec.substring(9) : undefined, validateStatus: configErrors.steamExec ? 'error' : undefined },
                                react_1.default.createElement(Search, { value: editingConfig.steamExec, enterButton: react_1.default.createElement(icons_1.FolderOutlined, null), onChange: (event) => {
                                        editingConfig.steamExec = event.target.value;
                                        this.setState({ madeEdits: true });
                                    }, onSearch: () => {
                                        Api_1.api.send(Api_1.ValidChannel.SELECT_PATH, 'steamExec');
                                    } })),
                            react_1.default.createElement(antd_1.Form.Item, { name: "localDir", label: "Local Mods Directory", tooltip: {
                                    overlayInnerStyle: { minWidth: 300 },
                                    title: (react_1.default.createElement("div", null,
                                        react_1.default.createElement("p", null, "Path to TT Local Mods directory"),
                                        react_1.default.createElement("p", null, "It will be called \"LocalMods\", and be under Steam/steamapps/common/TerraTech")))
                                }, initialValue: editingConfig.localDir, rules: [
                                    {
                                        required: true,
                                        validator: (_, value) => {
                                            return this.validateFile('localDir', value);
                                        }
                                    }
                                ], help: configErrors.localDir && configErrors.localDir.startsWith('OVERRIDE:') ? configErrors.localDir.substring(9) : undefined, validateStatus: configErrors.localDir ? 'error' : undefined },
                                react_1.default.createElement(Search, { value: editingConfig.localDir, enterButton: react_1.default.createElement(icons_1.FolderOutlined, null), onChange: (event) => {
                                        editingConfig.localDir = event.target.value;
                                        this.setState({ madeEdits: true });
                                    }, onSearch: () => {
                                        Api_1.api.send(Api_1.ValidChannel.SELECT_PATH, 'localDir');
                                    } })),
                            react_1.default.createElement(antd_1.Form.Item, { name: "workshopDir", label: "Steam Workshop Directory", tooltip: {
                                    overlayInnerStyle: { minWidth: 400 },
                                    title: (react_1.default.createElement("div", null,
                                        react_1.default.createElement("p", null, "Path to Steam Workshop directory"),
                                        react_1.default.createElement("p", null, "It will be under Steam/steamapps/workshop/content/285920")))
                                }, initialValue: editingConfig.workshopDir, rules: [
                                    {
                                        required: true,
                                        validator: (_, value) => {
                                            return this.validateFile('workshopDir', value);
                                        }
                                    }
                                ], help: configErrors.workshopDir && configErrors.workshopDir.startsWith('OVERRIDE:') ? configErrors.workshopDir.substring(9) : undefined, validateStatus: configErrors.workshopDir ? 'error' : undefined },
                                react_1.default.createElement(Search, { value: editingConfig.workshopDir, enterButton: react_1.default.createElement(icons_1.FolderOutlined, null), onSearch: () => {
                                        Api_1.api.send(Api_1.ValidChannel.SELECT_PATH, 'workshopDir');
                                    }, onChange: (event) => {
                                        editingConfig.workshopDir = event.target.value;
                                        this.setState({ madeEdits: true });
                                        this.formRef.current.setFieldsValue({ workshopDir: event.target.value });
                                    } })),
                            react_1.default.createElement(antd_1.Form.Item, { name: "logsDir", label: "Logs Directory", initialValue: editingConfig.logsDir },
                                react_1.default.createElement(Search, { disabled: true, value: editingConfig.logsDir, enterButton: react_1.default.createElement(icons_1.FolderOutlined, null), onSearch: () => {
                                        Api_1.api.send(Api_1.ValidChannel.SELECT_PATH, 'logsDir');
                                    } })),
                            react_1.default.createElement(antd_1.Form.Item, { name: "closeOnLaunch", label: "Close on Game Launch", initialValue: editingConfig.closeOnLaunch },
                                react_1.default.createElement(antd_1.Switch, { checked: editingConfig.closeOnLaunch, onChange: (checked) => {
                                        editingConfig.closeOnLaunch = checked;
                                        /* this.formRef.current!.setFieldsValue({
                                            closeOnLaunch: checked
                                        }); */
                                        this.setState({ madeEdits: true });
                                    } })),
                            react_1.default.createElement(antd_1.Form.Item, { name: "workshopID", label: "Workshop ID", rules: [{ required: true }], initialValue: editingConfig.workshopID },
                                react_1.default.createElement(antd_1.InputNumber, { disabled: true, value: editingConfig.workshopID, onChange: (value) => {
                                        editingConfig.workshopID = value;
                                        this.setState({ madeEdits: true });
                                    } })),
                            react_1.default.createElement(antd_1.Form.Item, { name: "steamMaxConcurrency", label: "Steam API Limit", rules: [{ required: true }], initialValue: editingConfig.steamMaxConcurrency },
                                react_1.default.createElement(antd_1.InputNumber, { disabled: true, min: 0, max: 10, value: editingConfig.steamMaxConcurrency, onChange: (value) => {
                                        editingConfig.steamMaxConcurrency = value;
                                        this.setState({ madeEdits: true });
                                    } })),
                            react_1.default.createElement(antd_1.Form.Item, { wrapperCol: { offset: 10 } },
                                react_1.default.createElement(antd_1.Space, { size: "large", align: "center" },
                                    react_1.default.createElement(antd_1.Button, { loading: savingConfig, disabled: !madeEdits || (!!configErrors && Object.keys(configErrors).length > 0), type: "primary", htmlType: "submit" }, "Save Changes"),
                                    react_1.default.createElement(antd_1.Button, { disabled: !madeEdits, htmlType: "button", onClick: this.cancelChanges }, "Reset Changes")))))))));
    }
}
exports.default = (0, react_router_1.withRouter)(SettingsView);
//# sourceMappingURL=SettingsView.js.map