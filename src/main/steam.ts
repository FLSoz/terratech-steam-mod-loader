import { parse, HTMLElement } from 'node-html-parser';
import axios from 'axios';

// BFS Search for component


// BFS search for component with known parent properties


// Find closest parent that fits property

// get the result from steam
async function querySteam(id: BigInt) {
	const response = await axios.get(
		`https://steamcommunity.com/sharedfiles/filedetails/?id=${id.toString()}`
	);
	const mod: HTMLElement = parse(response.toString());
	return mod;
}


const previewMap: {[id: string]: string} = {};


interface Author {
	id: string;
	name: string;
}

const profileMap: {[id: string]: Author} = {};

function parsePage(mod: HTMLElement) {
	const modName: string = mod.querySelector("title").rawText;
	const description: string = mod.querySelector("#highlightContent").toString();

	const requiredNodes: HTMLElement[] = mod.querySelector('#RequiredItems').childNodes as HTMLElement[];
	const requiredIds: BigInt[] = requiredNodes
		.filter((node) => {
			return !!node.attributes;
		})
		.map((node) => {
			const href: string | null | undefined = node.attributes.href;
			if (href) {
				const matches = href.match(
					/^https:\/\/steamcommunity.com\/workshop\/filedetails\/\?id=([0-9]+)$/
				);
				if (matches && matches.length > 1) {
					return matches[1];
				}
			}
			return null;
		})
		.filter((result) => {return result})
		.map((stringId) => {const castString: string = stringId as string; return BigInt(castString)});

	const rightPanel: HTMLElement = mod.querySelector("#rightContents");
	let authorPanel: HTMLElement | undefined = undefined;
	let foundAuthor = false;
	rightPanel.childNodes.every((child1) => {
		child1.childNodes.every((child2) => {
			child2.childNodes.every((child3) => {
				if (child3.text && child3.text === "Created by") {
					authorPanel = child2 as HTMLElement;
					foundAuthor = true;
					return false;
				}
				return true;
			});
			if (foundAuthor) {
				return false;
			}
			return true;
		});
		if (foundAuthor) {
			return false;
		}
		return true;
	});
	if (authorPanel) {

	}
}


