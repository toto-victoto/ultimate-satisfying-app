import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameKind } from '../lib/feed';
import { playBounce, playPop, playPressureRelease, playPressureStart, playSquish, playStretchReturn, playStretchTick, playWave } from '../lib/synth-audio';

type Wave = { id: number; x: number; y: number };
const POP_COLORS = [
  { fill: '#9b83d7', rim: '#cbbcf1', glow: '#a98cff' },
  { fill: '#8eacd5', rim: '#c8dbf2', glow: '#9fc6ff' },
  { fill: '#9ebfb2', rim: '#cde3da', glow: '#a9d8c5' },
  { fill: '#d9a0ae', rim: '#f0c8d2', glow: '#efb0c1' },
  { fill: '#d6c3a6', rim: '#eadbc4', glow: '#ead1ad' },
];

function impact(style: Haptics.ImpactFeedbackStyle) { Haptics.impactAsync(style).catch(() => undefined); }
function tick() { Haptics.selectionAsync().catch(() => undefined); }

function seeded(seed: number) {
  let value = seed || 1;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function Experience({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <View style={styles.experience}><View style={styles.copy}><Text selectable={false} style={styles.title}>{title}</Text><Text selectable={false} style={styles.subtitle}>{subtitle}</Text></View><View style={styles.gameArea}>{children}</View></View>;
}

function TactileBubble({ id, size, colorIndex, popped, onPop }: { id: string; size: number; colorIndex: number; popped: boolean; onPop: (id: string, size: number) => void }) {
  const press = useRef(new Animated.Value(0)).current;
  const collapse = useRef(new Animated.Value(0)).current;
  const [collapsed, setCollapsed] = useState(false);
  const palette = POP_COLORS[colorIndex % POP_COLORS.length];

  useEffect(() => {
    if (!popped) {
      setCollapsed(false);
      press.setValue(0);
      collapse.setValue(0);
    }
  }, [collapse, popped, press]);

  const trigger = () => {
    if (popped || collapsed) return;
    Animated.sequence([
      Animated.spring(press, { toValue: 1, stiffness: 620, damping: 27, mass: 0.38, useNativeDriver: true }),
      Animated.timing(collapse, { toValue: 1, duration: 95, useNativeDriver: true }),
    ]).start(() => setCollapsed(true));
    setTimeout(() => onPop(id, size), 58);
  };

  if (collapsed) return <View style={[styles.popSocket, { width: size, height: size, borderRadius: size / 2 }]}><View style={styles.socketInner} /></View>;

  const scaleX = Animated.multiply(press.interpolate({ inputRange: [0, 1], outputRange: [1, 1.11] }), collapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.38] }));
  const scaleY = Animated.multiply(press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.84] }), collapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.18] }));
  const opacity = collapse.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.85, 0] });

  return <Pressable onPressIn={trigger}>
    <Animated.View style={[styles.tactileBubble, { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.fill, borderColor: palette.rim, shadowColor: palette.glow, opacity, transform: [{ scaleX }, { scaleY }] }]}>
      <View style={[styles.bubbleShade, { borderRadius: size / 2 }]} />
      <View style={[styles.bubbleHighlight, { width: size * 0.3, height: size * 0.14, borderRadius: size, top: size * 0.16, left: size * 0.18 }]} />
      <View style={[styles.bubblePin, { width: size * 0.08, height: size * 0.08, borderRadius: size, right: size * 0.19, bottom: size * 0.21 }]} />
    </Animated.View>
  </Pressable>;
}

function BubblePop() {
  const [seed, setSeed] = useState(1);
  const bubbles = useMemo(() => {
    const random = seeded(seed * 7919 + 17);
    const items = Array.from({ length: 28 }, (_, i) => ({
      id: `${seed}-${i}`,
      size: 44 + Math.floor(random() * 25),
      colorIndex: Math.floor(random() * POP_COLORS.length),
      order: random(),
    }));
    return items.sort((a, b) => a.order - b.order);
  }, [seed]);
  const [popped, setPopped] = useState<Record<string, boolean>>({});
  const pop = (id: string, size: number) => {
    setPopped((current) => current[id] ? current : { ...current, [id]: true });
    impact(Haptics.ImpactFeedbackStyle.Light);
    playPop(size);
  };
  useEffect(() => {
    if (Object.keys(popped).length < bubbles.length) return;
    const timer = setTimeout(() => { setPopped({}); setSeed((s) => s + 1); impact(Haptics.ImpactFeedbackStyle.Medium); }, 520);
    return () => clearTimeout(timer);
  }, [popped, bubbles.length]);
  return <Experience title="POP THEM" subtitle="tap forever"><View style={styles.popTray}><View style={styles.bubbleGrid}>{bubbles.map((b) => <TactileBubble key={b.id} {...b} popped={Boolean(popped[b.id])} onPop={pop} />)}</View></View></Experience>;
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
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (event) => { const touch = event.nativeEvent.touches[0] ?? event.nativeEvent; addWave(touch.locationX, touch.locationY); },
  }), []);
  return <Experience title="MAKE WAVES" subtitle="every touch keeps its own ripple"><View style={styles.ripplePad} {...pan.panHandlers}><View pointerEvents="none" style={styles.waterGlow} />{waves.map((wave) => <AnimatedWave key={wave.id} wave={wave} onDone={removeWave} />)}</View></Experience>;
}

function ElasticScrub() {
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const current = useRef({ x: 0, y: 0 }); const start = useRef({ x: 0, y: 0 }); const lastBand = useRef(0); const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const a = position.x.addListener(({ value }) => { current.current.x = value; });
    const b = position.y.addListener(({ value }) => { current.current.y = value; });
    return () => { position.x.removeListener(a); position.y.removeListener(b); if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [position]);
  const home = () => Animated.spring(position, { toValue: { x: 0, y: 0 }, stiffness: 170, damping: 13, mass: 0.85, useNativeDriver: false }).start(({ finished }) => { if (finished) { lastBand.current = 0; tick(); playStretchReturn(); } });
  const resetLater = () => { if (idleTimer.current) clearTimeout(idleTimer.current); idleTimer.current = setTimeout(home, 1000); };
  const elastic = (d: number) => d === 0 ? 0 : Math.sign(d) * 190 * (1 - Math.exp(-Math.abs(d) / 210));
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { if (idleTimer.current) clearTimeout(idleTimer.current); start.current = { ...current.current }; position.stopAnimation(); },
    onPanResponderMove: (_, g) => { const x = elastic(start.current.x + g.dx); const y = elastic(start.current.y + g.dy); position.setValue({ x, y }); const band = Math.floor(Math.hypot(x, y) / 45); if (band !== lastBand.current) { lastBand.current = band; tick(); playStretchTick(Math.hypot(x, y) / 190); } resetLater(); },
    onPanResponderRelease: () => { impact(Haptics.ImpactFeedbackStyle.Medium); resetLater(); },
    onPanResponderTerminate: resetLater,
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

export function SatisfyingGame({ game }: { game: GameKind }) {
  return game === 0 ? <BubblePop /> : game === 1 ? <RippleTap /> : game === 2 ? <ElasticScrub /> : game === 3 ? <PressureGame /> : <SquishGame />;
}

const styles = StyleSheet.create({
  experience: { flex: 1, backgroundColor: '#090a0e', alignItems: 'center', paddingHorizontal: 22, paddingTop: 48, paddingBottom: 16 },
  copy: { alignItems: 'center', gap: 7, zIndex: 2 }, title: { color: '#f4f1f5', fontSize: 34, fontWeight: '800', letterSpacing: 1.9 }, subtitle: { color: '#96919d', fontSize: 14, letterSpacing: 0.2 }, gameArea: { flex: 1, width: '100%', alignItems: 'stretch', justifyContent: 'stretch', overflow: 'hidden' },
  popTray: { flex: 1, width: '100%', marginTop: 22, marginBottom: 12, borderRadius: 28, borderWidth: 1, borderColor: '#292a32', backgroundColor: '#14151a', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 22 },
  bubbleGrid: { width: 326, maxWidth: '92%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10 },
  tactileBubble: { borderWidth: 1.15, shadowOpacity: 0.32, shadowRadius: 11, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' },
  bubbleShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,12,20,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  bubbleHighlight: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.5)', transform: [{ rotate: '-24deg' }] },
  bubblePin: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.14)' },
  popSocket: { backgroundColor: '#0c0e13', borderWidth: 1, borderColor: '#1c1f27', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.48, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  socketInner: { width: '68%', height: '68%', borderRadius: 999, backgroundColor: '#101218', opacity: 0.9 },
  ripplePad: { flex: 1, width: '100%', borderRadius: 24, backgroundColor: '#101724', overflow: 'hidden', borderWidth: 1, borderColor: '#263349', marginTop: 16, marginBottom: 16 },
  waterGlow: { position: 'absolute', left: '20%', top: '15%', width: '60%', height: '65%', borderRadius: 180, backgroundColor: '#223c5a', opacity: 0.38 },
  waveRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#b8dfff', shadowColor: '#93cbff', shadowOpacity: 0.75, shadowRadius: 8 },
  fullSurface: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 24, marginTop: 16, marginBottom: 16 },
  elasticBlob: { width: 118, height: 118, borderRadius: 59, backgroundColor: '#ffd66b', borderWidth: 7, borderColor: '#fff0ad', shadowColor: '#ffd66b', shadowOpacity: 0.65, shadowRadius: 22 },
  elasticHighlight: { position: 'absolute', width: 30, height: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', top: 18, left: 22, transform: [{ rotate: '-22deg' }] },
  centerPress: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  pressOrb: { width: 94, height: 94, borderRadius: 47, backgroundColor: '#ef77ff', borderWidth: 7, borderColor: '#ffd6ff', shadowColor: '#ef77ff', shadowOpacity: 0.8, shadowRadius: 22 },
  squishSurface: { backgroundColor: '#12201b' },
  squishBlob: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#70f0ac', borderWidth: 8, borderColor: '#c7ffdf', shadowColor: '#70f0ac', shadowOpacity: 0.7, shadowRadius: 20 },
});
