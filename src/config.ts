export const DEFAULT_MATCH_KEYWORDS = ["nerch"] as const;

export const SCAN_MAX = 50;
export const ACTION_DELAY_MS = 150;
export const RETRIES = 3;

export type MatchKeyword = (typeof DEFAULT_MATCH_KEYWORDS)[number];

export interface MatchSettings {
  /**
   * Normalized keywords used to determine whether a thread relates to Nerch.
   */
  keywords: string[];
}

export type PersistedSettings = MatchSettings;

export interface PersistedPanelState {
  panelWidth?: number;
}

export interface PersistedConfiguration {
  settings: PersistedSettings;
  panel: PersistedPanelState;
}
