import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router';
import { AppConfig } from 'renderer/model/AppConfig';
import { Mod } from 'renderer/model/Mod';
import { AppState } from 'renderer/model/AppState';
interface ModLoadingState {
    config: AppConfig;
    appState: AppState;
    loadingMods: boolean;
    countedWorkshopMods: boolean;
    countedLocalMods: boolean;
    countedTTQMMMods: boolean;
    workshopModPaths: string[];
    localModPaths: string[];
    ttqmmModPaths: string[];
    loadedMods: number;
    totalMods: number;
}
declare class ModLoadingView extends Component<RouteComponentProps, ModLoadingState> {
    CONFIG_PATH: string | undefined;
    constructor(props: RouteComponentProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    setStateCallback(update: AppState): void;
    loadModCallback(mod: Mod | null): void;
    addModPathsCallback(paths: string[], type: string): void;
    conditionalLoadMods(): void;
    loadMods(): void;
    goToMain(): void;
    render(): JSX.Element;
}
declare const _default: React.ComponentClass<Pick<RouteComponentProps<{}, import("react-router").StaticContext, unknown>, never>, any> & import("react-router").WithRouterStatics<typeof ModLoadingView>;
export default _default;
//# sourceMappingURL=ModLoadingView.d.ts.map