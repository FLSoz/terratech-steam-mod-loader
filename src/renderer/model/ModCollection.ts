import { Mod } from './Mod';

export interface ModCollection {
	name: string;
	description?: string;
	mods: Mod[];
}
