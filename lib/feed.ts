export type GameKind = 0 | 1 | 2 | 3 | 4;
export type FeedItem = { id: string; kind: 'game'; game: GameKind } | { id: string; kind: 'ad' };

export const GAME_LABELS = ['POP THEM', 'MAKE WAVES', 'STRETCH IT', 'PRESSURE', 'SQUISH IT'] as const;
export const GAMES_PER_BATCH = 7;
export const FEED_BATCH_SIZE = GAMES_PER_BATCH + 1;

function randomGame(except?: GameKind): GameKind {
  const candidates = [0, 1, 2, 3, 4].filter((game) => game !== except) as GameKind[];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function buildFeedBatch(batchNumber: number, previousGame?: GameKind): FeedItem[] {
  const games: GameKind[] = [];
  let last = previousGame;

  for (let i = 0; i < GAMES_PER_BATCH; i += 1) {
    const next = randomGame(last);
    games.push(next);
    last = next;
  }

  const base = batchNumber * FEED_BATCH_SIZE;
  return [
    ...games.map((game, index) => ({ id: `session-${batchNumber}-game-${base + index}-${Math.random().toString(36).slice(2, 8)}`, kind: 'game' as const, game })),
    { id: `session-${batchNumber}-ad-${base + GAMES_PER_BATCH}`, kind: 'ad' as const },
  ];
}

export function lastGameIn(items: FeedItem[]): GameKind | undefined {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].kind === 'game') return items[i].game;
  }
  return undefined;
}
