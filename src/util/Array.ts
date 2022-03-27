export function filterOutNullValues<T>(array: (T | null)[]): T[] {
	return array
		.filter((value: T | null) => value !== null)
		.map((value) => {
			const castValue = value as T;
			return castValue;
		});
}

export function filterOutUndefinedValues<T>(array: (T | undefined)[]): T[] {
	return array
		.filter((value: T | undefined) => value !== undefined)
		.map((value) => {
			const castValue = value as T;
			return castValue;
		});
}

export function filterOutFalseValues<T>(array: (T | false)[]): T[] {
	return array
		.filter((value: T | false) => value !== false)
		.map((value) => {
			const castValue = value as T;
			return castValue;
		});
}

export function filterOutFalsyValues<T>(array: (T | false | 0 | -0 | 0n | '' | null | undefined | typeof NaN)[]): T[] {
	return array
		.filter((value) => !!value)
		.map((value) => {
			const castValue = value as T;
			return castValue;
		});
}
