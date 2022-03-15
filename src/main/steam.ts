import { parse, HTMLElement, NodeType } from 'node-html-parser';
import axios from 'axios';
import { Url } from 'url';
import log from 'electron-log';
import { ModType, ModConfig, Mod } from './model';

interface Author {
	id: string;
	name: string;
}

// Parse Steam Workshop page into relevant details
function parseModPage(mod: HTMLElement, workshopID: string): Mod | null {
	const ttModSearch = mod.querySelector('.apphub_AppName');
	if (ttModSearch && ttModSearch.text.toLowerCase().includes('terratech')) {
		const resultMod: Mod = {
			UID: `workshop:${workshopID}`,
			ID: workshopID.toString(),
			WorkshopID: workshopID,
			type: ModType.WORKSHOP
		};
		const modConfig: ModConfig = {};
		resultMod.config = modConfig;

		// Check tags to make sure this is actually a mod, and not a snapshot or something

		// hasCode?: boolean;
		// We assume any of the following tags indicate a code mod: Code, C#
		// We assume that lack of any tags means it's a code mod
		let isMod = true;
		const tagsSearch = mod.querySelectorAll('.workshopTags');
		if (tagsSearch) {
			const tagsCategories = tagsSearch.map((node) => {
				const categorySearch = node.querySelector('.workshopTagsTitle');
				if (categorySearch) {
					const matches = categorySearch.text.match(/(.*):\s*/);
					if (matches && matches.length > 1) {
						return matches[1];
					}
				}
				return null;
			});
			const tagsPerCategory = tagsSearch.map((node) => {
				return node.childNodes
					.map((child) => {
						const childNode = child as HTMLElement;
						if (childNode.attributes && childNode.attributes.href) {
							return childNode.text;
						}
						return null;
					})
					.filter((tag) => !!tag);
			});
			const tagsMap: { [category: string]: string[] } = {};
			tagsCategories.forEach((category, index) => {
				const sanitizedCategory: string = (category || 'null').toLowerCase();
				const tags: string[] = tagsPerCategory[index] as string[];
				if (tagsMap[sanitizedCategory]) {
					tagsMap[sanitizedCategory].concat(tags);
				} else {
					tagsMap[sanitizedCategory] = tags;
				}
			});
			if (tagsMap.type && (tagsMap.type.includes('mods') || tagsMap.type.includes('Mods'))) {
				const modTags = tagsMap.mods;
				if (modTags && modTags.length > 0) {
					modConfig.hasCode = modTags.includes('code') || modTags.includes('C#') || modTags.includes('Code') || modTags.includes('c#');
				} else {
					modConfig.hasCode = true;
				}
				// log.debug(`Declaring workshop item ${workshopID} a mod since it has tags: ${JSON.stringify(tagsMap, null, 2)}`);
			} else {
				isMod = false;
			}
			// set all tags
			const allTags: string[] = [...Object.values(tagsMap)].flat();
			if (allTags && allTags.length > 0) {
				modConfig.tags = allTags;
			}
		}

		if (isMod) {
			// name?: string;
			const modName: string = mod.querySelector('title').rawText;
			modConfig.name = modName;
			const nameMatches = modName.match(/^Steam Workshop::(.*)$/);
			if (nameMatches && nameMatches.length > 1) {
				modConfig.name = nameMatches[1];
			}
			// Title should not be fooled, but just in case, take what's displayed later
			const modNameSearch2 = mod.querySelector('.game_area_purchase_game');
			if (modNameSearch2 && modNameSearch2.rawText) {
				const matches = modNameSearch2.rawText.match(/Subscribe to download(.*)\n/);
				if (matches && matches.length >= 2) {
					const validation = matches[1];
					if (validation !== modConfig.name) {
						modConfig.name = validation;
					}
				}
			}

			// description?: string;
			const description: string = mod.querySelector('#highlightContent').toString();
			modConfig.description = description;

			// dependsOn?: string[];
			// loadAfter?: string[];
			const requiredItemsBox = mod.querySelector('#RequiredItems');
			if (requiredItemsBox) {
				const requiredNodes: HTMLElement[] = requiredItemsBox.childNodes as HTMLElement[];
				const requiredIds: string[] = requiredNodes
					.filter((node) => {
						return !!node.attributes;
					})
					.map((node) => {
						const { href } = node.attributes;
						if (href) {
							const matches = href.match(/^https:\/\/steamcommunity.com\/workshop\/filedetails\/\?id=([0-9]+)$/);
							if (matches && matches.length > 1) {
								return matches[1];
							}
						}
						return null;
					})
					.filter((result) => {
						return result;
					})
					.map((stringId) => stringId as string);
				modConfig.dependsOn = requiredIds;
				modConfig.loadAfter = requiredIds;
			}

			// author?: string;
			const createdByNodeSearch = mod.querySelectorAll('.rightSectionTopTitle').filter((node) => node.text === 'Created by');
			if (createdByNodeSearch && createdByNodeSearch.length > 0) {
				let authorsNode: HTMLElement | null = null;
				let visitedCreatedBy = false;
				const createdByNode: HTMLElement = createdByNodeSearch[0];
				createdByNode.parentNode.childNodes.forEach((child) => {
					const node = child as HTMLElement;
					if (child === createdByNode) {
						visitedCreatedBy = true;
					}
					if (visitedCreatedBy && authorsNode === null) {
						try {
							if (node.nodeType === NodeType.ELEMENT_NODE) {
								const creatorsBlock = node.querySelector('.creatorsBlock');
								if (creatorsBlock) {
									authorsNode = creatorsBlock;
									const authors: (string | null)[] = authorsNode
										.querySelectorAll('.friendBlockContent')
										.map((authorNode) => {
											const text = authorNode.childNodes
												.filter((authorChild) => {
													const childNode = authorChild as HTMLElement;
													return !childNode.rawTagName;
												})
												.map((authorChild) => {
													const childNode = authorChild as HTMLElement;
													return childNode.text.trim();
												})
												.filter((childText) => childText.length > 0);
											if (text && text.length > 0) {
												return text[0];
											}
											return null;
										})
										.filter((author) => !!author);
									const castAuthors = authors as string[];
									modConfig.authors = castAuthors.sort();
								}
							}
						} catch (error) {
							console.error(error);
						}
					}
				});
			}

			// preview?: string;
			// Download the latest copy of the preview image to our cache, and enter the filepath

			// loadBefore?: string[];
			// We don't handle this
			return resultMod;
		}
	}
	return null;
}

const QUERY_RATE = 2; // only allow 2 queries per second
const MAX_RETRIES = 3;
const DEFAULT_CACHE_TIMEOUT_MINUTES = 15;

interface Request {
	url: string;
	failures: number;
}

class APIQueue {
	queue: string[];

	tries: Map<string, number>;

	queryRate: number;

	maxRetries: number;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	activePromise: Promise<any> | undefined;

	constructor() {
		this.queue = [];
		this.tries = new Map();
		this.queryRate = QUERY_RATE;
		this.maxRetries = MAX_RETRIES;
	}

	execute(url: string): Promise<string> {
		return axios
			.get(url)
			.then((res) => {
				const page = res.data;
				return page.toString();
			})
			.catch((error) => {
				console.error(error);
				const tryGetTry = this.tries.get(url);
				const currentTry: number = tryGetTry || 1;
				this.tries.set(url, currentTry + 1);
			});
	}
}

const queue = new APIQueue();

function updateRetries(retries: number) {
	queue.maxRetries = retries;
}

function updateRate(rate: number) {
	queue.queryRate = rate;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// get the result from steam
export default async function getWorkshopModDetails(id: string): Promise<Mod | null> {
	const response = await axios.get(`https://steamcommunity.com/sharedfiles/filedetails/?id=${id.toString()}`);
	await delay(0.5);
	log.info(`Got steam results for ${id}`);
	const mod: HTMLElement = parse(response.data.toString());
	return parseModPage(mod, id);
}
