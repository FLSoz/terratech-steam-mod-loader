export declare enum ModType {
    WORKSHOP = "workshop",
    LOCAL = "local",
    TTQMM = "ttqmm"
}
export interface ModConfig {
    name?: string;
    description?: string;
    preview?: string;
    hasCode?: boolean;
    author?: string;
    loadAfter?: string[];
    loadBefore?: string[];
    dependsOn?: string[];
    tags?: string[];
}
export interface Mod {
    type: ModType;
    ID: string;
    UID: string;
    WorkshopID?: BigInt | null;
    config?: ModConfig;
}
export interface ModData {
    key: string;
    uid: string;
    id: string;
    type: ModType;
    preview?: string;
    name: string;
    description?: string;
    author?: string;
    dependsOn?: string[];
    hasCode?: boolean;
    isDependencyFor?: string[];
    tags?: string[];
}
export declare function convertToModData(input: Map<string, Mod>): ModData[];
export declare function filterRows(rows: ModData[], searchString: string | undefined): ModData[];
//# sourceMappingURL=Mod.d.ts.map