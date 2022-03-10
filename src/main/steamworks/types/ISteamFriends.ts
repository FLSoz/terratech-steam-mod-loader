export enum FriendFlags {
	None = 0,
	Blocked = 1,
	FriendshipRequested = 2,
	Immediate = 4,
	ClanMember = 8,
	OnGameServer = 16,
	RequestingFriendship = 128,
	RequestingInfo = 256,
	Ignored = 512,
	IgnoredFriend = 1024,
	ChatMember = 4096,
	All = 65535,
}

export enum FriendRelationship {
	None = 0,
	Blocked = 1,
	RequestRecipient = 2,
	Friend = 3,
	RequestInitiator = 4,
	Ignored = 5,
	IgnoredFriend = 6,
	Suggested_DEPRECATED = 7,
	Max = 8
}

export enum PersonaChange {
	Name = 1,
	Status = 2,
	ComeOnline = 4,
	GoneOffline = 8,
	GamePlayed = 16,
	GameServer = 32,
	Avatar = 64,
	JoinedSource = 128,
	LeftSource = 256,
	RelationshipChanged = 512,
	NameFirstSet = 1024,
	FacebookInfo = 2048,
	NickName = 4096,
	SteamLevel = 8192,
}

export enum AccountType {
	Invalid = 0,
	Individual = 1,
	Multiseat = 2,
	GameServer = 3,
	AnonymousGameServer = 4,
	Pending = 5,
	ContentServer = 6,
	Clan = 7,
	Chat = 8,
	ConsoleUser = 9,
	AnonymousUser = 10,
	Max = 11
}

export enum ChatEntryType {
	Invalid = 0,
	ChatMsg = 1,
	Typing = 2,
	InviteGame = 3,
	Emote = 4,
	LeftConversation = 6,
	Entered = 7,
	WasKicked = 8,
	WasBanned = 9,
	Disconnected = 10,
	HistoricalChat = 11,
	LinkBlocked = 14,
}

export interface SteamID {
	isAnonymous: () => boolean;
	isAnonymousGameServer: () => boolean;
	isAnonymousUser: () => boolean;
	isChatAccount: () => boolean;
	isClanAccount: () => boolean;
	isConsoleUserAccount: () => boolean;
	isContentServerAccount: () => boolean;
	isGameServerAccount: () => boolean;
	isIndividualAccount: () => boolean;
	isPersistentGameServerAccount: () => boolean;
	isLobby: () => void;
	getAccountID: () => number;
	getRawSteamID: () => string;
	getAccountType: () => AccountType;
	isValid: () => boolean;
	getStaticAccountKey: () => string;
	getPersonaName: () => string;
	getNickname: () => string;
	getRelationship: () => FriendRelationship;
	getSteamLevel: () => number;
}
