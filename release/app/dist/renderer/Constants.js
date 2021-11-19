"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WORKSHOP_DIR = exports.DEFAULT_LOCAL_DIR = exports.DEFAULT_STEAM_EXEC = exports.TT_APP_ID = exports.DEFAULT_WORKSHOP_ID = exports.platform = void 0;
exports.platform = window.electron.platform;
exports.DEFAULT_WORKSHOP_ID = '2655051786';
exports.TT_APP_ID = '285920';
function getDefaultSteamExec() {
    switch (exports.platform) {
        case 'win32':
            return 'C:\\Program Files(x86)\\Steam\\steam.exe';
            break;
        case 'darwin':
            return '/Applications/Steam.app';
            break;
        default:
            return '~/.steam/steam/Steam';
    }
}
exports.DEFAULT_STEAM_EXEC = getDefaultSteamExec();
function getDefaultLocalDir() {
    switch (exports.platform) {
        case 'win32':
            return 'C:\\Program Files(x86)\\Steam\\steamapps\\common\\TerraTech\\LocalMods';
            break;
        case 'darwin':
            return '~/Library/"Application Support"/Steam/steamapps/common/TerraTech/LocalMods';
            break;
        default:
            return '~/.steam/steam/SteamApps/common/TerraTech/LocalMods';
    }
}
exports.DEFAULT_LOCAL_DIR = getDefaultLocalDir();
function getDefaultWorkshopDir() {
    switch (exports.platform) {
        case 'win32':
            return `C:\\Program Files(x86)\\Steam\\steamapps\\workshop\\content\\${exports.TT_APP_ID}`;
            break;
        case 'darwin':
            return `~/Library/"Application Support"/Steam/steamapps/workshop/content/${exports.TT_APP_ID}`;
            break;
        default:
            return `~/.steam/steam/SteamApps/workshop/content/${exports.TT_APP_ID}`;
    }
}
exports.DEFAULT_WORKSHOP_DIR = getDefaultWorkshopDir();
//# sourceMappingURL=Constants.js.map