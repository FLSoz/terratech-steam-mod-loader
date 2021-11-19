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
const antd_1 = require("antd");
const react_1 = __importStar(require("react"));
const icons_1 = require("@ant-design/icons");
const html_react_parser_1 = __importDefault(require("html-react-parser"));
const Api_1 = require("renderer/model/Api");
const Mod_1 = require("renderer/model/Mod");
const local_png_1 = __importDefault(require("../../../../assets/local.png"));
const steam_png_1 = __importDefault(require("../../../../assets/steam.png"));
const ttmm_png_1 = __importDefault(require("../../../../assets/ttmm.png"));
const { Content } = antd_1.Layout;
function getImageSrcFromType(type) {
    switch (type) {
        case Mod_1.ModType.LOCAL:
            return (react_1.default.createElement(antd_1.Tooltip, { title: "This is a local mod" },
                react_1.default.createElement("img", { src: local_png_1.default, width: "25px", alt: "", key: "type" })));
        case Mod_1.ModType.TTQMM:
            return (react_1.default.createElement(antd_1.Tooltip, { title: "This is a TTMM mod" },
                react_1.default.createElement("img", { src: ttmm_png_1.default, width: "25px", alt: "", key: "type" })));
        case Mod_1.ModType.WORKSHOP:
            return (react_1.default.createElement(antd_1.Tooltip, { title: "This is a Steam mod" },
                react_1.default.createElement("img", { src: steam_png_1.default, width: "25px", alt: "", key: "type" })));
        default:
            return (react_1.default.createElement(antd_1.Tooltip, { title: "This is a local mod" },
                react_1.default.createElement("img", { src: local_png_1.default, width: "25px", alt: "", key: "type" })));
    }
}
class MainCollectionComponent extends react_1.Component {
    componentDidMount() {
        this.setState({});
    }
    render() {
        const { collection, rows, filteredRows } = this.props;
        // <img src={cellData} height="50px" width="50px" />
        // <div>
        /*
        {cellData === ModType.WORKSHOP
            ? steam
            : cellData === ModType.TTQMM
            ? ttmm
            : local}
            */
        const { setEnabledModsCallback, setEnabledCallback, setDisabledCallback } = this.props;
        // eslint-disable-next-line @typescript-eslint/ban-types
        const rowSelection = {
            selections: [antd_1.Table.SELECTION_INVERT],
            selectedRowKeys: collection.mods,
            onChange: (selectedRowKeys) => {
                Api_1.api.logger.info(`changing selecton: ${selectedRowKeys}`);
                const currentVisible = new Set(filteredRows.map((modData) => modData.id));
                const newSelection = rows
                    .map((modData) => modData.id)
                    .filter((mod) => {
                    return !currentVisible.has(mod) || selectedRowKeys.includes(mod);
                });
                setEnabledModsCallback(new Set(newSelection));
            },
            onSelect: (record, selected) => {
                Api_1.api.logger.info(`selecting ${record.id}: ${selected}`);
                if (selected) {
                    if (!collection.mods.includes(record.id)) {
                        collection.mods.push(record.id);
                    }
                    setEnabledCallback(record.id);
                }
                else {
                    setDisabledCallback(record.id);
                }
            },
            onSelectAll: (selected) => {
                Api_1.api.logger.info(`selecting all: ${selected}`);
                const currentVisible = filteredRows.map((modData) => modData.id);
                const selectedMods = new Set(collection.mods);
                currentVisible.forEach((mod) => {
                    if (selected) {
                        selectedMods.add(mod);
                    }
                    else {
                        selectedMods.delete(mod);
                    }
                });
                setEnabledModsCallback(selectedMods);
            },
            onSelectInvert: () => {
                Api_1.api.logger.info(`inverting selection`);
                const currentVisible = filteredRows.map((modData) => modData.id);
                const selected = new Set(collection.mods);
                currentVisible.forEach((mod) => {
                    if (!selected.has(mod)) {
                        selected.add(mod);
                    }
                    else {
                        selected.delete(mod);
                    }
                });
                setEnabledModsCallback(selected);
            },
            onSelectNone: () => {
                Api_1.api.logger.info(`clearing selection`);
                const currentVisible = filteredRows.map((modData) => modData.id);
                const selected = new Set(collection.mods);
                currentVisible.forEach((mod) => {
                    selected.delete(mod);
                });
                setEnabledModsCallback(selected);
            }
        };
        const expandable = {
            // eslint-disable-next-line @typescript-eslint/ban-types
            expandedRowRender: (record) => (0, html_react_parser_1.default)(record.description),
            // eslint-disable-next-line @typescript-eslint/ban-types
            rowExpandable: (record) => {
                const { description } = record;
                return !!description && description.length > 0;
            }
        };
        // eslint-disable-next-line @typescript-eslint/ban-types
        const columns = [
            {
                title: 'Type',
                dataIndex: 'type',
                render: (type) => getImageSrcFromType(type),
                width: 65,
                align: 'center'
            },
            {
                title: 'Preview',
                dataIndex: 'preview',
                render: (imgPath) => {
                    if (imgPath) {
                        return react_1.default.createElement(antd_1.Image, { width: 60, src: imgPath, key: "preview" });
                    }
                    return react_1.default.createElement(icons_1.FileImageOutlined, { style: { fontSize: '40px', color: '#08c' } });
                },
                width: 85,
                align: 'center'
            },
            {
                key: 'dependency',
                // eslint-disable-next-line @typescript-eslint/ban-types
                render: (_, record) => {
                    const modData = record;
                    const isDependency = !!modData.isDependencyFor;
                    const hasDependencies = !!modData.dependsOn;
                    const hasCode = !!modData.hasCode;
                    return (react_1.default.createElement(antd_1.Space, null,
                        isDependency ? (react_1.default.createElement(antd_1.Tooltip, { title: "This mod is a dependency for another mod" },
                            react_1.default.createElement(icons_1.ShareAltOutlined, null))) : (react_1.default.createElement(react_1.default.Fragment, null, " ")),
                        hasDependencies ? (react_1.default.createElement(antd_1.Tooltip, { title: "This depends on another mod" },
                            react_1.default.createElement(icons_1.DeploymentUnitOutlined, null))) : (react_1.default.createElement(react_1.default.Fragment, null, " ")),
                        hasCode ? (react_1.default.createElement(antd_1.Tooltip, { title: "This mod has code" },
                            react_1.default.createElement(icons_1.CodeOutlined, null))) : (react_1.default.createElement(react_1.default.Fragment, null, " "))));
                },
                width: 75
            },
            {
                title: 'Name',
                dataIndex: 'name',
                defaultSortOrder: 'ascend',
                sorter: (a, b) => (a.name > b.name ? 1 : -1)
            },
            {
                title: 'Tags',
                dataIndex: 'tags',
                // eslint-disable-next-line @typescript-eslint/ban-types
                render: (tags, record) => {
                    return [...(tags || []), record.type].map((tag) => {
                        return (react_1.default.createElement(antd_1.Tag, { color: "blue", key: tag }, tag));
                    });
                }
            },
            {
                title: 'Author',
                dataIndex: 'author',
                width: 150,
                defaultSortOrder: 'ascend',
                sorter: (a, b) => {
                    const v1 = a;
                    const v2 = b;
                    if (v1.author) {
                        if (v2.author) {
                            return v1.author > v2.author ? 1 : -1;
                        }
                        return 1;
                    }
                    return -1;
                }
            }
        ];
        return (
        // eslint-disable-next-line react/destructuring-assignment
        react_1.default.createElement(antd_1.Layout, { style: { width: this.props.width, height: this.props.height } },
            react_1.default.createElement(Content, { key: "main table", style: { padding: '0px', overflowY: 'auto', scrollbarWidth: 'none' } },
                react_1.default.createElement(antd_1.Table, { dataSource: filteredRows, pagination: false, rowKey: "id", rowSelection: rowSelection, expandable: expandable, columns: columns, sticky: true, tableLayout: "fixed" }))));
    }
}
exports.default = MainCollectionComponent;
//# sourceMappingURL=MainCollectionComponent.js.map