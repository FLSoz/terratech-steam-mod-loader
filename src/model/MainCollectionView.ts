import { CollectionConfig } from './CollectionConfig';

export enum MainColumnTitles {
	TYPE = 'Type',
	NAME = 'Name',
	AUTHORS = 'Authors',
	STATE = 'State',
	ID = 'ID',
	SIZE = 'Size',
	LAST_UPDATE = 'Last Update',
	LAST_WORKSHOP_UPDATE = 'Workshop Update',
	DATE_ADDED = 'Date Added',
	TAGS = 'Tags'
}

export interface MainCollectionConfig extends CollectionConfig {
	smallRows?: boolean;
	columnActiveConfig?: { [colID: string]: boolean };
}
