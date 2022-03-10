/* eslint-disable @typescript-eslint/no-explicit-any */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pause = (
	ms: number,
	callback: (...args: any[]) => any,
	...args: any[]
): Promise<any> => {
	return new Promise((resolve, reject) => {
		setTimeout(async () => {
			try {
				resolve(await callback(...args));
			} catch (error) {
				reject(error);
			}
		}, ms);
	});
};

async function sleep(ms: number) {
	await delay(ms);
}

export interface ForEachProps<Type> {
	value: Type;
	index: number;
	array: Type[];
}

function delayForEach<Type>(
	array: Type[],
	delayTime: number,
	func: (props: ForEachProps<Type>, ...funcArgs: any[]) => void,
	...args: any[]
): Promise<any> {
	let promise = Promise.resolve();
	let index = 0;
	while (index < array.length) {
		const fixInd = index;
		promise = promise.then(() => {
			return new Promise((resolve) => {
				setTimeout(() => {
					func(
						{
							value: array[fixInd],
							index: fixInd,
							array,
						},
						...args
					);
					resolve();
				}, delayTime);
			});
		});
		index += 1;
	}
	return promise;
}

export { sleep, pause, delayForEach };
