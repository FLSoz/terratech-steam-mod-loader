/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CancellablePromise<Type> {
	promise: Promise<Type>;
	cancel: () => void;
}

export function cancellablePromise<Type>(promise: Promise<Type>): CancellablePromise<Type> {
	const isCancelled = { value: false };
	const wrappedPromise: Promise<Type> = new Promise((resolve, reject) => {
		promise
			.then((d) => {
				// eslint-disable-next-line prefer-promise-reject-errors
				return isCancelled.value ? reject({ cancelled: true }) : resolve(d);
			})
			.catch((e) => {
				// eslint-disable-next-line prefer-promise-reject-errors
				reject({
					cancelled: isCancelled.value,
					error: e
				});
			});
	});

	return {
		promise: wrappedPromise,
		cancel: () => {
			isCancelled.value = true;
		}
	};
}

export class CancellablePromiseManager {
	isCancelled = { value: false };

	execute<Type>(promise: Promise<Type>): Promise<Type> {
		const wrappedPromise: Promise<Type> = new Promise((resolve, reject) => {
			promise
				.then((d) => {
					return this.isCancelled.value ? reject(this.isCancelled) : resolve(d);
				})
				.catch((e) => {
					// eslint-disable-next-line prefer-promise-reject-errors
					reject({
						cancelled: this.isCancelled.value,
						error: e
					});
				});
		});
		return wrappedPromise;
	}

	cancelAllPromises() {
		this.isCancelled.value = true;
	}
}

export function isSuccessful<T>(response: PromiseSettledResult<T>): response is PromiseFulfilledResult<T> {
	return 'value' in response;
}
