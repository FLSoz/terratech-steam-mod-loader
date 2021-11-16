import { AppConfig } from './AppConfig';
import { Mod } from './Mod';
import { ModCollection } from './ModCollection';

export interface AppState {
	config: AppConfig;
	userDataPath: string;
	mods: Map<string, Mod>;
	allCollections?: Map<string, ModCollection>;
	allCollectionNames?: Set<string>;
	activeCollection?: ModCollection | null;
	firstModLoad?: boolean;
	targetPathAfterLoad: string;
	sidebarCollapsed?: boolean;
}
