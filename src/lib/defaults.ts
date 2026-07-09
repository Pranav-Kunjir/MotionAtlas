export interface ReplaySettings {
    zoom: number;
    pitch: number;
    bearing: number;
    speed: number;

    followRunner: boolean;

    lineWidth: number;
    runnerRadius: number;
}

export const DEFAULT_REPLAY_SETTINGS: ReplaySettings = {
    zoom: 16,
    pitch: 60,
    bearing: 0,
    speed: 1,

    followRunner: true,

    lineWidth: 8,
    runnerRadius: 8,
};