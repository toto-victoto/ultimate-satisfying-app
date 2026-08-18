import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameKind } from '../lib/feed';
import { playBounce, playPop, playPressureRelease, playPressureStart, playSquish, playStretchReturn, playStretchTick, playWave } from '../lib/synth-audio';

type Wave = { id: number; x: number; y: number };

function impact(style: Haptics.ImpactFeedbackStyle) { Haptics.impactAsync(style).catch(() => undefined); }
function tick() { Haptics.selectionAsync().catch(() => undefined); }

function Experience({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <View style={styles.experience}><View style={styles.copy}><Text selectable={false} style={styles.title}>{title}</Text><Text selectable={false} style={styles.subtitle}>{subtitle}</Text></View><View style={styles.gameArea}>{children}</View></View>;
}

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
  experience: { flex: 1, backgroundColor: '#08090c', alignItems: 'center', paddingHorizontal: 24, paddingTop: 54, paddingBottom: 18 },
  copy: { alignItems: 'center', gap: 6, zIndex: 2 }, title: { color: '#f7f7f7', fontSize: 34, fontWeight: '900', letterSpacing: 1.5 }, subtitle: { color: '#8b8e99', fontSize: 14 }, gameArea: { flex: 1, width: '100%', alignItems: 'stretch', justifyContent: 'stretch', overflow: 'hidden' },
  bubbleGrid: { width: 330, maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto', gap: 10 }, bubble: { backgroundColor: '#8fd3ff', borderWidth: 3, borderColor: '#c9ecff', shadowColor: '#8fd3ff', shadowOpacity: 0.6, shadowRadius: 14 }, bubblePopped: { opacity: 0.08, transform: [{ scale: 0.72 }] },
  ripplePad: { flex: 1, width: '100%', borderRadius: 24, backgroundColor: '#101724', overflow: 'hidden', borderWidth: 1, borderColor: '#263349', marginTop: 16, marginBottom: 16 }, waterGlow: { position: 'absolute', left: '20%', top: '15%', width: '60%', height: '65%', borderRadius: 180, backgroundColor: '#223c5a', opacity: 0.38 }, waveRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#b8dfff', shadowColor: '#93cbff', shadowOpacity: 0.75, shadowRadius: 8 },
  fullSurface: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 24, marginTop: 16, marginBottom: 16 }, elasticBlob: { width: 118, height: 118, borderRadius: 59, backgroundColor: '#ffd66b', borderWidth: 7, borderColor: '#fff0ad', shadowColor: '#ffd66b', shadowOpacity: 0.65, shadowRadius: 22 }, elasticHighlight: { position: 'absolute', width: 30, height: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', top: 18, left: 22, transform: [{ rotate: '-22deg' }] }, centerPress: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }, pressOrb: { width: 94, height: 94, borderRadius: 47, backgroundColor: '#ef77ff', borderWidth: 7, borderColor: '#ffd6ff', shadowColor: '#ef77ff', shadowOpacity: 0.8, shadowRadius: 22 }, squishSurface: { backgroundColor: '#12201b' }, squishBlob: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#70f0ac', borderWidth: 8, borderColor: '#c7ffdf', shadowColor: '#70f0ac', shadowOpacity: 0.7, shadowRadius: 20 },
});
