export enum CorpType {
	HE = 'he',
	GSO = 'gso',
	GC = 'gc',
	BF = 'bf',
	VEN = 'ven',
	RR = 'rr',
	SPE = 'spe'
}

export function getCorpType(tag: string): CorpType | null {
	const lowercase = tag.toLowerCase();
	if (lowercase === 'gso') {
		return CorpType.GSO;
	} else if (lowercase === 'he' || lowercase === 'hawkeye') {
		return CorpType.HE;
	} else if (lowercase === 'gc' || lowercase === 'geocorp') {
		return CorpType.GC;
	} else if (lowercase === 'ven' || lowercase === 'venture') {
		return CorpType.VEN;
	} else if (lowercase === 'bf' || lowercase === 'betterfuture') {
		return CorpType.BF;
	} else if (lowercase === 'rr' || lowercase === 'reticuleresearch') {
		return CorpType.RR;
	} else if (lowercase === 'spe' || lowercase === 'special') {
		return CorpType.SPE;
	}
	return null;
}
