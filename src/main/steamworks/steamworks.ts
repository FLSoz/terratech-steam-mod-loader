/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable global-require */
/* eslint-disable class-methods-use-this */
// A wrapper interface around Greenworks written in ts
import {
	// Steam API
	EResult,

	// Steamworks
	ValidGreenworksChannels,
	SteamErrorCallback,
	ProgressCallback,

	// ISteamUGC
	GetItemsProps,
	GetUserItemsProps,
	PublishWorkshopFileProps,
	SynchronizeItemsProps,
	UpdatePublishedWorkshopFileProps,
	ItemInstallInfo,
	UGCItemState,

	// IFriends
	SteamID,
	SteamUGCDetails,
	SteamPageResults
} from './types';

const greenworks: any = require('greenworks');

function wrapCallbackForWorkshopIDConversion(callback: (results: SteamPageResults) => void) {
	return (apiResults: SteamPageResults) => {
		const { items, totalItems, numReturned } = apiResults;
		callback({
			items: items.map((result: any) => {
				return {
					...result,
					publishedFileId: BigInt(result.publishedFileId),
					children: result.children ? result.children.map((stringID: string) => BigInt(stringID)) : undefined
				};
			}),
			totalItems,
			numReturned
		});
	};
}

class SteamworksAPI {
	init(): boolean {
		return greenworks.init();
	}

	on(channel: ValidGreenworksChannels, callback: (...props: any) => void) {
		greenworks.on(channel, callback);
	}

	// Friends
	/**
	 * Requests information about a user (persona name & avatar). Returns true, it means that data is being requested, and a persona-state-changed event will be emitted when it's retrieved; if returns false, it means that we already have all the details about that user, and functions can be called immediately.
	 * If require_name_only is true, then the avatar of a user isn't downloaded (it's a lot slower to download avatars and churns the local cache, so if you don't need avatars, don't request them).
	 */
	requestUserInformation(raw_steam_id: string, require_name_only: boolean): boolean {
		return greenworks.requestUserInformation(raw_steam_id, require_name_only);
	}

	getSmallFriendAvatar(raw_steam_id: string): number {
		return greenworks.getSmallFriendAvatar(raw_steam_id);
	}

	getMediumFriendAvatar(raw_steam_id: string): number {
		return greenworks.getMediumFriendAvatar(raw_steam_id);
	}

	/**
	 * Gets the large (128*128) avatar. Returns an integer handle which is used in getImageRGBA();
	 * returns 0 if none set; returns -1 if this image has yet to be loaded, in this case you should wait for avatar-image-loaded event. */
	getLargeFriendAvatar(raw_steam_id: string): number {
		return greenworks.getLargeFriendAvatar(raw_steam_id);
	}

	getFriendPersonaName(raw_steam_id: string): string {
		return greenworks.getFriendPersonaName(raw_steam_id);
	}

	// Settings
	getImageSize(handle: number): { height?: number; width?: number } {
		return greenworks.getImageSize(handle);
	}

	getImageRGBA(handle: number): Buffer {
		return greenworks.getImageRGBA(handle);
	}

	getAppInstallDir(app_id: number): string {
		return greenworks.getAppInstallDir(app_id);
	}

	getAppBuildId(): number {
		return greenworks.getAppBuildId();
	}

	getAppId(): number {
		return greenworks.getAppId();
	}

	getSteamId(): SteamID {
		return greenworks.getSteamId();
	}

	isAppInstalled(appId: number): boolean {
		return greenworks.isAppInstalled();
	}

	isSubscribedApp(appId: number): boolean {
		return greenworks.isSubscribedApp();
	}

	getLaunchCommandLine(): string {
		return greenworks.getLaunchCommandLine();
	}

	// Utils
	move(source_dir: string, target_dir: string, success_callback?: () => void, error_callback?: SteamErrorCallback) {
		greenworks.Utils.move(source_dir, target_dir, success_callback, error_callback);
	}

	createArchive(
		zip_file_path: string,
		source_dir: string,
		password: string,
		compress_level: string,
		success_callback: () => void,
		error_callback?: SteamErrorCallback
	) {
		greenworks.Utils.createArchive(zip_file_path, source_dir, password, compress_level, success_callback, error_callback);
	}

	extractArchive(
		zip_file_path: string,
		extract_dir: string,
		password: string,
		success_callback: () => void,
		error_callback?: SteamErrorCallback
	) {
		greenworks.Utils.extractArchive(zip_file_path, extract_dir, password, success_callback, error_callback);
	}

	// ISteamUGC
	fileShare(file_path: string, success_callback: (file_handle: string) => void, error_callback?: SteamErrorCallback) {
		return greenworks.fileShare(file_path, success_callback, error_callback);
	}

	ugcDownloadItem(published_file_id: bigint, success_callback: (result: EResult) => void, error_callback?: SteamErrorCallback) {
		return greenworks.ugcDownloadItem(published_file_id.toString(), success_callback, error_callback);
	}

	ugcUnsubscribe(published_file_id: bigint, success_callback: (result: EResult) => void, error_callback?: SteamErrorCallback) {
		return greenworks.ugcUnsubscribe(published_file_id.toString(), success_callback, error_callback);
	}

	ugcSubscribe(published_file_id: bigint, success_callback: (result: EResult) => void, error_callback?: SteamErrorCallback) {
		return greenworks.ugcSubscribe(published_file_id.toString(), success_callback, error_callback);
	}

	ugcShowOverlay(published_file_id?: bigint) {
		return greenworks.ugcShowOverlay(published_file_id?.toString());
	}

	ugcGetItemState(published_file_id: bigint): UGCItemState {
		return greenworks.ugcGetItemState(published_file_id.toString());
	}

	ugcGetItemInstallInfo(published_file_id: bigint): ItemInstallInfo | undefined {
		return greenworks.ugcGetItemInstallInfo(published_file_id.toString());
	}

	getSubscribedItems(): bigint[] {
		return greenworks
			.getSubscribedItems()
			.map((workshopID: string) => {
				try {
					return BigInt(workshopID);
				} catch (e) {
					return 0;
				}
			})
			.filter((id: bigint) => id > 0);
	}

	getUGCDetails(workshop_ids: string[], success_callback: (items: SteamUGCDetails[]) => void, error_callback?: SteamErrorCallback) {
		greenworks.getUGCDetails(
			workshop_ids,
			(results: SteamPageResults) => {
				const { items } = results;
				return success_callback(items);
			},
			error_callback
		);
	}

	ugcGetItems(props: GetItemsProps) {
		const { options, ugc_matching_type, ugc_query_type, success_callback, error_callback } = props;
		let actualOptions = options;
		if (!options || Object.keys(options).length === 0) {
			actualOptions = {
				app_id: greenworks.getAppId(),
				page_num: 1
			};
		}
		if (!actualOptions!.required_tag) {
			actualOptions!.required_tag = '';
		}
		greenworks._ugcGetItems(
			options,
			ugc_matching_type,
			ugc_query_type,
			wrapCallbackForWorkshopIDConversion(success_callback),
			error_callback
		);
	}

	ugcGetUserItems(props: GetUserItemsProps) {
		const { options, ugc_matching_type, ugc_list_sort_order, ugc_list, success_callback, error_callback } = props;
		let actualOptions = options;
		if (!options || Object.keys(options).length === 0) {
			actualOptions = {
				app_id: greenworks.getAppId(),
				page_num: 1
			};
		}
		if (!actualOptions!.required_tag) {
			actualOptions!.required_tag = '';
		}
		greenworks._ugcGetUserItems(
			options,
			ugc_matching_type,
			ugc_list_sort_order,
			ugc_list,
			wrapCallbackForWorkshopIDConversion(success_callback),
			error_callback
		);
	}

	ugcSynchronizeItems(props: SynchronizeItemsProps) {
		const { options, sync_dir, success_callback, error_callback } = props;
		let actualOptions = options;
		if (!options || Object.keys(options).length === 0) {
			actualOptions = {
				app_id: greenworks.getAppId(),
				page_num: 1
			};
		}
		greenworks._ugcSynchronizeItems(
			actualOptions,
			sync_dir,
			(results: unknown[]) => {
				success_callback(
					results.map((result: any) => {
						return {
							...result,
							publishedFileId: BigInt(result.publishedFileId),
							children: result.children ? result.children.map((stringID: string) => BigInt(stringID)) : undefined
						};
					})
				);
			},
			error_callback
		);
	}

	publishWorkshopFile(props: PublishWorkshopFileProps) {
		const { options, file_path, image_path, title, description, success_callback, error_callback } = props;
		let actualOptions = options;
		if (!options || Object.keys(options).length === 0) {
			actualOptions = {
				tags: [], // No tags are set,
				app_id: greenworks.getAppId()
			};
		}
		greenworks._publishWorkshopFile(actualOptions, file_path, image_path, title, description, success_callback, error_callback);
	}

	updatePublishedWorkshopFile(props: UpdatePublishedWorkshopFileProps) {
		const { options, published_file_handle, file_path, image_path, title, description, success_callback, error_callback } = props;
		let actualOptions = options;
		if (!options || Object.keys(options).length === 0) {
			actualOptions = {
				tags: [] // No tags are set
			};
		}
		greenworks._updatePublishedWorkshopFile(
			actualOptions,
			published_file_handle,
			file_path,
			image_path,
			title,
			description,
			success_callback,
			error_callback
		);
	}

	ugcPublish(
		file_name: string,
		title: string,
		description: string,
		image_name: string,
		success_callback: (published_file_handle: string) => void,
		error_callback?: SteamErrorCallback,
		progress_callback?: ProgressCallback
	) {
		greenworks.ugcPublish(file_name, title, description, image_name, success_callback, error_callback, progress_callback);
	}

	ugcPublishUpdate(
		published_file_id: string,
		file_name: string,
		title: string,
		description: string,
		image_name: string,
		success_callback: () => void,
		error_callback?: SteamErrorCallback,
		progress_callback?: ProgressCallback
	) {
		greenworks.ugcPublishUpdate(
			published_file_id,
			file_name,
			title,
			description,
			image_name,
			success_callback,
			error_callback,
			progress_callback
		);
	}
}

export default new SteamworksAPI();
