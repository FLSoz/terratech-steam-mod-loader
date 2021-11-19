export interface CancellablePromise<Type> {
    promise: Promise<Type>;
    cancel: () => void;
}
export declare function cancellablePromise<Type>(promise: Promise<Type>): CancellablePromise<Type>;
export declare class CancellablePromiseManager {
    isCancelled: {
        value: boolean;
    };
    execute<Type>(promise: Promise<Type>): Promise<Type>;
    cancelAllPromises(): void;
}
//# sourceMappingURL=Promise.d.ts.map