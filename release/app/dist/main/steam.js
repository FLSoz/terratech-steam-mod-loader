"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_html_parser_1 = require("node-html-parser");
const axios_1 = __importDefault(require("axios"));
const electron_log_1 = __importDefault(require("electron-log"));
const model_1 = require("./model");
// Parse Steam Workshop page into relevant details
function parsePage(mod, workshopID) {
    const ttModSearch = mod.querySelector('.apphub_AppName');
    if (ttModSearch && ttModSearch.text === 'TerraTech') {
        const resultMod = {
            UID: `workshop:${workshopID}`,
            ID: workshopID.toString(),
            WorkshopID: workshopID,
            type: model_1.ModType.WORKSHOP
        };
        const modConfig = {};
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
                    const childNode = child;
                    if (childNode.attributes && childNode.attributes.href) {
                        return childNode.text;
                    }
                    return null;
                })
                    .filter((tag) => !!tag);
            });
            const tagsMap = {};
            tagsCategories.forEach((category, index) => {
                const sanitizedCategory = (category || 'null').toLowerCase();
                const tags = tagsPerCategory[index];
                if (tagsMap[sanitizedCategory]) {
                    tagsMap[sanitizedCategory].concat(tags);
                }
                else {
                    tagsMap[sanitizedCategory] = tags;
                }
            });
            if (tagsMap.type && (tagsMap.type.includes('mods') || tagsMap.type.includes('Mods'))) {
                const modTags = tagsMap.mods;
                if (modTags && modTags.length > 0) {
                    modConfig.hasCode = modTags.includes('code') || modTags.includes('C#') || modTags.includes('Code') || modTags.includes('c#');
                }
                else {
                    modConfig.hasCode = true;
                }
            }
            else {
                isMod = false;
            }
            // set all tags
            const allTags = [...Object.values(tagsMap)].flat();
            if (allTags && allTags.length > 0) {
                modConfig.tags = allTags;
            }
        }
        if (isMod) {
            // name?: string;
            const modName = mod.querySelector('title').rawText;
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
            const description = mod.querySelector('#highlightContent').toString();
            modConfig.description = description;
            // dependsOn?: string[];
            // loadAfter?: string[];
            const requiredItemsBox = mod.querySelector('#RequiredItems');
            if (requiredItemsBox) {
                const requiredNodes = requiredItemsBox.childNodes;
                const requiredIds = requiredNodes
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
                    .map((stringId) => stringId);
                modConfig.dependsOn = requiredIds;
                modConfig.loadAfter = requiredIds;
            }
            // author?: string;
            const createdByNodeSearch = mod.querySelectorAll('.rightSectionTopTitle').filter((node) => node.text === 'Created by');
            if (createdByNodeSearch && createdByNodeSearch.length > 0) {
                let authorsNode = null;
                let visitedCreatedBy = false;
                const createdByNode = createdByNodeSearch[0];
                createdByNode.parentNode.childNodes.forEach((child) => {
                    const node = child;
                    if (child === createdByNode) {
                        visitedCreatedBy = true;
                    }
                    if (visitedCreatedBy && authorsNode === null) {
                        try {
                            if (node.nodeType === node_html_parser_1.NodeType.ELEMENT_NODE) {
                                const creatorsBlock = node.querySelector('.creatorsBlock');
                                if (creatorsBlock) {
                                    authorsNode = creatorsBlock;
                                    const authors = authorsNode
                                        .querySelectorAll('.friendBlockContent')
                                        .map((authorNode) => {
                                        const text = authorNode.childNodes
                                            .filter((authorChild) => {
                                            const childNode = authorChild;
                                            return !childNode.rawTagName;
                                        })
                                            .map((authorChild) => {
                                            const childNode = authorChild;
                                            return childNode.text.trim();
                                        })
                                            .filter((childText) => childText.length > 0);
                                        if (text && text.length > 0) {
                                            return text[0];
                                        }
                                        return null;
                                    })
                                        .filter((author) => !!author);
                                    const castAuthors = authors;
                                    modConfig.author = castAuthors.join(', ');
                                }
                            }
                        }
                        catch (error) {
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
class APIQueue {
    constructor() {
        this.queue = [];
        this.tries = new Map();
        this.queryRate = QUERY_RATE;
        this.maxRetries = MAX_RETRIES;
    }
    execute(url) {
        return axios_1.default
            .get(url)
            .then((res) => {
            const page = res.data;
            return page.toString();
        })
            .catch((error) => {
            console.error(error);
            const tryGetTry = this.tries.get(url);
            const currentTry = tryGetTry || 1;
            this.tries.set(url, currentTry + 1);
        });
    }
}
const queue = new APIQueue();
function updateRetries(retries) {
    queue.maxRetries = retries;
}
function updateRate(rate) {
    queue.queryRate = rate;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// get the result from steam
async function querySteam(id) {
    const response = await axios_1.default.get(`https://steamcommunity.com/sharedfiles/filedetails/?id=${id.toString()}`);
    await delay(10);
    electron_log_1.default.info(`Got steam results for ${id}`);
    const mod = (0, node_html_parser_1.parse)(response.data.toString());
    return parsePage(mod, id);
}
exports.default = querySteam;
//# sourceMappingURL=steam.js.map