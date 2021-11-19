import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router';
import { AppConfig } from 'renderer/model/AppConfig';
import { ModCollection } from 'renderer/model/ModCollection';
import { AppState } from 'renderer/model/AppState';
interface ConfigLoadingState extends AppState {
    loadingConfig?: boolean;
    savingConfig?: boolean;
    userDataPathError?: string;
    configLoadError?: string;
    configErrors?: {
        [field: string]: string;
    };
    loadedCollections: number;
    totalCollections: number;
    updatingSteamMod: boolean;
}
declare class ConfigLoadingView extends Component<RouteComponentProps, ConfigLoadingState> {
    CONFIG_PATH: string | undefined;
    constructor(props: RouteComponentProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    setStateCallback(update: AppState): void;
    readConfig(): void;
    readUserDataPath(): void;
    updateSteamMod(): void;
    loadCollections(): void;
    loadCollectionCallback(collection: ModCollection | null): void;
    validateConfig(config: AppConfig): void;
    proceedToNext(): void;
    checkCanProceed(): void;
    render(): JSX.Element;
}
declare const _default: React.ComponentClass<Pick<RouteComponentProps<{}, import("react-router").StaticContext, unknown>, never>, any> & import("react-router").WithRouterStatics<typeof ConfigLoadingView>;
export default _default;
//# sourceMappingURL=ConfigLoadingView.d.ts.map