import { Component } from 'react';
import { RouteComponentProps } from 'react-router';
import { AppState } from 'renderer/model/AppState';
interface MenuState {
    currentTab: string;
}
interface MenuProps extends RouteComponentProps {
    disableNavigation?: boolean;
    currentTab: string;
    appState: AppState;
}
export default class MenuBar extends Component<MenuProps, MenuState> {
    CONFIG_PATH: string | undefined;
    constructor(props: MenuProps);
    render(): JSX.Element;
}
export {};
//# sourceMappingURL=MenuBar.d.ts.map