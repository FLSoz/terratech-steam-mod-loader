"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delayForEach = exports.pause = exports.sleep = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pause = (ms, callback, ...args) => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                resolve(await callback(...args));
            }
            catch (error) {
                reject(error);
            }
        }, ms);
    });
};
exports.pause = pause;
async function sleep(ms) {
    await delay(ms);
}
exports.sleep = sleep;
function delayForEach(array, delayTime, func, ...args) {
    let promise = Promise.resolve();
    let index = 0;
    while (index < array.length) {
        const fixInd = index;
        promise = promise.then(() => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    func({
                        value: array[fixInd],
                        index: fixInd,
                        array
                    }, ...args);
                    resolve();
                }, delayTime);
            });
        });
        index += 1;
    }
    return promise;
}
exports.delayForEach = delayForEach;
//# sourceMappingURL=Sleep.js.map