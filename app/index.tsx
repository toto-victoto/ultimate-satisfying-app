import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildFeedBatch, FeedItem, GAME_LABELS, GameKind, lastGameIn } from '../lib/feed';
import { playBounce, playPop, playPressureRelease, playPressureStart, playSquish, playStretchReturn, playStretchTick, playWave, setSynthMuted } from '../lib/synth-audio';

type Wave = { id: number; x: number; y: number };
type HistoryEntry = { id: string; game: GameKind; label: string; seconds: number; at: number };
type StoredState = { history?: HistoryEntry[]; muted?: boolean };

const STORAGE_KEY = 'ultimate-satisfying-state-v3';
const COMMIT_SHA = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? 'local';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const NAV_ZONE_HEIGHT = Math.max(96, Math.min(132, SCREEN_HEIGHT * 0.13));

function impact(style: Haptics.ImpactFeedbackStyle) { Haptics.impactAsync(style).catch(() => undefined); }
function tick() { Haptics.selectionAsync().catch(() => undefined); }

function BubblePop() {
  const [seed, setSeed] = useState(0);
  const bubbles = useMemo(() => Array.from({ length: 28 }, (_, i) => ({ id: `${seed}-${i}`, size: 42 + ((i * 17 + seed * 9) % 34) })), [seed]);
  const [popped, setPopped] = useState<Record<string, boolean>>({});
  const pop = (id: string, size: number) => { setPopped((p) => ({ ...p, [id]: true })); impact(Haptics.ImpactFeedbackStyle.Light); playPop(size); };
  useEffect(() => {
    if (Object.keys(popped).length < bubbles.length) return;
    const timer = setTimeout(() => { setPopped({}); setSeed((s) => s + 1); impact(Haptics.ImpactFeedbackStyle.Medium); }, 180);
    return () => clearTimeout(timer);
  }, [popped, bubbles.length]);
  return <Experience title="POP THEM" subtitle="tap forever"><View style={styles.bubbleGrid}>{bubbles.map((b) => <Pressable key={b.id} onPressIn={() => pop(b.id, b.size)} style={[styles.bubble, { width: b.size, height: b.size, borderRadius: b.size / 2 }, popped[b.id] && styles.bubblePopped]} />)}</View></Experience>;
}

function AnimatedWave({ wave, onDone }: { wave: Wave; onDone: (id: number) => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: 1100, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) onDone(wave.id); });
    return () => animation.stop();
  }, [onDone, progress, wave.id]);
  return <Animated.View pointerEvents="none" style={[styles.waveRing, { left: wave.x - 42, top: wave.y - 42, opacity: progress.interpolate({ inputRange: [0, 0.16, 1], outputRange: [1, 0.82, 0] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.06, 5.2] }) }] }]} />;
}

function RippleTap() {
  const [waves, setWaves] = useState<Wave[]>([]);
  const nextId = useRef(0);
  const addWave = (x: number, y: number) => { setWaves((current) => [...current, { id: ++nextId.current, x, y }]); tick(); playWave(); };
  const removeWave = (id: number) => setWaves((current) => current.filter((wave) => wave.id !== id));
  const pan = useMemo(() => PanResponder.create({ onStartShouldSetPanResponder: () => true, onStartShouldSetPanResponderCapture: () => true, onPanResponderGrant: (event) => { const touch = event.nativeEvent.touches[0] ?? event.nativeEvent; addWave(touch.locationX, touch.locationY); } }), []);
  return <Experience title="MAKE WAVES" subtitle="every touch keeps its own ripple"><View style={styles.ripplePad} {...pan.panHandlers}><View pointerEvents="none" style={styles.waterGlow} />{waves.map((wave) => <AnimatedWave key={wave.id} wave={wave} onDone={removeWave} />)}</View></Experience>;
}

function ElasticScrub() {
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const current = useRef({ x: 0, y: 0 });
  const start = useRef({ x: 0, y: 0 });
  const lastBand = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const a = position.x.addListener(({ value }) => { current.current.x = value; });
    const b = position.y.addListener(({ value }) => { current.current.y = value; });
    return () => { position.x.removeListener(a); position.y.removeListener(b); if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [position]);
  const home = () => Animated.spring(position, { toValue: { x: 0, y: 0 }, stiffness: 170, damping: 13, mass: 0.85, useNativeDriver: false }).start(({ finished }) => { if (finished) { lastBand.current = 0; tick(); playStretchReturn(); } });
  const resetLater = () => { if (idleTimer.current) clearTimeout(idleTimer.current); idleTimer.current = setTimeout(home, 1000); };
  const elastic = (d: number) => d === 0 ? 0 : Math.sign(d) * 190 * (1 - Math.exp(-Math.abs(d) / 210));
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { if (idleTimer.current) clearTimeout(idleTimer.current); start.current = { ...current.current }; position.stopAnimation(); },
    onPanResponderMove: (_, g) => { const x = elastic(start.current.x + g.dx); const y = elastic(start.current.y + g.dy); position.setValue({ x, y }); const band = Math.floor(Math.hypot(x, y) / 45); if (band !== lastBand.current) { lastBand.current = band; tick(); playStretchTick(Math.hypot(x, y) / 190); } resetLater(); },
    onPanResponderRelease: () => { impact(Haptics.ImpactFeedbackStyle.Medium); resetLater(); }, onPanResponderTerminate: resetLater,
  }), []);
  const bg = position.x.interpolate({ inputRange: [-190, 0, 190], outputRange: ['#31184a', '#11141b', '#4c3510'], extrapolate: 'clamp' });
  return <Experience title="STRETCH IT" subtitle="pull it anywhere"><Animated.View style={[styles.fullSurface, { backgroundColor: bg }]} {...pan.panHandlers}><Animated.View pointerEvents="none" style={[styles.elasticBlob, { transform: [{ translateX: position.x }, { translateY: position.y }] }]}><View style={styles.elasticHighlight} /></Animated.View></Animated.View></Experience>;
}

function PressureGame() {
  const scale = useRef(new Animated.Value(1)).current; const glow = useRef(new Animated.Value(0)).current;
  const press = () => { impact(Haptics.ImpactFeedbackStyle.Light); playPressureStart(); Animated.parallel([Animated.spring(scale, { toValue: 1.85, stiffness: 90, damping: 9, useNativeDriver: true }), Animated.timing(glow, { toValue: 1, duration: 420, useNativeDriver: false })]).start(); };
  const release = () => { impact(Haptics.ImpactFeedbackStyle.Heavy); playPressureRelease(); Animated.parallel([Animated.spring(scale, { toValue: 1, stiffness: 260, damping: 12, useNativeDriver: true }), Animated.timing(glow, { toValue: 0, duration: 240, useNativeDriver: false })]).start(); };
  return <Experience title="PRESSURE" subtitle="hold, then release"><Animated.View style={[styles.fullSurface, { backgroundColor: glow.interpolate({ inputRange: [0, 1], outputRange: ['#12151c', '#3b123d'] }) }]}><Pressable style={styles.centerPress} onPressIn={press} onPressOut={release}><Animated.View style={[styles.pressOrb, { transform: [{ scale }] }]} /></Pressable></Animated.View></Experience>;
}

function SquishGame() {
  const sx = useRef(new Animated.Value(1)).current; const sy = useRef(new Animated.Value(1)).current;
  const squish = () => { tick(); playSquish(); Animated.parallel([Animated.spring(sx, { toValue: 1.55, stiffness: 350, damping: 13, useNativeDriver: true }), Animated.spring(sy, { toValue: 0.58, stiffness: 350, damping: 13, useNativeDriver: true })]).start(); };
  const bounce = () => { impact(Haptics.ImpactFeedbackStyle.Medium); playBounce(); Animated.parallel([Animated.spring(sx, { toValue: 1, stiffness: 180, damping: 7, useNativeDriver: true }), Animated.spring(sy, { toValue: 1, stiffness: 180, damping: 7, useNativeDriver: true })]).start(); };
  return <Experience title="SQUISH IT" subtitle="press · release · repeat"><Pressable style={[styles.fullSurface, styles.squishSurface]} onPressIn={squish} onPressOut={bounce}><Animated.View style={[styles.squishBlob, { transform: [{ scaleX: sx }, { scaleY: sy }] }]} /></Pressable></Experience>;
}

function Game({ game }: { game: GameKind }) { return game === 0 ? <BubblePop /> : game === 1 ? <RippleTap /> : game === 2 ? <ElasticScrub /> : game === 3 ? <PressureGame /> : <SquishGame />; }
function Experience({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <View style={styles.experience}><View style={styles.copy}><Text selectable={false} style={styles.title}>{title}</Text><Text selectable={false} style={styles.subtitle}>{subtitle}</Text></View><View style={styles.gameArea}>{children}</View></View>; }
function MockAd() { return <View style={[styles.experience, styles.ad]}><Text style={styles.adEyebrow}>ADVERTISEMENT SLOT</Text><Text style={styles.adTitle}>7 games first.</Text><Text style={styles.adCopy}>Placeholder proving feed insertion. No SDK yet.</Text></View>; }

function HistoryOverlay({ history, onClose, onReplay }: { history: HistoryEntry[]; onClose: () => void; onReplay: (game: GameKind) => void }) {
  const totals = history.reduce<Record<string, { seconds: number; visits: number }>>((acc, entry) => { const row = acc[entry.label] ?? { seconds: 0, visits: 0 }; row.seconds += entry.seconds; row.visits += 1; acc[entry.label] = row; return acc; }, {});
  return <View style={styles.overlay}><View style={styles.historyCard}><View style={styles.historyHeader}><Text style={styles.historyHeading}>HISTORY</Text><Pressable onPress={onClose}><Text style={styles.close}>✕</Text></Pressable></View><Text style={styles.statsSubtitle}>Stored locally · does not alter the feed</Text><ScrollView>{Object.entries(totals).map(([label, row]) => <View key={label} style={styles.statRow}><Text style={styles.statName}>{label}</Text><Text style={styles.statValue}>{row.visits}× · {Math.round(row.seconds)}s</Text></View>)}<Text style={styles.sectionTitle}>RECENT — TAP TO REPLAY</Text>{history.slice().reverse().map((entry, i) => <Pressable key={`${entry.at}-${i}`} style={styles.historyRow} onPress={() => onReplay(entry.game)}><Text style={styles.historyName}>{entry.label}</Text><Text style={styles.statValue}>{entry.seconds.toFixed(1)}s</Text></Pressable>)}</ScrollView></View></View>;
}

function ReplayOverlay({ game, onClose }: { game: GameKind; onClose: () => void }) { return <View style={styles.replayOverlay}><Pressable style={styles.replayClose} onPress={onClose}><Text style={styles.close}>✕</Text></Pressable><Game game={game} /></View>; }

export default function Home() {
  const initialBatch = useMemo(() => buildFeedBatch(0), []);
  const [items, setItems] = useState<FeedItem[]>(initialBatch);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [replayGame, setReplayGame] = useState<GameKind | null>(null);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const navStartIndex = useRef(0);
  const enteredAt = useRef(Date.now());

  const persist = (nextHistory: HistoryEntry[], nextMuted = muted) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ history: nextHistory.slice(-100), muted: nextMuted })).catch(() => undefined);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') { window.history.scrollRestoration = 'manual'; window.scrollTo(0, 0); }
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const saved = raw ? JSON.parse(raw) as StoredState : {};
      const savedMuted = saved.muted ?? false;
      setMuted(savedMuted); setSynthMuted(savedMuted);
      const first = initialBatch[0];
      const now = Date.now();
      const sessionStart: HistoryEntry = first.kind === 'game' ? { id: `session-${now}`, game: first.game, label: GAME_LABELS[first.game], seconds: 0, at: now } : { id: `session-${now}`, game: 0, label: GAME_LABELS[0], seconds: 0, at: now };
      const nextHistory = [...(saved.history ?? []), sessionStart].slice(-100);
      setHistory(nextHistory); enteredAt.current = now; return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ history: nextHistory, muted: savedMuted }));
    }).finally(() => setReady(true));
  }, [initialBatch]);

  useEffect(() => {
    if (!ready) return;
    const reset = () => listRef.current?.scrollToOffset({ offset: 0, animated: false });
    reset(); const frame = requestAnimationFrame(reset); const timer = setTimeout(reset, 80);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [ready]);

  const appendIfNeeded = (target: number) => {
    if (target < items.length - 2) return;
    setItems((current) => [...current, ...buildFeedBatch(Math.floor(current.length / 8), lastGameIn(current))]);
  };

  const goNext = () => {
    const now = Date.now(); const current = items[currentIndex]; let nextHistory = history;
    if (current?.kind === 'game') {
      const elapsed = Math.max(0.1, (now - enteredAt.current) / 1000);
      const last = history[history.length - 1];
      if (last?.id.startsWith('session-') && last.seconds === 0 && last.game === current.game) nextHistory = [...history.slice(0, -1), { ...last, seconds: elapsed }];
      else nextHistory = [...history, { id: current.id, game: current.game, label: GAME_LABELS[current.game], seconds: elapsed, at: now }].slice(-100);
    }
    const next = currentIndex + 1; appendIfNeeded(next); setHistory(nextHistory); setCurrentIndex(next); enteredAt.current = now;
    listRef.current?.scrollToOffset({ offset: next * SCREEN_HEIGHT, animated: true }); impact(Haptics.ImpactFeedbackStyle.Medium); persist(nextHistory);
  };

  const bottomNav = useMemo(() => PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderGrant: () => { navStartIndex.current = currentIndex; }, onPanResponderRelease: (_, g) => { if (g.dy < -42 && currentIndex === navStartIndex.current) goNext(); } }), [currentIndex, items.length, history]);
  const toggleMute = () => { const next = !muted; setMuted(next); setSynthMuted(next); persist(history, next); };

  if (!ready) return <View style={styles.loading} />;
  return <View style={styles.root}><FlatList ref={listRef} data={items} keyExtractor={(item) => item.id} renderItem={({ item }) => item.kind === 'ad' ? <MockAd /> : <Game game={item.game} />} scrollEnabled={false} initialNumToRender={3} maxToRenderPerBatch={4} windowSize={5} showsVerticalScrollIndicator={false} getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })} style={styles.list} /><Pressable style={styles.historyButton} onPress={() => setShowHistory(true)}><Text style={styles.microText}>HISTORY</Text></Pressable><Pressable style={styles.soundButton} onPress={toggleMute}><Text style={styles.microText}>{muted ? 'SOUND OFF' : 'SOUND ON'}</Text></Pressable><View style={[styles.bottomNavZone, { height: NAV_ZONE_HEIGHT }]} {...bottomNav.panHandlers}><View pointerEvents="none" style={styles.navSeparator} /><View pointerEvents="none" style={styles.navPill} /><Text style={styles.navHint}>SWIPE UP · NEXT</Text></View><View pointerEvents="none" style={styles.commitBadge}><Text style={styles.commitText}>POC {COMMIT_SHA}</Text></View>{showHistory && <HistoryOverlay history={history} onClose={() => setShowHistory(false)} onReplay={(game) => { setShowHistory(false); setReplayGame(game); }} />}{replayGame !== null && <ReplayOverlay game={replayGame} onClose={() => setReplayGame(null)} />}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08090c', ...(Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none' } as object) : {}) }, list: { flex: 1, backgroundColor: '#08090c' }, loading: { flex: 1, backgroundColor: '#08090c' },
  experience: { height: SCREEN_HEIGHT, backgroundColor: '#08090c', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'web' ? 40 : 72, paddingBottom: NAV_ZONE_HEIGHT + 12 }, copy: { alignItems: 'center', gap: 6, zIndex: 2 }, title: { color: '#f7f7f7', fontSize: 34, fontWeight: '900', letterSpacing: 1.5 }, subtitle: { color: '#8b8e99', fontSize: 14 }, gameArea: { flex: 1, width: '100%', alignItems: 'stretch', justifyContent: 'stretch', overflow: 'hidden' },
  bottomNavZone: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, alignItems: 'center', justifyContent: 'center', paddingTop: 12 }, navSeparator: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#343840' }, navPill: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#555b66', marginBottom: 10 }, navHint: { color: '#868c98', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  historyButton: { position: 'absolute', top: Platform.OS === 'web' ? 8 : 42, left: 10, zIndex: 30, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' }, soundButton: { position: 'absolute', top: Platform.OS === 'web' ? 8 : 42, left: 82, zIndex: 30, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' }, microText: { color: '#8b8e99', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }, commitBadge: { position: 'absolute', top: Platform.OS === 'web' ? 8 : 42, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', zIndex: 30 }, commitText: { color: '#8b8e99', fontSize: 10, fontWeight: '700' },
  bubbleGrid: { width: 330, maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto', gap: 10 }, bubble: { backgroundColor: '#8fd3ff', borderWidth: 3, borderColor: '#c9ecff', shadowColor: '#8fd3ff', shadowOpacity: 0.6, shadowRadius: 14 }, bubblePopped: { opacity: 0.08, transform: [{ scale: 0.72 }] },
  ripplePad: { flex: 1, width: '100%', borderRadius: 24, backgroundColor: '#101724', overflow: 'hidden', borderWidth: 1, borderColor: '#263349', marginTop: 16, marginBottom: 16 }, waterGlow: { position: 'absolute', left: '20%', top: '15%', width: '60%', height: '65%', borderRadius: 180, backgroundColor: '#223c5a', opacity: 0.38 }, waveRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#b8dfff', shadowColor: '#93cbff', shadowOpacity: 0.75, shadowRadius: 8 },
  fullSurface: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 24, marginTop: 16, marginBottom: 16 }, elasticBlob: { width: 118, height: 118, borderRadius: 59, backgroundColor: '#ffd66b', borderWidth: 7, borderColor: '#fff0ad', shadowColor: '#ffd66b', shadowOpacity: 0.65, shadowRadius: 22 }, elasticHighlight: { position: 'absolute', width: 30, height: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', top: 18, left: 22, transform: [{ rotate: '-22deg' }] }, centerPress: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }, pressOrb: { width: 94, height: 94, borderRadius: 47, backgroundColor: '#ef77ff', borderWidth: 7, borderColor: '#ffd6ff', shadowColor: '#ef77ff', shadowOpacity: 0.8, shadowRadius: 22 }, squishSurface: { backgroundColor: '#12201b' }, squishBlob: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#70f0ac', borderWidth: 8, borderColor: '#c7ffdf', shadowColor: '#70f0ac', shadowOpacity: 0.7, shadowRadius: 20 },
  ad: { justifyContent: 'center', gap: 18, backgroundColor: '#11131a' }, adEyebrow: { color: '#74798b', fontSize: 11, letterSpacing: 2 }, adTitle: { color: '#f5f5f5', fontSize: 30, fontWeight: '800' }, adCopy: { color: '#8b8e99', fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 18 }, historyCard: { width: '100%', maxWidth: 460, maxHeight: '88%', borderRadius: 24, backgroundColor: '#151820', padding: 20, borderWidth: 1, borderColor: '#2b303b' }, historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, historyHeading: { color: '#f5f5f5', fontWeight: '900', fontSize: 20 }, close: { color: '#c5cad5', fontSize: 24, padding: 5 }, statsSubtitle: { color: '#777e8d', fontSize: 12, marginTop: 5, marginBottom: 16 }, statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#252934' }, statName: { color: '#dadee7', fontWeight: '700' }, statValue: { color: '#9299a8' }, sectionTitle: { color: '#777e8d', fontSize: 11, letterSpacing: 1.4, marginTop: 20, marginBottom: 8 }, historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#252934' }, historyName: { color: '#dce0e8', fontWeight: '700' },
  replayOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 110, backgroundColor: '#08090c' }, replayClose: { position: 'absolute', top: Platform.OS === 'web' ? 8 : 42, right: 12, zIndex: 120, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10 },
});
