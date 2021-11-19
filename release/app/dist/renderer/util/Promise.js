"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellablePromiseManager = exports.cancellablePromise = void 0;
function cancellablePromise(promise) {
    const isCancelled = { value: false };
    const wrappedPromise = new Promise((resolve, reject) => {
        promise
            .then((d) => {
            return isCancelled.value ? reject(isCancelled) : resolve(d);
        })
            .catch((e) => {
            reject(isCancelled.value ? isCancelled : e);
        });
    });
    return {
        promise: wrappedPromise,
        cancel: () => {
            isCancelled.value = true;
        }
    };
}
exports.cancellablePromise = cancellablePromise;
class CancellablePromiseManager {
    constructor() {
        this.isCancelled = { value: false };
    }
    execute(promise) {
        const wrappedPromise = new Promise((resolve, reject) => {
            promise
                .then((d) => {
                return this.isCancelled.value ? reject(this.isCancelled) : resolve(d);
            })
                .catch((e) => {
                reject(this.isCancelled.value ? this.isCancelled : e);
            });
        });
        return wrappedPromise;
    }
    cancelAllPromises() {
        this.isCancelled.value = true;
    }
}
exports.CancellablePromiseManager = CancellablePromiseManager;
//# sourceMappingURL=Promise.js.map