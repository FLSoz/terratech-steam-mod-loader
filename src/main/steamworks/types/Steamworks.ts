export type SteamErrorCallback = (err: Error) => void;
export type ProgressCallback = (progress_msg: string) => void;

export interface SteamworksAPIProps {
	success_callback: (...props: any) => void;
	error_callback: SteamErrorCallback;
}

export enum ValidGreenworksChannels {
	GAME_OVERLAY_ACTIVATED = 'game-overlay-activated',
	GAME_SERVERS_CONNECTED = 'game-servers-connected',
	GAME_SERVERS_DISCONNECTED = 'game-servers-disconnected',
	GAME_SERVER_CONNECT_FAILURE = 'game-server-connect-failure',
	STEAM_SHUTDOWN = 'steam-shutdown',
	PERSONA_STATE_CHANGE = 'persona-state-change',
	AVATAR_IMAGE_LOADED = 'avatar-image-loaded',
	GAME_CONNECTED_FRIEND_CHAT_MESSAGE = 'game-connected-friend-chat-message',
	DLC_INSTALLED = 'dlc-installed',
	MICRO_TXN_AUTHORIZATION_RESPONSE = 'micro-txn-authorization-response',
	LOBBY_CREATED = 'lobby-created',
	LOBBY_DATA_UPDATE = 'lobby-data-update',
	LOBBY_ENTER = 'lobby-enter',
	LOBBY_INVITE = 'lobby-invite',
	LOBBY_JOIN_REQUESTED = 'lobby-join-requested',
	NEW_URL_LAUNCH_PARAMETERS = 'new-url-launch-parameters'
}
