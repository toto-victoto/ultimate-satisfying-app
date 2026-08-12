import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type FeedItem =
  | { id: string; kind: 'game'; game: 0 | 1 | 2 }
  | { id: string; kind: 'ad' };

const STORAGE_KEY = 'ultimate-satisfying-state-v1';
const COMMIT_SHA = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? 'local';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const NAV_ZONE_HEIGHT = Math.max(90, Math.min(140, SCREEN_HEIGHT * 0.14));

function buildItems(start: number, count = 24): FeedItem[] {
  return Array.from({ length: count }, (_, offset) => {
    const i = start + offset;
    if (i > 0 && i % 7 === 0) return { id: `ad-${i}`, kind: 'ad' };
    return { id: `game-${i}`, kind: 'game', game: (i % 3) as 0 | 1 | 2 };
  });
}

function popHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

function BubblePop() {
  const [seed, setSeed] = useState(0);
  const bubbles = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ id: `${seed}-${i}`, size: 42 + ((i * 17 + seed * 9) % 34) })),
    [seed],
  );
  const [popped, setPopped] = useState<Record<string, boolean>>({});
  const pop = (id: string) => { setPopped((p) => ({ ...p, [id]: true })); popHaptic(); };
  useEffect(() => {
    if (Object.keys(popped).length >= bubbles.length) {
      const timer = setTimeout(() => { setPopped({}); setSeed((s) => s + 1); }, 180);
      return () => clearTimeout(timer);
    }
  }, [popped, bubbles.length]);
  return <Experience title="POP THEM" subtitle="tap forever"><View style={styles.bubbleGrid}>{bubbles.map((bubble) => <Pressable key={bubble.id} onPressIn={() => pop(bubble.id)} style={[styles.bubble, { width: bubble.size, height: bubble.size, borderRadius: bubble.size / 2 }, popped[bubble.id] && styles.bubblePopped]} />)}</View></Experience>;
}

function RippleTap() {
  const [rings, setRings] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const id = useRef(0);
  const addRing = (x: number, y: number) => { setRings((r) => [...r.slice(-11), { id: ++id.current, x, y }]); popHaptic(); };
  return <Experience title="MAKE WAVES" subtitle="touch anywhere"><Pressable style={styles.ripplePad} onPressIn={(event) => { const { locationX, locationY } = event.nativeEvent; addRing(locationX, locationY); }}>{rings.map((ring, index) => { const age = rings.length - 1 - index; const size = 70 + age * 16; return <View key={ring.id} pointerEvents="none" style={[styles.ring, { left: ring.x - size / 2, top: ring.y - size / 2, width: size, height: size, borderRadius: size / 2, opacity: Math.max(0.12, 0.82 - age * 0.06) }]} />; })}</Pressable></Experience>;
}

function HorizontalScrub() {
  const [x, setX] = useState(0);
  const xRef = useRef(0);
  const startX = useRef(0);
  const updateX = (next: number) => { const clamped = Math.max(-120, Math.min(120, next)); xRef.current = clamped; setX(clamped); };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4,
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 4,
    onPanResponderGrant: () => { startX.current = xRef.current; },
    onPanResponderMove: (_, gesture) => updateX(startX.current + gesture.dx),
    onPanResponderRelease: () => popHaptic(),
  }), []);
  return <Experience title="SCRUB IT" subtitle="drag in any direction — the game owns the center"><View style={styles.scrubTrack} {...pan.panHandlers}><View style={[styles.scrubGlow, { transform: [{ translateX: x }] }]} /><View style={[styles.scrubTrail, { width: Math.abs(x) + 46, left: x < 0 ? 165 + x : 165 }]} /><View style={[styles.scrubHandle, { transform: [{ translateX: x }] }]} /></View></Experience>;
}

function Experience({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <View style={styles.experience}><View style={styles.copy}><Text selectable={false} style={styles.title}>{title}</Text><Text selectable={false} style={styles.subtitle}>{subtitle}</Text></View><View style={styles.gameArea}>{children}</View><Text selectable={false} style={styles.swipeHint}>swipe from the bottom edge for next ↑</Text></View>;
}

function MockAd() {
  return <View style={[styles.experience, styles.ad]}><Text selectable={false} style={styles.adEyebrow}>ADVERTISEMENT SLOT</Text><Text selectable={false} style={styles.adTitle}>Your future ad goes here.</Text><Text selectable={false} style={styles.adCopy}>Same feed mechanics, no ad SDK yet.</Text><Text selectable={false} style={styles.swipeHint}>swipe from an edge to continue</Text></View>;
}

export default function Home() {
  const [items, setItems] = useState(() => buildItems(0));
  const [initialIndex, setInitialIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const navStartIndex = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as { index?: number };
      if (typeof saved.index === 'number' && saved.index > 0) {
        setItems(buildItems(0, Math.max(24, saved.index + 12)));
        setInitialIndex(saved.index);
        setCurrentIndex(saved.index);
      }
    }).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || initialIndex === 0) return;
    requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: initialIndex, animated: false }));
  }, [ready, initialIndex]);

  const goTo = (index: number) => {
    const next = Math.max(0, index);
    if (next >= items.length - 6) setItems((current) => [...current, ...buildItems(current.length)]);
    setCurrentIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ index: next })).catch(() => undefined);
  };

  const makeNavPan = (direction: 'up' | 'down') => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { navStartIndex.current = currentIndex; },
    onPanResponderRelease: (_, gesture) => {
      const valid = direction === 'up' ? gesture.dy < -45 : gesture.dy > 45;
      if (valid) goTo(navStartIndex.current + (direction === 'up' ? 1 : -1));
    },
  });

  const topNav = useMemo(() => makeNavPan('down'), [currentIndex, items.length]);
  const bottomNav = useMemo(() => makeNavPan('up'), [currentIndex, items.length]);

  if (!ready) return <View style={styles.loading} />;

  return <View style={styles.root}>
    <FlatList ref={listRef} data={items} keyExtractor={(item) => item.id} renderItem={({ item }) => item.kind === 'ad' ? <MockAd /> : item.game === 0 ? <BubblePop /> : item.game === 1 ? <RippleTap /> : <HorizontalScrub />} scrollEnabled={false} showsVerticalScrollIndicator={false} getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })} style={styles.list} />
    <View style={[styles.navZone, styles.topNavZone, { height: NAV_ZONE_HEIGHT }]} {...topNav.panHandlers}><Text selectable={false} style={styles.navHint}>↓ PREVIOUS</Text></View>
    <View style={[styles.navZone, styles.bottomNavZone, { height: NAV_ZONE_HEIGHT }]} {...bottomNav.panHandlers}><Text selectable={false} style={styles.navHint}>NEXT ↑</Text></View>
    <View pointerEvents="none" style={styles.commitBadge}><Text selectable={false} style={styles.commitText}>POC {COMMIT_SHA}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08090c', ...(Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none' } as object) : {}) },
  list: { flex: 1, backgroundColor: '#08090c' }, loading: { flex: 1, backgroundColor: '#08090c' },
  navZone: { position: 'absolute', left: 0, right: 0, zIndex: 20, alignItems: 'center', opacity: 0.28 },
  topNavZone: { top: 0, justifyContent: 'flex-start', paddingTop: Platform.OS === 'web' ? 8 : 38 },
  bottomNavZone: { bottom: 0, justifyContent: 'flex-end', paddingBottom: 12 },
  navHint: { color: '#9ca0ad', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  commitBadge: { position: 'absolute', top: Platform.OS === 'web' ? 8 : 42, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', zIndex: 30 },
  commitText: { color: '#8b8e99', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  experience: { height: SCREEN_HEIGHT, backgroundColor: '#08090c', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: Platform.OS === 'web' ? 40 : 72, paddingBottom: 30 },
  copy: { alignItems: 'center', gap: 6 }, title: { color: '#f7f7f7', fontSize: 34, fontWeight: '900', letterSpacing: 1.5 }, subtitle: { color: '#8b8e99', fontSize: 14, letterSpacing: 0.5 }, swipeHint: { color: '#666a76', fontSize: 12, letterSpacing: 0.6 }, gameArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  bubbleGrid: { width: 330, maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10 }, bubble: { backgroundColor: '#8fd3ff', borderWidth: 3, borderColor: '#c9ecff', shadowColor: '#8fd3ff', shadowOpacity: 0.6, shadowRadius: 14 }, bubblePopped: { opacity: 0.08, transform: [{ scale: 0.72 }] },
  ripplePad: { width: 330, height: 430, maxWidth: '100%', borderRadius: 42, backgroundColor: '#151822', overflow: 'hidden', borderWidth: 1, borderColor: '#252b3c' }, ring: { position: 'absolute', borderWidth: 4, borderColor: '#b4a7ff' },
  scrubTrack: { width: 330, maxWidth: '100%', height: 150, borderRadius: 80, backgroundColor: '#16191f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, scrubGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#ffd66b', opacity: 0.18 }, scrubTrail: { position: 'absolute', height: 14, top: 68, borderRadius: 8, backgroundColor: '#ffd66b', opacity: 0.4 }, scrubHandle: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#ffd66b', borderWidth: 7, borderColor: '#fff1ba' },
  ad: { justifyContent: 'center', gap: 18, backgroundColor: '#11131a' }, adEyebrow: { color: '#74798b', fontSize: 11, letterSpacing: 2 }, adTitle: { color: '#f5f5f5', fontSize: 30, fontWeight: '800', textAlign: 'center' }, adCopy: { color: '#8b8e99', fontSize: 14, textAlign: 'center' },
});
