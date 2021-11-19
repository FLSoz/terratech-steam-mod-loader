"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterRows = exports.convertToModData = exports.ModType = void 0;
var ModType;
(function (ModType) {
    ModType["WORKSHOP"] = "workshop";
    ModType["LOCAL"] = "local";
    ModType["TTQMM"] = "ttqmm";
})(ModType = exports.ModType || (exports.ModType = {}));
function convertToModData(input) {
    const dependenciesMap = new Map();
    const tempMap = new Map();
    const workshopMap = new Map();
    [...input.values()].forEach((mod) => {
        var _a, _b, _c, _d, _e, _f;
        const modData = {
            key: mod.ID,
            uid: mod.UID,
            id: mod.WorkshopID ? `${mod.WorkshopID}` : mod.ID,
            type: mod.type,
            preview: (_a = mod.config) === null || _a === void 0 ? void 0 : _a.preview,
            name: mod.config && mod.config.name ? mod.config.name : mod.ID,
            description: (_b = mod.config) === null || _b === void 0 ? void 0 : _b.description,
            author: (_c = mod.config) === null || _c === void 0 ? void 0 : _c.author,
            dependsOn: (_d = mod.config) === null || _d === void 0 ? void 0 : _d.dependsOn,
            hasCode: (_e = mod.config) === null || _e === void 0 ? void 0 : _e.hasCode,
            tags: (_f = mod.config) === null || _f === void 0 ? void 0 : _f.tags
        };
        tempMap.set(mod.ID, modData);
        if (mod.WorkshopID) {
            workshopMap.set(mod.WorkshopID.toString(), mod.ID);
        }
        if (modData.dependsOn) {
            modData.dependsOn.forEach((dependency) => {
                if (dependenciesMap.has(dependency)) {
                    const reliers = dependenciesMap.get(dependency);
                    reliers === null || reliers === void 0 ? void 0 : reliers.add(mod.ID);
                }
                else {
                    dependenciesMap.set(dependency, new Set(mod.ID));
                }
            });
        }
    });
    const missingMods = [];
    dependenciesMap.forEach((reliers, dependency) => {
        const modData = tempMap.get(dependency);
        if (modData) {
            modData.isDependencyFor = [...reliers];
        }
        else {
            missingMods.push(dependency);
        }
    });
    return [...tempMap.values()];
}
exports.convertToModData = convertToModData;
function filterRows(rows, searchString) {
    if (searchString && searchString.length > 0) {
        const lowerSearchString = searchString.toLowerCase();
        return rows.filter((modData) => {
            var _a, _b;
            console.log(`Checking if ${lowerSearchString} matches mod ${JSON.stringify(modData, null, 2)}`);
            if (modData.name.toLowerCase().includes(lowerSearchString)) {
                return true;
            }
            if (modData.type.toLowerCase().includes(lowerSearchString)) {
                return true;
            }
            if ((_a = modData.author) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(lowerSearchString)) {
                return true;
            }
            return (_b = modData.tags) === null || _b === void 0 ? void 0 : _b.reduce((acc, tag) => {
                if (acc) {
                    return true;
                }
                return tag.toLowerCase().includes(lowerSearchString);
            }, false);
        });
    }
    return rows;
}
exports.filterRows = filterRows;
//# sourceMappingURL=Mod.js.map