import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router';
import { AppState } from 'renderer/model/AppState';
interface ModErrors {
    [id: number]: string;
}
interface RawModlistState extends AppState {
    readingLast?: boolean;
    validatingMods?: boolean;
    validatedMods?: number;
    launchingGame?: boolean;
    launchGameWithErrors?: boolean;
    gameRunning?: boolean;
    modalActive?: boolean;
    sidebarCollapsed?: boolean;
    text?: string;
    modErrors?: ModErrors;
}
declare class RawModlistView extends Component<RouteComponentProps, RawModlistState> {
    CONFIG_PATH: string | undefined;
    constructor(props: RouteComponentProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    setStateCallback(update: AppState): void;
    setGameRunningCallback(running: boolean): void;
    pollGameRunning(): void;
    baseLaunchGame(rawModList: string[]): void;
    launchGame(): void;
    validateFunctionAsync(modList: string[]): boolean;
    validateMods(launchIfValid: boolean): void;
    readConfig(): void;
    renderModal(): JSX.Element | null;
    render(): JSX.Element;
}
declare const _default: React.ComponentClass<Pick<RouteComponentProps<{}, import("react-router").StaticContext, unknown>, never>, any> & import("react-router").WithRouterStatics<typeof RawModlistView>;
export default _default;
//# sourceMappingURL=RawModlistView.d.ts.map