/* eslint-disable @typescript-eslint/naming-convention */
import { SteamworksAPIProps } from './Steamworks';

export enum ItemPreviewType {
	Image = 0,
	YouTubeVideo = 1,
	Sketchfab = 2,
	EnvironmentMap_HorizontalCross = 3,
	EnvironmentMap_LatLong = 4,
	ReservedMax = 255
}

export enum UGCMatchingType {
	Items,
	ItemsMtx,
	ItemsReadyToUse,
	Collections,
	Artwork,
	Videos,
	Screenshots,
	AllGuides,
	WebGuides,
	IntegratedGuides,
	UsableInGame,
	ControllerBindings
}

export enum UGCQueryType {
	RankedByVote = 0,
	RankedByPublicationDate = 1,
	AcceptedForGameRankedByAcceptanceDate = 2,
	RankedByTrend = 3,
	FavoritedByFriendsRankedByPublicationDate = 4,
	CreatedByFriendsRankedByPublicationDate = 5,
	RankedByNumTimesReported = 6,
	CreatedByFollowedUsersRankedByPublicationDate = 7,
	NotYetRated = 8,
	RankedByTotalVotesAsc = 9,
	RankedByVotesUp = 10,
	RankedByTextSearch = 11,

	// NOT IN GREENWORKS DOCS!!
	RankedByTotalUniqueSubscriptions = 12,
	RankedByPlaytimeTrend = 13,
	RankedByTotalPlaytime = 14,
	RankedByAveragePlaytimeTrend = 15,
	RankedByLifetimeAveragePlaytime = 16,
	RankedByPlaytimeSessionsTrend = 17,
	RankedByLifetimePlaytimeSessions = 18,
	RankedByLastUpdatedDate = 19
}

export enum UGCItemVisibility {
	Public = 0,
	FriendsOnly = 1,
	Private = 2
}

export interface SteamUGCDetails {
	acceptForUse: boolean;
	banned: boolean;
	tagsTruncated: boolean;
	fileType: number;
	/** Result: 1 is Success, everything else is fail */
	result: number;
	/** Visibility: 0 = Public, 1 = FriendsOnly, 2 = Private */
	visibility: UGCItemVisibility;
	score: number;
	file: string;
	fileName: string;
	fileSize: number;
	/** UGCHandle_t of preview in string format */
	previewURL: string;
	previewFile: string;
	previewFileSize: number;
	/** uint64 of creator's Steam ID in string format */
	steamIDOwner: string;
	consumerAppID: number;
	creatorAppID: number;
	/** UGCHandle_t of the ID in string format */
	publishedFileId: bigint;
	title: string;
	description: string;
	URL: string;
	/** Time when user added the item to their list provided in Unix epoch format */
	timeAddedToUserList: number;
	/** Time when item was created, provided in Unix epoch format */
	timeCreated: number;
	/** Time when item was last updated, provided in Unix epoch format */
	timeUpdated: number;
	votesDown: number;
	votesUp: number;
	children?: bigint[];
	metadata: string;
	tags: string[];
	tagsDisplayNames: string[];
}

export interface ExtendedSteamUGCDetails extends SteamUGCDetails {
	isUpdated: boolean;
}

export enum UserUGCList {
	Published = 0,
	VotedOn = 1,
	VotedUp = 2,
	VotedDown = 3,
	WillVoteLater = 4,
	Favorited = 5,
	Subscribed = 6,
	UsedOrPlayer = 7,
	Followed = 8
}

export enum UserUGCListSortOrder {
	CreationOrderDesc = 0,
	CreationOrderAsc = 1,
	TitleAsc = 2,
	LastUpdatedDesc = 3,
	SubscriptionDateDesc = 4,
	VoteScoreDesc = 5,
	ForModeration = 6
}

export enum UGCItemState {
	None = 0,
	Subscribed = 1,
	LegacyItem = 2,
	Installed = 4,
	NeedsUpdate = 8,
	Downloading = 16,
	DownloadPending = 32
}

export enum WorkshopFileType {
	Community = 0,
	Microtransaction = 1,
	Collection = 2,
	Art = 3,
	Video = 4,
	Screenshot = 5,
	Game = 6,
	Software = 7,
	Concept = 8,
	WebGuide = 9,
	IntegratedGuide = 10,
	Merch = 11,
	ControllerBinding = 12,
	SteamworksAccessInvite = 13,
	SteamVideo = 14,
	GameManagedItem = 15,
	Max = 16
}

export enum ItemStatistic {
	NumSubscriptions = 0,
	NumFavorites = 1,
	NumFollowers = 2,
	NumUniqueSubscriptions = 3,
	NumUniqueFavorites = 4,
	NumUniqueFollowers = 5,
	NumUniqueWebsiteViews = 6,
	NumSecondsPlayed = 8,
	NumPlaytimeSessions = 9,
	NumComments = 10,
	NumSecondsPlayedDuringTimePeriod = 11,
	NumPlaytimeSessionsDuringTimePeriod = 12
}

export const kNumUGCResultsPerPage = 50;
export const k_cchDeveloperMetadataMax = 5000;
const k_UGCQueryHandleInvalid = '18446744073709551615'; // 0xffffffffffffffff in unsigned long
const k_UGCUpdateHandleInvalid = '18446744073709551615'; // 0xffffffffffffffff in unsigned long

export function invalidQueryHandle(queryHandle: string) {
	return queryHandle === k_UGCQueryHandleInvalid;
}
export function invalidUpdateHandle(updateHandle: string) {
	return updateHandle === k_UGCUpdateHandleInvalid;
}

export interface SteamPageResults {
	items: SteamUGCDetails[];
	totalItems: number;
	numReturned: number;
}

// API Props
export interface GetItemsProps extends SteamworksAPIProps {
	options?: { page_num: number; app_id: number; required_tag?: string };
	ugc_matching_type: UGCMatchingType;
	ugc_query_type: UGCQueryType;
	success_callback: (results: SteamPageResults) => void;
}

export interface GetUserItemsProps extends SteamworksAPIProps {
	options?: { page_num: number; app_id: number; required_tag?: string };
	ugc_matching_type: UGCMatchingType;
	ugc_list_sort_order: UserUGCListSortOrder;
	ugc_list: UserUGCList;
	success_callback: (results: SteamPageResults) => void;
}

export interface PublishWorkshopFileProps extends SteamworksAPIProps {
	options?: { tags: string[]; app_id: number };
	file_path: string;
	image_path: string;
	title: string;
	description: string;
	success_callback: (publish_file_handle: string) => void;
}

export interface UpdatePublishedWorkshopFileProps extends SteamworksAPIProps {
	options?: { tags: string[]; app_id: number };
	published_file_handle: string;
	file_path: string;
	image_path: string;
	title: string;
	description: string;
}

export interface SynchronizeItemsProps extends SteamworksAPIProps {
	options?: { page_num: number; app_id: number };
	sync_dir: string;
	success_callback: (items: ExtendedSteamUGCDetails[]) => void;
}

export interface ItemInstallInfo {
	/** Size of item on disk as uint64 */
	sizeOnDisk: string;
	folder: string;
	/** Time since last updated in Unix epoch format */
	timestamp: number;
}
