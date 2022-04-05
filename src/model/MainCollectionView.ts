import { CollectionConfig } from './CollectionConfig';

export enum MainColumnTitles {
	TYPE = 'Type',
	NAME = 'Name',
	AUTHORS = 'Authors',
	STATE = 'State',
	ID = 'ID',
	SIZE = 'Size',
	LAST_UPDATE = 'Last Update',
	DATE_ADDED = 'Date Added',
	TAGS = 'Tags'
}

export interface MainCollectionConfig extends CollectionConfig {
	smallRows?: boolean;
	columnActiveConfig?: { [colID: string]: boolean };
}
