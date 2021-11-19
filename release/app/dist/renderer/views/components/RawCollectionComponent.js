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
/* eslint-disable @typescript-eslint/no-explicit-any */
const antd_1 = require("antd");
const react_1 = __importStar(require("react"));
const { Content } = antd_1.Layout;
class RawCollectionComponent extends react_1.Component {
    componentDidMount() {
        this.setState({});
    }
    render() {
        // const { collection, rows, filteredRows, setEnabledModsCallback, setEnabledCallback, setDisabledCallback } = this.props;
        // <img src={cellData} height="50px" width="50px" />
        // <div>
        /*
        {cellData === ModType.WORKSHOP
            ? steam
            : cellData === ModType.TTQMM
            ? ttmm
            : local}
            */
        return (
        // eslint-disable-next-line react/destructuring-assignment
        react_1.default.createElement(antd_1.Layout, { style: { width: this.props.width, height: this.props.height } },
            react_1.default.createElement(Content, { key: "main table", style: { padding: '0px', overflowY: 'auto', scrollbarWidth: 'none' } },
                react_1.default.createElement(antd_1.Skeleton, null))));
    }
}
exports.default = RawCollectionComponent;
//# sourceMappingURL=RawCollectionComponent.js.map