import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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

type Wave = { id: number; x: number; y: number };

const STORAGE_KEY = 'ultimate-satisfying-state-v1';
const COMMIT_SHA = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? 'local';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const NAV_ZONE_HEIGHT = Math.max(96, Math.min(132, SCREEN_HEIGHT * 0.13));

function buildItems(start: number, count = 24): FeedItem[] {
  return Array.from({ length: count }, (_, offset) => {
    const i = start + offset;
    if (i > 0 && i % 7 === 0) return { id: `ad-${i}`, kind: 'ad' };
    return { id: `game-${i}`, kind: 'game', game: (i % 3) as 0 | 1 | 2 };
  });
}

function impact(style: Haptics.ImpactFeedbackStyle) {
  Haptics.impactAsync(style).catch(() => undefined);
}

function softTick() {
  Haptics.selectionAsync().catch(() => undefined);
}

function BubblePop() {
  const [seed, setSeed] = useState(0);
  const bubbles = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ id: `${seed}-${i}`, size: 42 + ((i * 17 + seed * 9) % 34) })),
    [seed],
  );
  const [popped, setPopped] = useState<Record<string, boolean>>({});

  const pop = (id: string) => {
    setPopped((p) => ({ ...p, [id]: true }));
    impact(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (Object.keys(popped).length >= bubbles.length) {
      const timer = setTimeout(() => {
        setPopped({});
        setSeed((s) => s + 1);
        impact(Haptics.ImpactFeedbackStyle.Medium);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [popped, bubbles.length]);

  return (
    <Experience title="POP THEM" subtitle="tap forever">
      <View style={styles.bubbleGrid}>
        {bubbles.map((bubble) => (
          <Pressable
            key={bubble.id}
            onPressIn={() => pop(bubble.id)}
            style={[
              styles.bubble,
              { width: bubble.size, height: bubble.size, borderRadius: bubble.size / 2 },
              popped[bubble.id] && styles.bubblePopped,
            ]}
          />
        ))}
      </View>
    </Experience>
  );
}

function AnimatedWave({ wave, onDone }: { wave: Wave; onDone: (id: number) => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => onDone(wave.id));
  }, [onDone, progress, wave.id]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.08, 4.2] });
  const opacity = progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.95, 0.76, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.waveRing,
        {
          left: wave.x - 42,
          top: wave.y - 42,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function RippleTap() {
  const [waves, setWaves] = useState<Wave[]>([]);
  const id = useRef(0);

  const addWave = (x: number, y: number) => {
    setWaves((current) => [...current, { id: ++id.current, x, y }]);
    softTick();
  };

  const removeWave = (waveId: number) => {
    setWaves((current) => current.filter((wave) => wave.id !== waveId));
  };

  return (
    <Experience title="MAKE WAVES" subtitle="every touch creates a new ripple">
      <Pressable
        style={styles.ripplePad}
        onPressIn={(event) => {
          const { locationX, locationY } = event.nativeEvent;
          addWave(locationX, locationY);
        }}
      >
        <View pointerEvents="none" style={styles.waterGlow} />
        {waves.map((wave) => <AnimatedWave key={wave.id} wave={wave} onDone={removeWave} />)}
      </Pressable>
    </Experience>
  );
}

function ElasticScrub() {
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const lastHapticBand = useRef(0);

  useEffect(() => {
    const xListener = position.x.addListener(({ value }) => { current.current.x = value; });
    const yListener = position.y.addListener(({ value }) => { current.current.y = value; });
    return () => {
      position.x.removeListener(xListener);
      position.y.removeListener(yListener);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [position]);

  const springHome = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      stiffness: 170,
      damping: 13,
      mass: 0.85,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        lastHapticBand.current = 0;
        softTick();
      }
    });
  };

  const scheduleReset = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(springHome, 1000);
  };

  const elastic = (distance: number) => {
    if (distance === 0) return 0;
    const sign = distance < 0 ? -1 : 1;
    return sign * 190 * (1 - Math.exp(-Math.abs(distance) / 210));
  };

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      start.current = { ...current.current };
      position.stopAnimation();
      lastHapticBand.current = Math.floor(Math.hypot(current.current.x, current.current.y) / 45);
    },
    onPanResponderMove: (_, gesture) => {
      const nextX = elastic(start.current.x + gesture.dx);
      const nextY = elastic(start.current.y + gesture.dy);
      position.setValue({ x: nextX, y: nextY });
      const band = Math.floor(Math.hypot(nextX, nextY) / 45);
      if (band !== lastHapticBand.current) {
        lastHapticBand.current = band;
        softTick();
      }
      scheduleReset();
    },
    onPanResponderRelease: () => {
      impact(Haptics.ImpactFeedbackStyle.Medium);
      scheduleReset();
    },
    onPanResponderTerminate: scheduleReset,
  }), []);

  const backgroundColor = position.x.interpolate({
    inputRange: [-190, 0, 190],
    outputRange: ['#31184a', '#11141b', '#4c3510'],
    extrapolate: 'clamp',
  });
  const scaleX = position.x.interpolate({ inputRange: [-190, 0, 190], outputRange: [1.22, 1, 1.22], extrapolate: 'clamp' });
  const scaleY = position.y.interpolate({ inputRange: [-190, 0, 190], outputRange: [1.22, 1, 1.22], extrapolate: 'clamp' });
  const rotate = position.x.interpolate({ inputRange: [-190, 0, 190], outputRange: ['-12deg', '0deg', '12deg'], extrapolate: 'clamp' });

  return (
    <Experience title="STRETCH IT" subtitle="pull it anywhere">
      <Animated.View style={[styles.scrubSurface, { backgroundColor }]} {...pan.panHandlers}>
        <View pointerEvents="none" style={styles.scrubCenterCross} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.elasticBlob,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { scaleX },
                { scaleY },
                { rotate },
              ],
            },
          ]}
        >
          <View style={styles.elasticHighlight} />
        </Animated.View>
      </Animated.View>
    </Experience>
  );
}

function Experience({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.experience}>
      <View style={styles.copy}>
        <Text selectable={false} style={styles.title}>{title}</Text>
        <Text selectable={false} style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.gameArea}>{children}</View>
    </View>
  );
}

function MockAd() {
  return (
    <View style={[styles.experience, styles.ad]}>
      <Text selectable={false} style={styles.adEyebrow}>ADVERTISEMENT SLOT</Text>
      <Text selectable={false} style={styles.adTitle}>Your future ad goes here.</Text>
      <Text selectable={false} style={styles.adCopy}>Same feed mechanics, no ad SDK yet.</Text>
    </View>
  );
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

  const goNext = () => {
    const next = currentIndex + 1;
    if (next >= items.length - 6) setItems((current) => [...current, ...buildItems(current.length)]);
    setCurrentIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
    impact(Haptics.ImpactFeedbackStyle.Medium);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ index: next })).catch(() => undefined);
  };

  const bottomNav = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { navStartIndex.current = currentIndex; },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -42 && currentIndex === navStartIndex.current) goNext();
    },
  }), [currentIndex, items.length]);

  if (!ready) return <View style={styles.loading} />;

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => item.kind === 'ad' ? <MockAd /> : item.game === 0 ? <BubblePop /> : item.game === 1 ? <RippleTap /> : <ElasticScrub />}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })}
        style={styles.list}
      />
      <View style={[styles.bottomNavZone, { height: NAV_ZONE_HEIGHT }]} {...bottomNav.panHandlers}>
        <View pointerEvents="none" style={styles.navSeparator} />
        <View pointerEvents="none" style={styles.navPill} />
        <Text selectable={false} style={styles.navHint}>SWIPE UP · NEXT</Text>
      </View>
      <View pointerEvents="none" style={styles.commitBadge}>
        <Text selectable={false} style={styles.commitText}>POC {COMMIT_SHA}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08090c',
    ...(Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none' } as object) : {}),
  },
  list: { flex: 1, backgroundColor: '#08090c' },
  loading: { flex: 1, backgroundColor: '#08090c' },
  bottomNavZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  navSeparator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#343840',
  },
  navPill: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#555b66', marginBottom: 10 },
  navHint: { color: '#868c98', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  commitBadge: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 8 : 42,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    zIndex: 30,
  },
  commitText: { color: '#8b8e99', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  experience: {
    height: SCREEN_HEIGHT,
    backgroundColor: '#08090c',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 40 : 72,
    paddingBottom: NAV_ZONE_HEIGHT + 12,
  },
  copy: { alignItems: 'center', gap: 6, zIndex: 2 },
  title: { color: '#f7f7f7', fontSize: 34, fontWeight: '900', letterSpacing: 1.5 },
  subtitle: { color: '#8b8e99', fontSize: 14, letterSpacing: 0.5 },
  gameArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bubbleGrid: { width: 330, maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10 },
  bubble: { backgroundColor: '#8fd3ff', borderWidth: 3, borderColor: '#c9ecff', shadowColor: '#8fd3ff', shadowOpacity: 0.6, shadowRadius: 14 },
  bubblePopped: { opacity: 0.08, transform: [{ scale: 0.72 }] },
  ripplePad: {
    width: '100%',
    maxWidth: 520,
    height: '86%',
    minHeight: 420,
    borderRadius: 38,
    backgroundColor: '#101724',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#263349',
  },
  waterGlow: { position: 'absolute', left: '25%', top: '20%', width: '50%', height: '55%', borderRadius: 160, backgroundColor: '#223c5a', opacity: 0.38 },
  waveRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#b8dfff', shadowColor: '#93cbff', shadowOpacity: 0.75, shadowRadius: 8 },
  scrubSurface: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 34,
  },
  scrubCenterCross: {
    position: 'absolute',
    width: 2,
    height: '68%',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  elasticBlob: { width: 118, height: 118, borderRadius: 59, backgroundColor: '#ffd66b', borderWidth: 7, borderColor: '#fff0ad', shadowColor: '#ffd66b', shadowOpacity: 0.65, shadowRadius: 22 },
  elasticHighlight: { position: 'absolute', width: 30, height: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', top: 18, left: 22, transform: [{ rotate: '-22deg' }] },
  ad: { justifyContent: 'center', gap: 18, backgroundColor: '#11131a' },
  adEyebrow: { color: '#74798b', fontSize: 11, letterSpacing: 2 },
  adTitle: { color: '#f5f5f5', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  adCopy: { color: '#8b8e99', fontSize: 14, textAlign: 'center' },
});
