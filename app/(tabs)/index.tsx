import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SatisfyingGame } from '../../components/SatisfyingGame';
import { buildFeedBatch, FeedItem, GAME_LABELS, lastGameIn } from '../../lib/feed';
import { setSynthMuted } from '../../lib/synth-audio';
import { readState, toggleFavorite, writeState } from '../../lib/storage';

const COMMIT_SHA = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? 'local';
const TAB_HEIGHT = Platform.OS === 'web' ? 64 : 76;
const ITEM_HEIGHT = Dimensions.get('window').height - TAB_HEIGHT;
const NAV_ZONE_HEIGHT = Math.max(96, Math.min(132, ITEM_HEIGHT * 0.13));
const GAME_HEIGHT = ITEM_HEIGHT - NAV_ZONE_HEIGHT;

function MockAd() {
  return <View style={styles.ad}><Text style={styles.adEyebrow}>ADVERTISEMENT SLOT</Text><Text style={styles.adTitle}>7 games first.</Text><Text style={styles.adCopy}>Placeholder proving feed insertion. No SDK yet.</Text></View>;
}

export default function FeedPage() {
  const initialBatch = useMemo(() => buildFeedBatch(0), []);
  const [items, setItems] = useState<FeedItem[]>(initialBatch);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const navStartIndex = useRef(0);
  const enteredAt = useRef(Date.now());

  useEffect(() => {
    readState().then(async (state) => {
      setSynthMuted(state.muted);
      setFavorites(state.favorites);
      state.stats.sessions += 1;
      await writeState(state);
    });
  }, []);

  const appendIfNeeded = (target: number) => {
    if (target >= items.length - 2) {
      setItems((current) => [...current, ...buildFeedBatch(Math.floor(current.length / 8), lastGameIn(current))]);
    }
  };

  const persistDeparture = async (current: FeedItem) => {
    const state = await readState();
    const elapsed = Math.max(0.1, (Date.now() - enteredAt.current) / 1000);
    if (current.kind === 'game') {
      state.history = [...state.history, { id: current.id, game: current.game, label: GAME_LABELS[current.game], seconds: elapsed, at: Date.now() }].slice(-150);
      state.stats.gamesViewed += 1;
      state.stats.totalSeconds += elapsed;
    } else {
      state.stats.adsReached += 1;
    }
    await writeState(state);
  };

  const goNext = () => {
    const current = items[currentIndex];
    const next = currentIndex + 1;
    appendIfNeeded(next);
    setCurrentIndex(next);
    enteredAt.current = Date.now();
    listRef.current?.scrollToOffset({ offset: next * ITEM_HEIGHT, animated: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    void persistDeparture(current);
  };

  const toggleCurrentFavorite = async () => {
    const current = items[currentIndex];
    if (current?.kind !== 'game') return;
    const state = await toggleFavorite(current.game);
    setFavorites(state.favorites);
    Haptics.selectionAsync().catch(() => undefined);
  };

  const nextPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { navStartIndex.current = currentIndex; },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -42 && navStartIndex.current === currentIndex) goNext();
    },
  }), [currentIndex, items]);

  const current = items[currentIndex];
  const currentIsFavorite = current?.kind === 'game' && favorites.includes(current.game);

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.feedItem}>
            <View style={styles.gameFrame}>{item.kind === 'ad' ? <MockAd /> : <SatisfyingGame game={item.game} />}</View>
            <View style={styles.nextSpacer} />
          </View>
        )}
        scrollEnabled={false}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
      />

      {current?.kind === 'game' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={currentIsFavorite ? 'Remove from favorites' : 'Add to favorites'}
          style={[styles.favoriteButton, currentIsFavorite && styles.favoriteButtonActive]}
          onPress={toggleCurrentFavorite}
        >
          <Text selectable={false} style={[styles.favoriteIcon, currentIsFavorite && styles.favoriteIconActive]}>{currentIsFavorite ? '♥' : '♡'}</Text>
        </Pressable>
      )}

      <View style={[styles.nextZone, { height: NAV_ZONE_HEIGHT }]} {...nextPan.panHandlers}>
        <View style={styles.separator} />
        <View style={styles.pill} />
        <Text style={styles.nextText}>SWIPE UP · NEXT</Text>
      </View>
      <View pointerEvents="none" style={styles.commit}><Text style={styles.commitText}>POC {COMMIT_SHA}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08090c', ...(Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none' } as object) : {}) },
  feedItem: { height: ITEM_HEIGHT, backgroundColor: '#08090c' },
  gameFrame: { height: GAME_HEIGHT, overflow: 'hidden', backgroundColor: '#08090c' },
  nextSpacer: { height: NAV_ZONE_HEIGHT, backgroundColor: '#08090c' },
  nextZone: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, alignItems: 'center', justifyContent: 'center', paddingTop: 12, backgroundColor: '#08090c' },
  separator: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#343840' },
  pill: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#666c78', marginBottom: 10 },
  nextText: { color: '#a1a6b1', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  favoriteButton: { position: 'absolute', top: Platform.OS === 'web' ? 10 : 14, left: 12, zIndex: 30, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,19,26,0.78)', borderWidth: 1, borderColor: '#343946' },
  favoriteButtonActive: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: '#6d7380' },
  favoriteIcon: { color: '#d8dbe2', fontSize: 26, lineHeight: 30 },
  favoriteIconActive: { color: '#ffffff' },
  commit: { position: 'absolute', top: Platform.OS === 'web' ? 8 : 12, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', zIndex: 30 },
  commitText: { color: '#a8adb7', fontSize: 10, fontWeight: '700' },
  ad: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: '#11131a' },
  adEyebrow: { color: '#74798b', fontSize: 11, letterSpacing: 2 },
  adTitle: { color: '#f5f5f5', fontSize: 30, fontWeight: '800' },
  adCopy: { color: '#8b8e99', fontSize: 14 },
});
