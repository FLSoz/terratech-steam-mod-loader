import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router';
import { AppState } from 'renderer/model/AppState';
interface SteamBrowserState extends AppState {
    sidebarCollapsed?: boolean;
}
declare class SteamBrowserView extends Component<RouteComponentProps, SteamBrowserState> {
    CONFIG_PATH: string | undefined;
    constructor(props: RouteComponentProps);
    componentDidMount(): void;
    render(): JSX.Element;
}
declare const _default: React.ComponentClass<Pick<RouteComponentProps<{}, import("react-router").StaticContext, unknown>, never>, any> & import("react-router").WithRouterStatics<typeof SteamBrowserView>;
export default _default;
//# sourceMappingURL=SteamBrowser.d.ts.map