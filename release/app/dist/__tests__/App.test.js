"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
require("@testing-library/jest-dom");
const react_2 = require("@testing-library/react");
const App_1 = __importDefault(require("../renderer/App"));
describe('App', () => {
    it('should render', () => {
        expect((0, react_2.render)(react_1.default.createElement(App_1.default, null))).toBeTruthy();
    });
});
//# sourceMappingURL=App.test.js.map