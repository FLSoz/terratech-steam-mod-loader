import { Component } from 'react';
import { AppState } from 'renderer/model/AppState';
declare enum CollectionManagementToolbarModalType {
    NEW_COLLECTION = "new-collection",
    DUPLICATE_COLLECTION = "duplicate-collection",
    RENAME_COLLECTION = "rename-collection"
}
interface CollectionManagementToolbarState extends AppState {
    modalType?: CollectionManagementToolbarModalType;
    modalText: string;
}
interface CollectionManagementToolbarProps {
    madeEdits: boolean;
    searchString: string;
    appState: AppState;
    savingCollection?: boolean;
    validatingCollection?: boolean;
    numResults?: number;
    onSearchCallback: (search: string) => void;
    onSearchChangeCallback: (search: string) => void;
    saveCollectionCallback: () => void;
    validateCollectionCallback: () => void;
    changeActiveCollectionCallback: (name: string) => void;
    newCollectionCallback: (name: string) => void;
    duplicateCollectionCallback: (name: string) => void;
    deleteCollectionCallback: () => void;
    renameCollectionCallback: (name: string) => void;
}
interface CollectionManagementToolbarModalProps {
    title: string;
    okText: string;
    callback: (name: string) => void;
}
export default class CollectionManagementToolbarComponent extends Component<CollectionManagementToolbarProps, CollectionManagementToolbarState> {
    modalProps: Record<CollectionManagementToolbarModalType, CollectionManagementToolbarModalProps>;
    constructor(props: CollectionManagementToolbarProps);
    componentDidMount(): void;
    setStateCallback(update: AppState): void;
    disabledFeatures(): boolean;
    opInProgress(): boolean | undefined;
    renderModal(): JSX.Element | null;
    render(): JSX.Element;
}
export {};
//# sourceMappingURL=CollectionManagementToolbar.d.ts.map