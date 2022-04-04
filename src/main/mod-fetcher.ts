import { IpcMainEvent } from 'electron';
import log from 'electron-log';
import fs, { Dirent } from 'fs';
import path from 'path';
import { Mutex } from 'async-mutex';

import { ModData, ModType, ProgressTypes, ValidChannel } from '../model';
import { isSuccessful } from '../util/Promise';

import Steamworks, {
	GetUserItemsProps,
	SteamPageResults,
	SteamUGCDetails,
	UGCItemState,
	UGCMatchingType,
	UserUGCList,
	UserUGCListSortOrder
} from './steamworks';

function chunk<Type>(arr: Type[], size: number): Type[][] {
	return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
}

function filterOutNullValues<T>(responses: PromiseSettledResult<T | null>[]): T[] {
	return responses
		.filter((result: PromiseSettledResult<T | null>) => {
			const success = isSuccessful(result);
			if (!success) {
				log.error('Failed to process some mod data:');
				log.error(result.reason);
				return false;
			}
			return !!result.value;
		})
		.map((result) => {
			const settledResult = result as PromiseFulfilledResult<T>;
			const { value } = settledResult;
			return value;
		});
}

const MAX_MODS_PER_PAGE = 50;

async function getSteamSubscribedPage(pageNum: number): Promise<SteamPageResults> {
	return new Promise((resolve, reject) => {
		const options: GetUserItemsProps = {
			options: {
				app_id: 285920,
				page_num: pageNum,
				required_tag: 'Mods'
			},
			ugc_matching_type: UGCMatchingType.ItemsReadyToUse,
			ugc_list: UserUGCList.Subscribed,
			ugc_list_sort_order: UserUGCListSortOrder.SubscriptionDateDesc,
			success_callback: (results: SteamPageResults) => {
				resolve(results);
			},
			error_callback: (err: Error) => {
				reject(err);
			}
		};
		Steamworks.ugcGetUserItems(options);
	});
}

export default class ModFetcher {
	localPath: string;

	knownWorkshopMods: Set<bigint>;

	event: IpcMainEvent;

	localMods: number;

	workshopMods: number;

	loadedMods: number;

	modCountMutex: Mutex;

	constructor(event: IpcMainEvent, localPath: string, knownWorkshopMods: bigint[]) {
		this.localPath = localPath;
		this.knownWorkshopMods = new Set();
		this.event = event;

		this.localMods = 0;
		this.workshopMods = 0;
		this.loadedMods = 0;
		this.modCountMutex = new Mutex();

		knownWorkshopMods.forEach((workshopid) => this.knownWorkshopMods.add(workshopid));
	}

	updateModLoadingProgress(size: number) {
		this.modCountMutex.runExclusive(() => {
			const current = this.loadedMods;
			this.loadedMods += size;
			const total = (this.localMods || 0) + (this.workshopMods || 0);
			this.event.reply(ValidChannel.PROGRESS_CHANGE, ProgressTypes.MOD_LOAD, (current + size) / total, 'Loading mod details');
		});
	}

	async getModDetailsFromPath(potentialMod: ModData, modPath: string, type: ModType): Promise<ModData | null> {
		log.info(`Reading mod metadata for ${modPath}`);
		return new Promise((resolve, reject) => {
			fs.readdir(modPath, { withFileTypes: true }, async (err, files) => {
				try {
					if (err) {
						log.error(`fs.readdir failed on path ${modPath}`);
						log.error(err);
						this.updateModLoadingProgress(1);
						reject(err);
					} else {
						let validModData = false;
						try {
							const stats = fs.statSync(modPath);
							potentialMod.lastUpdate = stats.mtime;
							if (!potentialMod.dateAdded) {
								potentialMod.dateAdded = stats.birthtime;
							}
						} catch (e) {
							log.error(`Failed to get file details for path ${modPath}`);
							log.error(e);
						}
						const fileSizes = files.map((file) => {
							let size = 0;
							if (file.isFile()) {
								try {
									const stats = fs.statSync(path.join(modPath, file.name));
									size = stats.size;
									if (!potentialMod.lastUpdate || stats.mtime > potentialMod.lastUpdate) {
										potentialMod.lastUpdate = stats.mtime;
									}
								} catch (e) {
									log.error(`Failed to get file details for ${file.name} under ${modPath}`);
								}
								if (file.name === 'preview.png') {
									potentialMod.preview = `image://${path.join(modPath, file.name)}`;
								} else if (file.name.match(/^(.*)\.dll$/)) {
									potentialMod.hasCode = true;
								} else if (file.name === 'ttsmm.json') {
									Object.assign(potentialMod, JSON.parse(fs.readFileSync(path.join(modPath, file.name), 'utf8')));
								} else {
									const matches = file.name.match(/^(.*)_bundle$/);
									if (matches && matches.length > 1) {
										// eslint-disable-next-line prefer-destructuring
										potentialMod.id = matches[1];
										if (type !== ModType.WORKSHOP) {
											potentialMod.uid = `${type}:${potentialMod.id}`;
										}
										if (!potentialMod.name) {
											// eslint-disable-next-line prefer-destructuring
											potentialMod.name = matches[1];
										}
										potentialMod.path = modPath;
										validModData = true;
									}
									log.debug(`Found file: ${file.name} under mod path ${modPath}`);
								}
							}
							return size;
						});

						// We are done, increment counter and return
						this.updateModLoadingProgress(1);
						if (validModData) {
							// log.debug(JSON.stringify(potentialMod, null, 2));
							potentialMod.size = fileSizes.reduce((acc: number, curr: number) => acc + curr, 0);
							resolve(potentialMod);
						} else {
							log.warn(`Marking potential mod at ${modPath} as invalid mod`);
							resolve(null);
						}
					}
				} catch (e) {
					log.error(`Failed to get local mod details at ${modPath}:`);
					log.error(e);
					this.updateModLoadingProgress(1);
					reject(e);
				}
			});
		});
	}

	async fetchLocalMods(localModDirs: string[]): Promise<ModData[]> {
		const modResponses = await Promise.allSettled<ModData | null>(
			localModDirs.map((subDir: string) => {
				const modPath = path.join(this.localPath, subDir);
				const potentialMod: ModData = {
					uid: `${ModType.LOCAL}:${subDir}`,
					id: null,
					type: ModType.LOCAL,
					hasCode: false,
					path: modPath
				};
				return this.getModDetailsFromPath(potentialMod, modPath, ModType.LOCAL);
			})
		);
		return filterOutNullValues(modResponses);
	}

	async getDetailsForWorkshopModList(workshopIDs: bigint[]): Promise<ModData[]> {
		return new Promise((resolve, reject) => {
			Steamworks.getUGCDetails(
				workshopIDs.map((workshopID) => workshopID.toString()),
				// eslint-disable-next-line consistent-return
				async (steamDetails: SteamUGCDetails[]) => {
					resolve(this.processSteamModResults(steamDetails));
				},
				(err: Error) => {
					log.error(`Failed to fetch mod details for workshop mods ${workshopIDs}`);
					log.error(err);
					reject(err);
				}
			);
		});
	}

	async processWorkshopModList(
		workshopMap: Map<bigint, ModData>,
		knownInvalidMods: Set<bigint>,
		modList: Set<bigint>
	): Promise<Set<bigint>> {
		const modChunks: bigint[][] = chunk([...modList], MAX_MODS_PER_PAGE);

		const modDependencies: Set<bigint> = new Set();

		// eslint-disable-next-line no-plusplus
		for (let i = 0; i < modChunks.length; i++) {
			try {
				// eslint-disable-next-line no-await-in-loop
				await this.getDetailsForWorkshopModList(modChunks[i])
					// eslint-disable-next-line promise/always-return
					.then((modDetails) => {
						modDetails.forEach((mod: ModData) => {
							const modid = mod.workshopID!;
							this.knownWorkshopMods.delete(modid);
							knownInvalidMods.delete(modid);
							workshopMap.set(modid!, mod);
						});

						// After this round has been added to the mod map, check if any items are missing
						modDetails.forEach((mod: ModData) => {
							if (mod.steamDependencies) {
								mod.steamDependencies
									.filter((dependency) => !workshopMap.has(dependency) && !knownInvalidMods.has(dependency))
									.forEach((missingDependency) => modDependencies.add(missingDependency));
							}
						});
					})
					.catch(() => {
						// error should already be logged
						this.updateModLoadingProgress(modChunks[i].length);
					});
			} catch (e) {
				log.error('Error processing chunk');
			}
		}

		return modDependencies;
	}

	async processSteamModResults(steamDetails: SteamUGCDetails[]): Promise<ModData[]> {
		const modResponses = await Promise.allSettled<ModData | null>(
			steamDetails.map(async (steamUGCDetails: SteamUGCDetails) => {
				const workshopid: bigint = steamUGCDetails.publishedFileId;
				const potentialMod: ModData = {
					uid: `${ModType.WORKSHOP}:${workshopid}`,
					id: null,
					type: ModType.WORKSHOP,
					workshopID: BigInt(workshopid),
					hasCode: false,
					path: ''
				};
				potentialMod.steamDependencies = steamUGCDetails.children;
				potentialMod.description = steamUGCDetails.description;
				potentialMod.name = steamUGCDetails.title;
				potentialMod.tags = steamUGCDetails.tagsDisplayNames;
				potentialMod.size = steamUGCDetails.fileSize;
				potentialMod.dateAdded = new Date(steamUGCDetails.timeAddedToUserList * 1000);
				potentialMod.dateCreated = new Date(steamUGCDetails.timeCreated * 1000);
				potentialMod.lastUpdate = new Date(steamUGCDetails.timeUpdated * 1000);

				const state: UGCItemState = Steamworks.ugcGetItemState(workshopid);
				if (state) {
					// eslint-disable-next-line no-bitwise
					potentialMod.subscribed = !!(state & UGCItemState.Subscribed);
					// eslint-disable-next-line no-bitwise
					potentialMod.installed = !!(state & UGCItemState.Installed);
					// eslint-disable-next-line no-bitwise
					potentialMod.downloadPending = !!(state & UGCItemState.DownloadPending);
					// eslint-disable-next-line no-bitwise
					potentialMod.downloading = !!(state & UGCItemState.Downloading);
					// eslint-disable-next-line no-bitwise
					potentialMod.needsUpdate = !!(state & UGCItemState.NeedsUpdate);
				}

				let validMod = true;
				try {
					if (Steamworks.requestUserInformation(steamUGCDetails.steamIDOwner, true)) {
						// eslint-disable-next-line no-await-in-loop
						await new Promise((resolve) => setTimeout(resolve, 5000)); // sleep until done (hopefully)
					}
					potentialMod.authors = [Steamworks.getFriendPersonaName(steamUGCDetails.steamIDOwner)];
				} catch (err) {
					console.error(`Failed to get username for Author ${steamUGCDetails.steamIDOwner}`);
					console.error(err);
					potentialMod.authors = [steamUGCDetails.steamIDOwner];
				}

				const installInfo = Steamworks.ugcGetItemInstallInfo(workshopid);
				if (installInfo) {
					// augment workshop mod with data
					potentialMod.lastUpdate = new Date(installInfo.timestamp * 1000);
					potentialMod.size = parseInt(installInfo.sizeOnDisk, 10);
					try {
						const modPath = installInfo.folder;
						// eslint-disable-next-line no-await-in-loop
						validMod = !!(await this.getModDetailsFromPath(potentialMod, modPath, ModType.WORKSHOP));
					} catch (error) {
						log.error(`Error parsing mod info for workshop:${workshopid}`);
						log.error(error);
					}
				} else {
					this.updateModLoadingProgress(1);
				}

				if (validMod) {
					log.debug(JSON.stringify(potentialMod, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
					return potentialMod;
				}
				log.warn(`${potentialMod.workshopID} is NOT a valid mod`);
				return null;
			})
		);
		return filterOutNullValues(modResponses);
	}

	async fetchWorkshopMods(): Promise<ModData[]> {
		let numProcessedWorkshop = 0;
		let pageNum = 1;
		let lastProcessed = 1;
		const workshopMap: Map<bigint, ModData> = new Map();

		const allSubscribedItems: bigint[] = Steamworks.getSubscribedItems();
		log.debug(`All subscribed items: [${allSubscribedItems}]`);

		// We make 2 assumptions:
		//	1. We are done if and only if reading a page returns 0 results
		//	2. The subscription list will not change mid-pull

		// eslint-disable-next-line promise/always-return
		while (lastProcessed > 0) {
			// eslint-disable-next-line no-await-in-loop
			const { items, totalItems, numReturned } = await getSteamSubscribedPage(pageNum);
			this.workshopMods = totalItems;
			this.loadedMods += numReturned;
			numProcessedWorkshop += numReturned;
			lastProcessed = numReturned;
			log.debug(`Total items: ${totalItems}, Returned by Steam: ${numReturned}, Processed this chunk: ${items.length}`);

			// eslint-disable-next-line no-await-in-loop
			const data: ModData[] = await this.processSteamModResults(items);
			data.forEach((modData) => {
				const workshopID: bigint = modData.workshopID!;
				workshopMap.set(workshopID, modData);
				this.knownWorkshopMods.delete(workshopID);
			});
			pageNum += 1;
		}
		// After this round has been added to the mod map, check if any items are missing
		[...workshopMap.values()].forEach((modData: ModData) => {
			if (modData.steamDependencies) {
				modData.steamDependencies
					.filter((dependency) => !workshopMap.has(dependency))
					.forEach((missingDependency) => this.knownWorkshopMods.add(missingDependency));
			}
		});

		// don't expect this to ever trigger
		if (workshopMap.size < numProcessedWorkshop) {
			log.error(`Was there an update mid-fetch? We didn't process the promised amount: ${workshopMap.size} vs ${numProcessedWorkshop}`);
		}

		// We've processed all subscribed workshop mods. Now process the known mods
		const knownInvalidMods: Set<bigint> = new Set();

		let missingKnownWorkshopMods = new Set(this.knownWorkshopMods);

		// continue to query steam until all dependencies are met via BFS search
		while (this.knownWorkshopMods.size > 0) {
			// eslint-disable-next-line no-await-in-loop
			missingKnownWorkshopMods = await this.processWorkshopModList(workshopMap, knownInvalidMods, missingKnownWorkshopMods);
			this.knownWorkshopMods.forEach((workshopID) => {
				knownInvalidMods.add(workshopID);
			});
			this.knownWorkshopMods.clear();
			this.knownWorkshopMods = missingKnownWorkshopMods;
		}

		return [...workshopMap.values()];
	}

	async fetchMods(): Promise<ModData[]> {
		// get local fist
		let localModDirs: string[] = [];
		try {
			localModDirs = fs
				.readdirSync(this.localPath, { withFileTypes: true })
				.filter((dirent) => dirent.isDirectory())
				.map((dirent) => dirent.name);
			this.localMods = localModDirs.length;
		} catch (e) {
			log.error(`Failed to read local mods in ${localModDirs}`);
		}

		const modResponses = await Promise.allSettled<ModData[]>([this.fetchLocalMods(localModDirs), this.fetchWorkshopMods()]);
		const allMods: ModData[] = filterOutNullValues(modResponses).flat();

		// We are done
		this.event.reply(ValidChannel.PROGRESS_CHANGE, ProgressTypes.MOD_LOAD, 1.0, 'Finished loading mods'); // Return a value > 1.0 to signal we are done
		return allMods;
	}
}
