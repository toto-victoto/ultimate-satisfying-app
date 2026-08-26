import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import PopGame from '../../components/PopGame';
import { SatisfyingGame } from '../../components/SatisfyingGame';
import { buildFeedBatch, FeedItem, GAME_LABELS, lastGameIn } from '../../lib/feed';
import { setSynthMuted } from '../../lib/synth-audio';
import { readState, toggleFavorite, writeState } from '../../lib/storage';

const COMMIT_SHA = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? 'local';
const TAB_HEIGHT = Platform.OS === 'web' ? 64 : 76;
const ITEM_HEIGHT = Dimensions.get('window').height - TAB_HEIGHT;
const NAV_ZONE_HEIGHT = Math.max(96, Math.min(132, ITEM_HEIGHT * 0.13));
const GAME_HEIGHT = ITEM_HEIGHT - NAV_ZONE_HEIGHT;

function MockAd() { return <View style={styles.ad}><Text style={styles.adEyebrow}>ADVERTISEMENT SLOT</Text><Text style={styles.adTitle}>7 games first.</Text><Text style={styles.adCopy}>Placeholder proving feed insertion. No SDK yet.</Text></View>; }

export default function FeedPage() {
  const initialBatch = useMemo(() => buildFeedBatch(0), []);
  const [items, setItems] = useState<FeedItem[]>(initialBatch);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const navStartIndex = useRef(0);
  const enteredAt = useRef(Date.now());

  useEffect(() => { readState().then(async (state) => { setSynthMuted(state.muted); setMuted(state.muted); setFavorites(state.favorites); state.stats.sessions += 1; await writeState(state); }); }, []);
  const appendIfNeeded = (target: number) => { if (target >= items.length - 2) setItems((current) => [...current, ...buildFeedBatch(Math.floor(current.length / 8), lastGameIn(current))]); };
  const persistDeparture = async (current: FeedItem) => { const state = await readState(); const elapsed = Math.max(0.1, (Date.now() - enteredAt.current) / 1000); if (current.kind === 'game') { state.history = [...state.history, { id: current.id, game: current.game, label: GAME_LABELS[current.game], seconds: elapsed, at: Date.now() }].slice(-150); state.stats.gamesViewed += 1; state.stats.totalSeconds += elapsed; } else state.stats.adsReached += 1; await writeState(state); };
  const goNext = () => { const current = items[currentIndex]; const next = currentIndex + 1; appendIfNeeded(next); setCurrentIndex(next); enteredAt.current = Date.now(); listRef.current?.scrollToOffset({ offset: next * ITEM_HEIGHT, animated: true }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined); void persistDeparture(current); };
  const toggleCurrentFavorite = async () => { const current = items[currentIndex]; if (current?.kind !== 'game') return; const state = await toggleFavorite(current.game); setFavorites(state.favorites); Haptics.selectionAsync().catch(() => undefined); };
  const toggleSound = async () => { const state = await readState(); state.muted = !state.muted; await writeState(state); setMuted(state.muted); setSynthMuted(state.muted); Haptics.selectionAsync().catch(() => undefined); };
  const nextPan = useMemo(() => PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderGrant: () => { navStartIndex.current = currentIndex; }, onPanResponderRelease: (_, gesture) => { if (gesture.dy < -42 && navStartIndex.current === currentIndex) goNext(); } }), [currentIndex, items]);
  const current = items[currentIndex];
  const currentIsFavorite = current?.kind === 'game' && favorites.includes(current.game);

  return <View style={styles.root}>
    <FlatList ref={listRef} data={items} keyExtractor={(item) => item.id} renderItem={({ item }) => <View style={styles.feedItem}><View style={styles.gameFrame}>{item.kind === 'ad' ? <MockAd /> : item.game === 0 ? <PopGame /> : <SatisfyingGame game={item.game} />}</View><View style={styles.nextSpacer} /></View>} scrollEnabled={false} initialNumToRender={3} maxToRenderPerBatch={4} windowSize={5} getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })} />
    {current?.kind === 'game' && <Pressable accessibilityRole="button" accessibilityLabel={currentIsFavorite ? 'Remove from favorites' : 'Add to favorites'} style={[styles.favoriteButton, currentIsFavorite && styles.favoriteButtonActive]} onPress={toggleCurrentFavorite}><Text selectable={false} style={[styles.favoriteIcon, currentIsFavorite && styles.favoriteIconActive]}>{currentIsFavorite ? '♥' : '♡'}</Text></Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Turn sound on' : 'Mute sound'} style={styles.soundButton} onPress={toggleSound}><View style={styles.speakerIcon}><View style={styles.speakerBox} /><View style={styles.speakerCone} />{!muted && <><View style={styles.soundWaveSmall} /><View style={styles.soundWaveLarge} /></>}{muted && <View style={styles.muteSlash} />}</View></Pressable>
    <View style={[styles.nextZone, { height: NAV_ZONE_HEIGHT }]} {...nextPan.panHandlers}><View style={styles.separator} /><View style={styles.pill} /><Text style={styles.nextText}>SWIPE UP · NEXT</Text></View>
    <View pointerEvents="none" style={styles.commit}><Text style={styles.commitText}>POC {COMMIT_SHA}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08090c', ...(Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none' } as object) : {}) }, feedItem: { height: ITEM_HEIGHT, backgroundColor: '#08090c' }, gameFrame: { height: GAME_HEIGHT, overflow: 'hidden', backgroundColor: '#08090c' }, nextSpacer: { height: NAV_ZONE_HEIGHT, backgroundColor: '#08090c' }, nextZone: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, alignItems: 'center', justifyContent: 'center', paddingTop: 12, backgroundColor: '#08090c' }, separator: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#343840' }, pill: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#666c78', marginBottom: 10 }, nextText: { color: '#a1a6b1', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  favoriteButton: { position: 'absolute', top: Platform.OS === 'web' ? 10 : 14, left: 12, zIndex: 30, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,19,26,0.66)', borderWidth: 1, borderColor: '#343946' }, favoriteButtonActive: { backgroundColor: 'rgba(169,140,255,0.12)', borderColor: '#8d78b8' }, favoriteIcon: { color: '#c8c5ce', fontSize: 25, lineHeight: 29 }, favoriteIconActive: { color: '#d8c7ff' },
  soundButton: { position: 'absolute', top: Platform.OS === 'web' ? 10 : 14, right: 72, zIndex: 30, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,19,26,0.66)', borderWidth: 1, borderColor: '#343946' }, speakerIcon: { width: 24, height: 24, position: 'relative' }, speakerBox: { position: 'absolute', left: 2, top: 9, width: 6, height: 7, borderWidth: 1.8, borderColor: '#c8c5ce', borderRightWidth: 0, borderRadius: 1 }, speakerCone: { position: 'absolute', left: 7, top: 6, width: 9, height: 13, borderLeftWidth: 7, borderTopWidth: 5, borderBottomWidth: 5, borderLeftColor: '#c8c5ce', borderTopColor: 'transparent', borderBottomColor: 'transparent' }, soundWaveSmall: { position: 'absolute', right: 3, top: 8, width: 5, height: 9, borderRightWidth: 1.6, borderColor: '#c8c5ce', borderRadius: 8 }, soundWaveLarge: { position: 'absolute', right: -1, top: 5, width: 8, height: 15, borderRightWidth: 1.6, borderColor: '#c8c5ce', borderRadius: 10 }, muteSlash: { position: 'absolute', right: 0, top: 11, width: 10, height: 2, backgroundColor: '#d8c7ff', transform: [{ rotate: '-45deg' }] },
  commit: { position: 'absolute', top: Platform.OS === 'web' ? 8 : 12, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', zIndex: 30 }, commitText: { color: '#a8adb7', fontSize: 10, fontWeight: '700' }, ad: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: '#11131a' }, adEyebrow: { color: '#74798b', fontSize: 11, letterSpacing: 2 }, adTitle: { color: '#f5f5f5', fontSize: 30, fontWeight: '800' }, adCopy: { color: '#8b8e99', fontSize: 14 },
});
