import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router';
import { AppState } from 'renderer/model/AppState';
interface TTQMMBrowserState extends AppState {
    sidebarCollapsed?: boolean;
}
declare class TTQMMBrowserView extends Component<RouteComponentProps, TTQMMBrowserState> {
    CONFIG_PATH: string | undefined;
    constructor(props: RouteComponentProps);
    componentDidMount(): void;
    setStateCallback(update: AppState): void;
    render(): JSX.Element;
}
declare const _default: React.ComponentClass<Pick<RouteComponentProps<{}, import("react-router").StaticContext, unknown>, never>, any> & import("react-router").WithRouterStatics<typeof TTQMMBrowserView>;
export default _default;
//# sourceMappingURL=TTQMMBrowser.d.ts.map