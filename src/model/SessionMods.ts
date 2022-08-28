import { ElectronLog } from 'electron-log';
import { ModData, ModDescriptor, ModType, getModDataId, ModDataOverride } from './Mod';
import { ModCollection } from './ModCollection';
import { CollectionErrors, ModErrors } from './CollectionValidation';
import { getCorpType } from './Corp';

export class SessionMods {
	localPath?: string;

	foundMods: ModData[];

	modIdToModDataMap: Map<string, ModData>;

	modIdToModDescriptor: Map<string, ModDescriptor>;

	workshopIdToModDescriptor: Map<bigint, ModDescriptor>;

	constructor(localPath: string | undefined, foundMods: ModData[]) {
		this.localPath = localPath;
		this.modIdToModDataMap = new Map();
		this.modIdToModDescriptor = new Map();
		this.workshopIdToModDescriptor = new Map();
		this.foundMods = foundMods;
	}
}

export function getDescriptor(session: SessionMods, mod: ModData): ModDescriptor | undefined {
	let myDescriptor: ModDescriptor | undefined;
	const id = getModDataId(mod);
	if (id) {
		myDescriptor = session.modIdToModDescriptor.get(id);
	}
	if (!myDescriptor && mod.workshopID) {
		myDescriptor = session.workshopIdToModDescriptor.get(mod.workshopID);
	}
	return myDescriptor;
}

// This exists because IPC communication means objects must be deserialized from main to renderer
// This means that object refs are not carried over, and so relying on it as a unique ID will fail
export function setupDescriptors(session: SessionMods, overrides: Map<string, ModDataOverride>) {
	const { foundMods, modIdToModDataMap, modIdToModDescriptor, workshopIdToModDescriptor } = session;
	modIdToModDescriptor.clear();
	workshopIdToModDescriptor.clear();
	// Setup ModDescriptors and other maps
	foundMods.forEach((mod: ModData) => {
		const modOverrides = overrides.get(mod.uid);
		if (modOverrides) {
			mod.overrides = modOverrides;
		}

		modIdToModDataMap.set(mod.uid, mod);
		// Create mod descriptors using workshop mods as first pass
		if (mod.type === ModType.WORKSHOP && mod.workshopID) {
			const { workshopID } = mod;
			let descriptor: ModDescriptor | undefined;
			const id = getModDataId(mod);
			if (id) {
				descriptor = modIdToModDescriptor.get(id);
			}
			if (!descriptor) {
				descriptor = {
					UIDs: new Set()
				};
				if (id) {
					descriptor.modID = id;
				}
			}

			if (!descriptor.name && mod.name) {
				descriptor.name = mod.name;
			}

			descriptor.UIDs.add(mod.uid);
			workshopIdToModDescriptor.set(workshopID, descriptor);
			if (id) {
				modIdToModDescriptor.set(id, descriptor);
			}
		}
	});
	// Fill in mod descriptors for local mods
	foundMods.forEach((mod: ModData) => {
		if (mod.type !== ModType.WORKSHOP) {
			const id = getModDataId(mod);
			if (id) {
				if (!modIdToModDataMap.get(mod.uid)) {
					// Don't expect this to ever happen
					const descriptor: ModDescriptor = {
						modID: id,
						UIDs: new Set(),
						name: mod.name
					};
					descriptor.UIDs.add(mod.uid);
					modIdToModDescriptor.set(id, descriptor);
				} else {
					let descriptor: ModDescriptor | undefined = modIdToModDescriptor.get(id);
					if (!descriptor) {
						descriptor = {
							UIDs: new Set()
						};
						descriptor.modID = id;
						modIdToModDescriptor.set(id, descriptor);
					}
					descriptor.UIDs.add(mod.uid);
				}
			}
		}
	});

	// Setup dependency data
	const dependenciesMap: Map<ModDescriptor, Set<ModDescriptor>> = new Map();
	foundMods.forEach((mod: ModData) => {
		const myDescriptor = getDescriptor(session, mod);
		if (myDescriptor) {
			const dependencies: Set<ModDescriptor> = new Set();
			mod.steamDependencies?.forEach((workshopID) => {
				const descriptor = workshopIdToModDescriptor.get(workshopID);
				if (descriptor) {
					dependencies.add(descriptor);
				}
			});
			mod.explicitIDDependencies?.forEach((modID) => {
				const descriptor = modIdToModDescriptor.get(modID);
				if (descriptor) {
					dependencies.add(descriptor);
				}
			});
			if (dependencies.size > 0) {
				mod.dependsOn = [...dependencies];
				dependencies.forEach((dependency: ModDescriptor) => {
					let reliers = dependenciesMap.get(dependency);
					if (reliers) {
						reliers.add(myDescriptor!);
					} else {
						reliers = new Set();
						reliers.add(myDescriptor!);
						dependenciesMap.set(dependency, reliers);
					}
				});
			}
		}
	});
	foundMods.forEach((mod: ModData) => {
		const myDescriptor = getDescriptor(session, mod);
		if (myDescriptor) {
			const reliers = dependenciesMap.get(myDescriptor);
			if (reliers) {
				mod.isDependencyFor = [...reliers];
			}
		}
	});
}

export function getByUID(session: SessionMods, uid: string) {
	return session.modIdToModDataMap.get(uid);
}

export function getByWorkshopID(session: SessionMods, workshopID: bigint) {
	return session.modIdToModDataMap.get(`${ModType.WORKSHOP}:${workshopID}`);
}

export function getRows(session: SessionMods): ModData[] {
	return [...session.modIdToModDataMap.values()];
}

export function filterRows(session: SessionMods, searchString: string | undefined): ModData[] {
	if (searchString && searchString.length > 0) {
		const lowerSearchString = searchString.toLowerCase();
		return getRows(session).filter((modData) => {
			if (modData.name?.toLowerCase().includes(lowerSearchString)) {
				return true;
			}
			if (modData.type.toLowerCase().includes(lowerSearchString)) {
				return true;
			}
			if (
				modData.authors?.reduce((acc: boolean, tag: string) => {
					if (acc) {
						return true;
					}
					return tag.toLowerCase().includes(lowerSearchString);
				}, false)
			) {
				return true;
			}
			return [...(modData.tags || []), ...(modData.overrides?.tags || [])].reduce((acc: boolean, tag: string) => {
				if (acc) {
					return true;
				}
				if (tag.toLowerCase().includes(lowerSearchString)) {
					return true;
				} else {
					const corp = getCorpType(tag);
					if (corp !== null) {
						return corp.toString().toLowerCase().includes(lowerSearchString);
					}
				}
				return false;
			}, false);
		});
	}
	return getRows(session);
}

export function validateMod(session: SessionMods, modData: ModData, logger?: ElectronLog): ModErrors {
	logger?.debug(`validating ${modData.name}`);
	const thisModErrors: ModErrors = {};

	const id = getModDataId(modData);
	if ((!id || id.length <= 0) && !modData.workshopID) {
		// we couldn't find any info on this mod - should never reach here
	}

	// Check subscription
	if (modData.type === ModType.WORKSHOP) {
		if (!modData.subscribed) {
			thisModErrors.notSubscribed = true;
		}
		if (modData.needsUpdate) {
			thisModErrors.needsUpdate = true;
		}
		if (!modData.installed) {
			thisModErrors.notInstalled = true;
		}
	}
	return thisModErrors;
}

export function validateCollection(session: SessionMods, collection: ModCollection, logger?: ElectronLog): Promise<CollectionErrors> {
	return new Promise<CollectionErrors>((resolve, reject) => {
		try {
			const errors: CollectionErrors = {};

			const descriptorToActiveMap: Map<ModDescriptor, string[]> = new Map();
			const presentDescriptorsList = collection.mods.map((uid) => {
				const modData = session.modIdToModDataMap.get(uid);
				if (modData) {
					const descriptor = getDescriptor(session, modData);
					if (descriptor) {
						const existingList = descriptorToActiveMap.get(descriptor);
						if (existingList) {
							existingList.push(modData.uid);
						} else {
							descriptorToActiveMap.set(descriptor, [modData.uid]);
						}
					}
					return {
						descriptor,
						modData
					};
				}
				return undefined;
			});
			const presentDescriptors: Set<ModDescriptor> = new Set(descriptorToActiveMap.keys());
			presentDescriptorsList.forEach((wrappedDescriptor, i: number) => {
				if (wrappedDescriptor) {
					const { modData, descriptor } = wrappedDescriptor;
					const modErrors: ModErrors = validateMod(session, modData, logger);

					if (descriptor) {
						// incompatibilities
						const activeForDescriptor = descriptorToActiveMap.get(descriptor)!;
						if (activeForDescriptor.length > 1) {
							modErrors.incompatibleMods = activeForDescriptor.filter((uid) => uid !== modData.uid);
						}
						// dependencies
						const dependencies = modData.dependsOn;
						if (dependencies) {
							const missingDependencies = dependencies.filter((dependency) => {
								return !presentDescriptors.has(dependency);
							});
							if (missingDependencies.length > 0) {
								modErrors.missingDependencies = missingDependencies;
							}
						}
					}

					if (Object.keys(modErrors).length > 0) {
						errors[modData.uid] = modErrors;
					}
				} else {
					errors[collection.mods[i]] = {
						invalidId: true
					};
				}
			});

			resolve(errors);
		} catch (error) {
			logger?.error('Failed to perform collection validation');
			logger?.error(error);
			reject(error);
		}
	});
}
