import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router';
import { AppState } from 'renderer/model/AppState';
import { AppConfig } from 'renderer/model/AppConfig';
import { FormInstance } from 'antd';
interface SettingsState extends AppState {
    editingConfig: AppConfig;
    savingConfig?: boolean;
    configErrors: {
        [field: string]: string;
    };
    madeEdits?: boolean;
}
declare class SettingsView extends Component<RouteComponentProps, SettingsState> {
    formRef: React.RefObject<FormInstance<any>>;
    constructor(props: RouteComponentProps);
    componentDidMount(): void;
    componentDidUpdate(): void;
    saveChanges(): void;
    cancelChanges(): void;
    validateFile(field: string, value: string): Promise<boolean>;
    render(): JSX.Element;
}
declare const _default: React.ComponentClass<Pick<RouteComponentProps<{}, import("react-router").StaticContext, unknown>, never>, any> & import("react-router").WithRouterStatics<typeof SettingsView>;
export default _default;
//# sourceMappingURL=SettingsView.d.ts.map