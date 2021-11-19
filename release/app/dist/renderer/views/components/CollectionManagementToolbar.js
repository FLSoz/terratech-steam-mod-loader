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
const Api_1 = require("renderer/model/Api");
const { Option } = antd_1.Select;
const { Search } = antd_1.Input;
var CollectionManagementToolbarModalType;
(function (CollectionManagementToolbarModalType) {
    CollectionManagementToolbarModalType["NEW_COLLECTION"] = "new-collection";
    CollectionManagementToolbarModalType["DUPLICATE_COLLECTION"] = "duplicate-collection";
    CollectionManagementToolbarModalType["RENAME_COLLECTION"] = "rename-collection";
})(CollectionManagementToolbarModalType || (CollectionManagementToolbarModalType = {}));
class CollectionManagementToolbarComponent extends react_1.Component {
    constructor(props) {
        super(props);
        const { appState, renameCollectionCallback, newCollectionCallback, duplicateCollectionCallback } = this.props;
        this.modalProps = {
            [CollectionManagementToolbarModalType.NEW_COLLECTION]: {
                title: 'New Collection',
                okText: 'Create New Collection',
                callback: newCollectionCallback
            },
            [CollectionManagementToolbarModalType.DUPLICATE_COLLECTION]: {
                title: 'Duplicate Collection',
                okText: 'Duplicate Collection',
                callback: duplicateCollectionCallback
            },
            [CollectionManagementToolbarModalType.RENAME_COLLECTION]: {
                title: 'Rename Collection',
                okText: 'Rename Collection',
                callback: renameCollectionCallback
            }
        };
        this.state = {
            ...appState,
            modalText: ''
        };
    }
    componentDidMount() { }
    setStateCallback(update) {
        this.setState(update);
    }
    disabledFeatures() {
        const { modalType } = this.state;
        const { savingCollection } = this.props;
        return savingCollection || !!modalType;
    }
    opInProgress() {
        const { savingCollection } = this.props;
        return savingCollection;
    }
    renderModal() {
        const { modalType, modalText, allCollectionNames } = this.state;
        if (!modalType) {
            return null;
        }
        const modalProps = this.modalProps[modalType];
        return (react_1.default.createElement(antd_1.Modal, { title: modalProps.title, visible: true, closable: false, okText: modalProps.okText, onCancel: () => {
                this.setState({ modalType: undefined, modalText: '' });
            }, okButtonProps: {
                disabled: modalText.length === 0 || allCollectionNames.has(modalText),
                loading: this.opInProgress()
            }, onOk: () => {
                this.setState({ modalText: '', modalType: undefined }, () => {
                    modalProps.callback(modalText);
                });
            } },
            react_1.default.createElement(antd_1.Input, { onChange: (evt) => {
                    this.setState({ modalText: evt.target.value });
                } })));
    }
    render() {
        const { deleteCollectionCallback, saveCollectionCallback, appState, changeActiveCollectionCallback, savingCollection, validatingCollection, validateCollectionCallback, numResults, onSearchCallback, onSearchChangeCallback, searchString, madeEdits } = this.props;
        const disabledFeatures = this.disabledFeatures();
        return (react_1.default.createElement("div", { id: "mod-collection-toolbar" },
            this.renderModal(),
            react_1.default.createElement(antd_1.Row, { key: "row1", justify: "space-between", gutter: 16 },
                react_1.default.createElement(antd_1.Col, { span: 20 },
                    react_1.default.createElement(antd_1.Row, { gutter: 16 },
                        react_1.default.createElement(antd_1.Col, { span: 16, key: "collections" },
                            react_1.default.createElement(antd_1.Select, { style: { width: '100%' }, value: appState.activeCollection.name, onSelect: (value) => {
                                    changeActiveCollectionCallback(value);
                                } }, [...appState.allCollectionNames].sort().map((name) => {
                                return (react_1.default.createElement(Option, { key: name, value: name }, name));
                            }))),
                        react_1.default.createElement(antd_1.Col, null,
                            react_1.default.createElement(antd_1.Space, { align: "start" },
                                react_1.default.createElement(antd_1.Button, { key: "rename", icon: react_1.default.createElement(icons_1.EditOutlined, null), onClick: () => {
                                        this.setState({ modalType: CollectionManagementToolbarModalType.RENAME_COLLECTION });
                                    }, disabled: disabledFeatures }),
                                react_1.default.createElement(antd_1.Dropdown.Button, { key: "new", overlay: react_1.default.createElement(antd_1.Menu, { selectedKeys: [], onClick: (e) => {
                                            if (e.key === 'duplicate') {
                                                this.setState({ modalType: CollectionManagementToolbarModalType.DUPLICATE_COLLECTION });
                                            }
                                        } },
                                        react_1.default.createElement(antd_1.Menu.Item, { key: "duplicate" }, "Duplicate")), disabled: disabledFeatures, onClick: () => {
                                        this.setState({ modalType: CollectionManagementToolbarModalType.NEW_COLLECTION });
                                    } },
                                    react_1.default.createElement(icons_1.PlusOutlined, null),
                                    "New"))))),
                react_1.default.createElement(antd_1.Col, { span: 4, style: { display: 'inline-flex', justifyContent: 'flex-end' } },
                    react_1.default.createElement(antd_1.Space, { align: "center" },
                        react_1.default.createElement(antd_1.Button, { shape: "circle", key: "save", type: "primary", icon: react_1.default.createElement(icons_1.DownloadOutlined, null), onClick: saveCollectionCallback, disabled: disabledFeatures || !madeEdits, loading: savingCollection }),
                        react_1.default.createElement(antd_1.Button, { shape: "circle", key: "save", type: "primary", icon: react_1.default.createElement(icons_1.CopyOutlined, null), onClick: saveCollectionCallback, disabled: disabledFeatures || !madeEdits, loading: savingCollection }),
                        react_1.default.createElement(antd_1.Button, { shape: "circle", key: "save", type: "primary", icon: react_1.default.createElement(icons_1.SaveOutlined, null), onClick: saveCollectionCallback, disabled: disabledFeatures || !madeEdits, loading: savingCollection }),
                        react_1.default.createElement(antd_1.Button, { danger: true, type: "primary", key: "delete", shape: "circle", icon: react_1.default.createElement(icons_1.DeleteOutlined, null), onClick: deleteCollectionCallback, disabled: disabledFeatures })))),
            react_1.default.createElement(antd_1.Row, { key: "row2", justify: "space-between", align: "top", gutter: 16, style: { lineHeight: '32px' } },
                react_1.default.createElement(antd_1.Col, { span: 18 },
                    react_1.default.createElement(antd_1.Row, { gutter: 24 },
                        react_1.default.createElement(antd_1.Col, { span: numResults !== undefined ? 18 : 24, key: "search" },
                            react_1.default.createElement("div", { style: { lineHeight: '32px' } },
                                react_1.default.createElement(Search, { placeholder: "input search text", onChange: (event) => {
                                        onSearchChangeCallback(event.target.value);
                                    }, value: searchString, onSearch: (search) => {
                                        Api_1.api.logger.info(`Searching for: ${search}`);
                                        onSearchCallback(search);
                                    }, enterButton: true, disabled: disabledFeatures }))),
                        numResults !== undefined ? (react_1.default.createElement(antd_1.Col, { span: 4, key: "right" },
                            react_1.default.createElement("div", { style: { lineHeight: '32px' } },
                                react_1.default.createElement("span", null,
                                    numResults,
                                    " mods found")))) : null)),
                react_1.default.createElement(antd_1.Col, { span: 4, key: "tools", style: { display: 'inline-flex', justifyContent: 'flex-end' } },
                    react_1.default.createElement(antd_1.Space, { align: "center", style: { lineHeight: '32px' } },
                        react_1.default.createElement(antd_1.Button, { key: "undo", shape: "circle", icon: react_1.default.createElement(icons_1.UndoOutlined, null), disabled: disabledFeatures || true }),
                        react_1.default.createElement(antd_1.Button, { key: "redo", shape: "circle", icon: react_1.default.createElement(icons_1.RedoOutlined, null), disabled: disabledFeatures || true }),
                        react_1.default.createElement(antd_1.Button, { shape: "circle", key: "validate", type: "primary", icon: react_1.default.createElement(icons_1.CheckCircleOutlined, null), disabled: disabledFeatures, loading: validatingCollection, onClick: validateCollectionCallback }),
                        react_1.default.createElement(antd_1.Button, { danger: true, type: "primary", key: "refresh", shape: "circle", icon: react_1.default.createElement(icons_1.SyncOutlined, null), disabled: disabledFeatures }))))));
    }
}
exports.default = CollectionManagementToolbarComponent;
//# sourceMappingURL=CollectionManagementToolbar.js.map