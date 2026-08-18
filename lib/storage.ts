import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameKind } from './feed';

export const STORAGE_KEY = 'ultimate-satisfying-state-v4';
const LEGACY_KEY = 'ultimate-satisfying-state-v3';

export type HistoryEntry = { id: string; game: GameKind; label: string; seconds: number; at: number };
export type SessionStats = { sessions: number; gamesViewed: number; adsReached: number; replays: number; totalSeconds: number };
export type StoredState = { history: HistoryEntry[]; favorites: GameKind[]; muted: boolean; stats: SessionStats };

const EMPTY_STATS: SessionStats = { sessions: 0, gamesViewed: 0, adsReached: 0, replays: 0, totalSeconds: 0 };
export const DEFAULT_STATE: StoredState = { history: [], favorites: [], muted: false, stats: EMPTY_STATS };

function normalize(raw: string | null): StoredState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      history: (parsed.history ?? []).filter((entry): entry is HistoryEntry => typeof entry?.game === 'number'),
      favorites: parsed.favorites ?? [],
      muted: parsed.muted ?? false,
      stats: { ...EMPTY_STATS, ...(parsed.stats ?? {}) },
    };
  } catch { return null; }
}

export async function readState(): Promise<StoredState> {
  const current = normalize(await AsyncStorage.getItem(STORAGE_KEY));
  if (current) return current;
  const legacy = normalize(await AsyncStorage.getItem(LEGACY_KEY));
  if (legacy) { await writeState(legacy); return legacy; }
  return { ...DEFAULT_STATE, stats: { ...EMPTY_STATS } };
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
  return updateState((state) => ({ ...state, favorites: state.favorites.includes(game) ? state.favorites.filter((value) => value !== game) : [...state.favorites, game] }));
}
