function bronKerbosch() {}

function getIncompatibilityGroups(incompatibilityMap: { [modUID: string]: string[] }): string[][] {
	const groups: string[][] = [];
	const nodeNames: string[] = Object.keys(incompatibilityMap).sort();
	const numNodes = nodeNames.length;

	// We first get a list of all the connected subcomponents
	// We only run bronKerbosch for maximal clique generation on the subcomponents that are not fully connected - that is considered rare

	const graph: { [node: number]: number[] } = {};
	Object.entries(incompatibilityMap).forEach(([modUID, neighbors]: [string, string[]]) => {
		const nodeID = nodeNames.findIndex((name: string) => name === modUID);
		graph[nodeID] = neighbors.map((neighborUID: string) => nodeNames.findIndex((name: string) => name === neighborUID));
	});

	const R: Set<number> = new Set();
	const P: Set<number> = new Set();
	const X: Set<number> = new Set();

	return groups;
}

export { bronKerbosch, getIncompatibilityGroups };
