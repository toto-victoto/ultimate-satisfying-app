import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameKind } from './feed';

export const STORAGE_KEY = 'ultimate-satisfying-state-v4';

export type HistoryEntry = {
  id: string;
  game: GameKind;
  label: string;
  seconds: number;
  at: number;
};

export type SessionStats = {
  sessions: number;
  gamesViewed: number;
  adsReached: number;
  replays: number;
  totalSeconds: number;
};

export type StoredState = {
  history: HistoryEntry[];
  favorites: GameKind[];
  muted: boolean;
  stats: SessionStats;
};

const EMPTY_STATS: SessionStats = { sessions: 0, gamesViewed: 0, adsReached: 0, replays: 0, totalSeconds: 0 };

export const DEFAULT_STATE: StoredState = {
  history: [],
  favorites: [],
  muted: false,
  stats: EMPTY_STATS,
};

export async function readState(): Promise<StoredState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STATE, stats: { ...EMPTY_STATS } };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      history: parsed.history ?? [],
      favorites: parsed.favorites ?? [],
      muted: parsed.muted ?? false,
      stats: { ...EMPTY_STATS, ...(parsed.stats ?? {}) },
    };
  } catch {
    return { ...DEFAULT_STATE, stats: { ...EMPTY_STATS } };
  }
}

export async function writeState(state: StoredState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, history: state.history.slice(-150) }));
}

export async function updateState(mutator: (state: StoredState) => StoredState) {
  const current = await readState();
  const next = mutator(current);
  await writeState(next);
  return next;
}

export async function toggleFavorite(game: GameKind) {
  return updateState((state) => ({
    ...state,
    favorites: state.favorites.includes(game)
      ? state.favorites.filter((value) => value !== game)
      : [...state.favorites, game],
  }));
}
