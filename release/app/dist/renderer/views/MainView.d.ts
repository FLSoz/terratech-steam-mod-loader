import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router';
import { CollectionViewState } from 'renderer/model/AppState';
declare class MainView extends Component<RouteComponentProps, CollectionViewState> {
    constructor(props: RouteComponentProps);
    refreshMods(): void;
    render(): JSX.Element;
}
declare const _default: React.ComponentClass<Pick<RouteComponentProps<{}, import("react-router").StaticContext, unknown>, never>, any> & import("react-router").WithRouterStatics<typeof MainView>;
export default _default;
//# sourceMappingURL=MainView.d.ts.map