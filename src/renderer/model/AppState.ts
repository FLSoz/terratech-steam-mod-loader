import { AppConfig } from './AppConfig';
import { ModCollection } from './ModCollection';

export interface AppState {
	config?: AppConfig;
	allCollections?: Map<string, ModCollection>;
	allCollectionNames?: Set<string>;
	activeCollection?: ModCollection | null;
	remoteMod?: string;
	loadingConfig?: boolean;
	editingConfig?: boolean;
	savingConfig?: boolean;
	loadingMods?: boolean;
	loadingCollectionNames?: boolean;
	loadingCollection?: boolean;
	renamingCollection?: boolean;
	savingCollection?: boolean;
	launchingGame?: boolean;
	gameRunning?: boolean;
	acknowledgedEmptyModlist?: boolean;
}
