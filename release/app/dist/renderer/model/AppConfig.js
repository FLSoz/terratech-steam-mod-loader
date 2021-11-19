"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
const Constants_1 = require("../Constants");
exports.DEFAULT_CONFIG = {
    // steamExec: 'E:\\Steam\\steam.exe',
    // localDir: 'E:\\Steam\\steamapps\\common\\TerraTech\\LocalMods',
    // workshopDir: `E:\\Steam\\steamapps\\workshop\\content\\285920`,
    steamExec: Constants_1.DEFAULT_STEAM_EXEC,
    localDir: Constants_1.DEFAULT_LOCAL_DIR,
    workshopDir: Constants_1.DEFAULT_WORKSHOP_DIR,
    workshopID: Constants_1.DEFAULT_WORKSHOP_ID,
    logsDir: '',
    closeOnLaunch: false,
    language: 'english',
    activeCollection: undefined,
    steamMaxConcurrency: 5
};
//# sourceMappingURL=AppConfig.js.map