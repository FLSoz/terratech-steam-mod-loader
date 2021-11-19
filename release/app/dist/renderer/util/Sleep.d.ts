declare const pause: (ms: number, callback: (...args: any[]) => any, ...args: any[]) => Promise<any>;
declare function sleep(ms: number): Promise<void>;
export interface ForEachProps<Type> {
    value: Type;
    index: number;
    array: Type[];
}
declare function delayForEach<Type>(array: Type[], delayTime: number, func: (props: ForEachProps<Type>, ...funcArgs: any[]) => void, ...args: any[]): Promise<any>;
export { sleep, pause, delayForEach };
//# sourceMappingURL=Sleep.d.ts.map