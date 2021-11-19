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
const react_router_1 = require("react-router");
const Api_1 = require("renderer/model/Api");
const AppConfig_1 = require("renderer/model/AppConfig");
const Validation_1 = require("renderer/util/Validation");
const antd_1 = require("antd");
const { Footer, Content } = antd_1.Layout;
class ConfigLoadingView extends react_1.Component {
    constructor(props) {
        super(props);
        this.CONFIG_PATH = undefined;
        this.state = {
            config: AppConfig_1.DEFAULT_CONFIG,
            loadingConfig: true,
            userDataPath: '',
            savingConfig: false,
            targetPathAfterLoad: '/main',
            totalCollections: -1,
            loadedCollections: 0,
            allCollections: new Map(),
            allCollectionNames: new Set(),
            mods: new Map(),
            updatingSteamMod: true,
            activeCollection: {
                name: 'default',
                mods: []
            },
            searchString: '',
            sidebarCollapsed: true
        };
        this.loadCollectionCallback = this.loadCollectionCallback.bind(this);
    }
    componentDidMount() {
        Api_1.api.on(Api_1.ValidChannel.COLLECTION_RESULTS, this.loadCollectionCallback);
        this.readUserDataPath();
        this.readConfig();
        this.loadCollections();
        this.updateSteamMod();
    }
    componentWillUnmount() {
        Api_1.api.removeAllListeners(Api_1.ValidChannel.COLLECTION_RESULTS);
    }
    setStateCallback(update) {
        this.setState(update);
    }
    readConfig() {
        // Attempt to load config. We allow app to proceed if it fails, but we show a warning
        Api_1.api
            .readConfig()
            .then((response) => {
            if (response) {
                const config = response;
                this.setState({ config });
                this.validateConfig(config);
            }
            else {
                Api_1.api.logger.info('No config present - using default config');
                this.validateConfig(AppConfig_1.DEFAULT_CONFIG);
            }
            return null;
        })
            .catch((error) => {
            console.error(error);
            this.setState({ configLoadError: error.toString() });
            this.validateConfig(AppConfig_1.DEFAULT_CONFIG);
        });
    }
    readUserDataPath() {
        // Get user data path or die trying
        Api_1.api
            .getUserDataPath()
            .then((path) => {
            this.setState({ userDataPath: path });
            return path;
        })
            .catch((error) => {
            console.error(error);
            this.setState({ userDataPathError: error.toString() });
        });
    }
    updateSteamMod() {
        this.setState({ updatingSteamMod: false }, this.checkCanProceed);
    }
    loadCollections() {
        // Attempt to load collections. We allow app to proceed if it fails
        Api_1.api
            .readCollectionsList()
            .then((collections) => {
            if (collections && collections.length > 0) {
                this.setState({ totalCollections: collections.length });
                collections.forEach((collection) => Api_1.api.readCollection(collection));
            }
            else {
                this.setState({ totalCollections: 0 });
            }
            return null;
        })
            .catch((error) => {
            console.error(error);
            throw error;
        });
    }
    loadCollectionCallback(collection) {
        const { allCollections, allCollectionNames, loadedCollections } = this.state;
        if (collection) {
            allCollections.set(collection.name, collection);
            allCollectionNames.add(collection.name);
        }
        this.setState({ loadedCollections: loadedCollections + 1 }, this.checkCanProceed);
    }
    validateConfig(config) {
        this.setState({ configErrors: undefined });
        (0, Validation_1.validateAppConfig)(config)
            .then((result) => {
            this.setState({ configErrors: result });
            return result;
        })
            .catch((error) => {
            console.error(error);
            this.setState({ configErrors: { undefined: `Internal exception while validating AppConfig:\n${error.toString()}` } });
        })
            .finally(() => {
            this.setState({ loadingConfig: false }, this.checkCanProceed);
        });
    }
    proceedToNext() {
        const { configErrors } = this.state;
        const { history } = this.props;
        if (configErrors) {
            // We have an invalid configuration - go to Settings tab for enhanced validation logic
            history.push('/settings', this.state);
        }
        else {
            history.push('/mods', this.state);
        }
    }
    checkCanProceed() {
        const { activeCollection, loadedCollections, loadingConfig, totalCollections, updatingSteamMod, config, allCollections, allCollectionNames } = this.state;
        if (!updatingSteamMod && totalCollections >= 0 && loadedCollections >= totalCollections && !loadingConfig) {
            console.log('hello world');
            if (allCollectionNames.size > 0) {
                // We always override activeCollection with something
                if (config && config.activeCollection) {
                    const collection = allCollections.get(config.activeCollection);
                    if (collection) {
                        this.setState({ activeCollection: collection }, this.proceedToNext);
                    }
                    else {
                        // activeCollection is no longer there: default to first available in ASCII-betical order
                    }
                }
                const collectionName = [...allCollectionNames].sort()[0];
                config.activeCollection = collectionName;
                this.setState({ activeCollection: allCollections.get(collectionName) }, this.proceedToNext);
            }
            else {
                // activeCollection has already been set to default. Add to maps
                config.activeCollection = 'default';
                allCollectionNames.add('default');
                allCollections.set('default', activeCollection);
                this.setState({}, this.proceedToNext);
            }
        }
    }
    render() {
        const { loadedCollections, totalCollections } = this.state;
        const percent = totalCollections > 0 ? Math.ceil((100 * loadedCollections) / totalCollections) : 100;
        return (react_1.default.createElement(antd_1.Layout, { style: { minHeight: '100vh', minWidth: '100vw' } },
            react_1.default.createElement(Content, null),
            react_1.default.createElement(Footer, null,
                react_1.default.createElement(antd_1.Progress, { strokeColor: {
                        from: '#108ee9',
                        to: '#87d068'
                    }, percent: percent }))));
    }
}
exports.default = (0, react_router_1.withRouter)(ConfigLoadingView);
//# sourceMappingURL=ConfigLoadingView.js.map