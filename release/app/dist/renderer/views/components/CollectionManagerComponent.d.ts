import { Component } from 'react';
import { Mod, ModData } from 'renderer/model/Mod';
import { CollectionViewState } from 'renderer/model/AppState';
import { ModCollection, ModCollectionProps, ModErrors } from 'renderer/model/ModCollection';
import { CancellablePromiseManager } from 'renderer/util/Promise';
interface CollectionManagerState {
    promiseManager: CancellablePromiseManager;
    savingCollection?: boolean;
    launchGameWithErrors?: boolean;
    gameRunning?: boolean;
    acknowledgedEmptyModlist?: boolean;
    validatingMods?: boolean;
    validatedMods?: number;
    modErrors?: ModErrors;
    modalActive?: boolean;
    overrideGameRunning?: boolean;
    rows: ModData[];
    filteredRows?: ModData[];
    madeEdits: boolean;
}
interface CollectionManagerProps {
    appState: CollectionViewState;
    collectionComponent?: (props: ModCollectionProps) => Component<ModCollectionProps, unknown>;
    setLaunchingGame: (launching: boolean) => void;
    refreshModsCallback: () => void;
}
export default class CollectionManagerComponent extends Component<CollectionManagerProps, CollectionManagerState> {
    constructor(props: CollectionManagerProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    handleSelectAllClick(event: any): void;
    handleClick(checked: boolean, id: string): void;
    setGameRunningCallback(running: boolean): void;
    createNewCollection(name: string): void;
    duplicateCollection(name: string): void;
    renameCollection(name: string): void;
    deleteCollection(): void;
    pollGameRunning(): void;
    addCollection(name: string): void;
    saveCollection(collection: ModCollection, pureSave: boolean): void;
    baseLaunchGame(mods: Mod[]): void;
    launchGame(): void;
    validateActiveCollection(launchIfValid: boolean): void;
    renderModal(): JSX.Element | null;
    renderContent(): JSX.Element;
    render(): JSX.Element;
}
export {};
//# sourceMappingURL=CollectionManagerComponent.d.ts.map