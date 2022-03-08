import { AppConfig } from './AppConfig';
import { Mod } from './Mod';
import { ModCollection } from './ModCollection';

export interface AppState {
	config: AppConfig;
	userDataPath: string;
	mods: Map<string, Mod>;
	allCollections: Map<string, ModCollection>;
	allCollectionNames: Set<string>;
	activeCollection?: ModCollection;
	firstModLoad?: boolean;
	targetPathAfterLoad: string;
	sidebarCollapsed: boolean;
	searchString: string;
	launchingGame?: boolean;

	// General initialization
	initializedConfigs?: boolean;	// Did we go load configs yet?
	initializedMods?: boolean;	// Did we go load mods yet?
	updateState: (props: any, callback?: () => void) => void;
	navigate: (path: string) => void;

	// Settings
	savingConfig: boolean;
	madeConfigEdits?: boolean;
	configErrors: { [field: string]: string };

	// Config loading
}
