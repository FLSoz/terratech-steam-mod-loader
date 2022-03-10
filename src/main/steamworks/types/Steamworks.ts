export type SteamErrorCallback = (err: Error) => void;
export type ProgressCallback = (progress_msg: string) => void;

export interface SteamworksAPIProps {
	success_callback: (...props: any) => void;
	error_callback: SteamErrorCallback;
}

export enum ValidGreenworksChannels {
	PERSONA_STATE_CHANGE = 'persona-state-change'
}
