import { AppConfig } from './AppConfig';
import { ModCollection } from './ModCollection';
import { SessionMods } from './SessionMods';

export interface AppState {
	config: AppConfig;
	userDataPath: string;
	mods: SessionMods;
	workshopToModID: Map<bigint, string>;
	allCollections: Map<string, ModCollection>;
	allCollectionNames: Set<string>;
	activeCollection?: ModCollection;
	firstModLoad?: boolean;
	sidebarCollapsed: boolean;
	searchString: string;
	launchingGame?: boolean;

	// General initialization
	initializedConfigs?: boolean; // Did we go load configs yet?
	initializedMods?: boolean; // Did we go load mods yet?
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	updateState: (props: any, callback?: () => void) => void;
	navigate: (path: string) => void;

	// Settings
	savingConfig: boolean;
	madeConfigEdits?: boolean;
	configErrors: { [field: string]: string };

	//
	loadingMods?: boolean;
}
