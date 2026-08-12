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
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: `${seed}-${i}`,
        size: 42 + ((i * 17 + seed * 9) % 34),
      })),
    [seed],
  );
  const [popped, setPopped] = useState<Record<string, boolean>>({});

  const pop = (id: string) => {
    setPopped((p) => ({ ...p, [id]: true }));
    popHaptic();
  };

  useEffect(() => {
    if (Object.keys(popped).length >= bubbles.length) {
      const timer = setTimeout(() => {
        setPopped({});
        setSeed((s) => s + 1);
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
            onPress={() => pop(bubble.id)}
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

function RippleTap() {
  const [rings, setRings] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const id = useRef(0);

  return (
    <Experience title="MAKE WAVES" subtitle="every touch matters">
      <Pressable
        style={styles.ripplePad}
        onPress={(event) => {
          const { locationX, locationY } = event.nativeEvent;
          const next = { id: ++id.current, x: locationX, y: locationY };
          setRings((r) => [...r.slice(-16), next]);
          popHaptic();
        }}
      >
        {rings.map((ring, index) => (
          <View
            key={ring.id}
            pointerEvents="none"
            style={[
              styles.ring,
              {
                left: ring.x - 38 - index * 2,
                top: ring.y - 38 - index * 2,
                width: 76 + index * 4,
                height: 76 + index * 4,
                borderRadius: 80,
                opacity: Math.max(0.15, 1 - index / 18),
              },
            ]}
          />
        ))}
      </Pressable>
    </Experience>
  );
}

function HorizontalScrub() {
  const [x, setX] = useState(0);
  const lastX = useRef(0);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderGrant: () => {
          lastX.current = x;
        },
        onPanResponderMove: (_, gesture) => {
          setX(Math.max(-120, Math.min(120, lastX.current + gesture.dx)));
        },
        onPanResponderRelease: () => popHaptic(),
      }),
    [x],
  );

  return (
    <Experience title="SCRUB IT" subtitle="horizontal drag • vertical swipe stays navigation">
      <View style={styles.scrubTrack} {...pan.panHandlers}>
        <View style={[styles.scrubGlow, { transform: [{ translateX: x }] }]} />
        <View style={[styles.scrubHandle, { transform: [{ translateX: x }] }]} />
      </View>
    </Experience>
  );
}

function Experience({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.experience}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.gameArea}>{children}</View>
      <Text style={styles.swipeHint}>swipe up for the next feeling ↑</Text>
    </View>
  );
}

function MockAd() {
  return (
    <View style={[styles.experience, styles.ad]}>
      <Text style={styles.adEyebrow}>ADVERTISEMENT SLOT</Text>
      <Text style={styles.adTitle}>Your future ad goes here.</Text>
      <Text style={styles.adCopy}>Same feed mechanics, no ad SDK yet.</Text>
      <Text style={styles.swipeHint}>swipe up to continue ↑</Text>
    </View>
  );
}

export default function Home() {
  const [items, setItems] = useState(() => buildItems(0));
  const [initialIndex, setInitialIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const listRef = useRef<FlatList<FeedItem>>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as { index?: number };
        if (typeof saved.index === 'number' && saved.index > 0) {
          const required = Math.max(24, saved.index + 12);
          setItems(buildItems(0, required));
          setInitialIndex(saved.index);
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || initialIndex === 0) return;
    requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: initialIndex, animated: false }));
  }, [ready, initialIndex]);

  if (!ready) return <View style={styles.loading} />;

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        if (item.kind === 'ad') return <MockAd />;
        if (item.game === 0) return <BubblePop />;
        if (item.game === 1) return <RippleTap />;
        return <HorizontalScrub />;
      }}
      pagingEnabled
      snapToInterval={SCREEN_HEIGHT}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })}
      onEndReached={() => setItems((current) => [...current, ...buildItems(current.length)])}
      onEndReachedThreshold={0.6}
      onMomentumScrollEnd={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ index })).catch(() => undefined);
      }}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#08090c' },
  loading: { flex: 1, backgroundColor: '#08090c' },
  experience: {
    height: SCREEN_HEIGHT,
    backgroundColor: '#08090c',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 40 : 72,
    paddingBottom: 30,
  },
  copy: { alignItems: 'center', gap: 6 },
  title: { color: '#f7f7f7', fontSize: 34, fontWeight: '900', letterSpacing: 1.5 },
  subtitle: { color: '#8b8e99', fontSize: 14, letterSpacing: 0.5 },
  swipeHint: { color: '#666a76', fontSize: 12, letterSpacing: 0.6 },
  gameArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  bubbleGrid: {
    width: 330,
    maxWidth: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  bubble: {
    backgroundColor: '#8fd3ff',
    borderWidth: 3,
    borderColor: '#c9ecff',
    shadowColor: '#8fd3ff',
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  bubblePopped: { opacity: 0.08, transform: [{ scale: 0.72 }] },
  ripplePad: {
    width: 330,
    height: 430,
    maxWidth: '100%',
    borderRadius: 42,
    backgroundColor: '#151822',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#252b3c',
  },
  ring: { position: 'absolute', borderWidth: 5, borderColor: '#b4a7ff' },
  scrubTrack: {
    width: 330,
    maxWidth: '100%',
    height: 150,
    borderRadius: 80,
    backgroundColor: '#16191f',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scrubGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ffd66b',
    opacity: 0.18,
  },
  scrubHandle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#ffd66b',
    borderWidth: 7,
    borderColor: '#fff1ba',
  },
  ad: { justifyContent: 'center', gap: 18, backgroundColor: '#11131a' },
  adEyebrow: { color: '#74798b', fontSize: 11, letterSpacing: 2 },
  adTitle: { color: '#f5f5f5', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  adCopy: { color: '#8b8e99', fontSize: 14, textAlign: 'center' },
});
