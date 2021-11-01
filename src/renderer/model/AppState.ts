import { AppConfig } from './AppConfig';
import { Mod } from './Mod';
import { ModCollection } from './ModCollection';

export interface AppState {
	config?: AppConfig;
	mods?: Map<string, Mod>;
	allCollections?: Map<string, ModCollection>;
	allCollectionNames?: Set<string>;
	activeCollection?: ModCollection | null;
	remoteMod?: string;
}
