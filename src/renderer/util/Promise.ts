/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CancellablePromise<Type> {
	promise: Promise<Type>;
	cancel: () => void;
}

export function cancellablePromise<Type>(
	promise: Promise<Type>
): CancellablePromise<Type> {
	const isCancelled = { value: false };
	const wrappedPromise: Promise<Type> = new Promise((resolve, reject) => {
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
		},
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
					reject(this.isCancelled.value ? this.isCancelled : e);
				});
		});
		return wrappedPromise;
	}

	cancelAllPromises() {
		this.isCancelled.value = true;
	}
}
