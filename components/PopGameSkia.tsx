import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { Canvas, Circle, Group, LinearGradient, RadialGradient, Rect, Shadow, vec } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playPop } from '../lib/synth-audio';

type Bubble = {
  id: number;
  x: number;
  y: number;
  r: number;
  color: string;
  mid: string;
  edge: string;
  glow: string;
  highlightX: number;
  highlightY: number;
};

const PALETTE = [
  ['#7d68b5', '#a897d7', '#d8ccf5', '#aa91e3'],
  ['#7893b9', '#9fb5d1', '#d4e1f2', '#9ebce1'],
  ['#80a79a', '#a2c0b7', '#d3e5df', '#a8cdbf'],
  ['#b88191', '#d3a2ae', '#f0cbd4', '#e3a3b4'],
  ['#b29f81', '#cdbc9f', '#eadfc8', '#dbc39d'],
] as const;

function rng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeBubbles(width: number, height: number, seed: number): Bubble[] {
  if (!width || !height) return [];
  const random = rng(seed * 9176 + 41);
  const cols = 5;
  const rows = 6;
  const side = Math.min(width * 0.88, 338);
  const cellW = side / cols;
  const usableH = Math.min(height * 0.78, 452);
  const cellH = usableH / rows;
  const left = (width - side) / 2;
  const top = (height - usableH) / 2;
  const bubbles: Bubble[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (row === rows - 1 && col >= 3) continue;
      const id = row * cols + col;
      const palette = PALETTE[Math.floor(random() * PALETTE.length)];
      const baseR = Math.min(cellW, cellH) * (0.34 + random() * 0.075);
      const jitterX = (random() - 0.5) * 7;
      const jitterY = (random() - 0.5) * 7;
      const x = left + cellW * (col + 0.5) + jitterX;
      const y = top + cellH * (row + 0.5) + jitterY;
      bubbles.push({
        id,
        x,
        y,
        r: baseR,
        color: palette[0],
        mid: palette[1],
        edge: palette[2],
        glow: palette[3],
        highlightX: x - baseR * (0.28 + random() * 0.08),
        highlightY: y - baseR * (0.3 + random() * 0.08),
      });
    }
  }
  return bubbles;
}

function AmbientTray({ width, height }: { width: number; height: number }) {
  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#171821', '#111218', '#15151d']} positions={[0, 0.55, 1]} />
      </Rect>
      <Circle cx={width * 0.28} cy={height * 0.34} r={Math.max(width, height) * 0.34} opacity={0.32}>
        <RadialGradient c={vec(width * 0.28, height * 0.34)} r={Math.max(width, height) * 0.34} colors={['rgba(151,124,203,0.22)', 'rgba(151,124,203,0.06)', 'rgba(0,0,0,0)']} />
      </Circle>
      <Circle cx={width * 0.76} cy={height * 0.52} r={Math.max(width, height) * 0.31} opacity={0.3}>
        <RadialGradient c={vec(width * 0.76, height * 0.52)} r={Math.max(width, height) * 0.31} colors={['rgba(103,145,157,0.17)', 'rgba(103,145,157,0.045)', 'rgba(0,0,0,0)']} />
      </Circle>
      <Circle cx={width * 0.5} cy={height * 0.78} r={Math.max(width, height) * 0.27} opacity={0.22}>
        <RadialGradient c={vec(width * 0.5, height * 0.78)} r={Math.max(width, height) * 0.27} colors={['rgba(190,127,147,0.13)', 'rgba(190,127,147,0.035)', 'rgba(0,0,0,0)']} />
      </Circle>
    </Group>
  );
}

function GelBubble({ bubble }: { bubble: Bubble }) {
  return (
    <Group>
      <Circle cx={bubble.x} cy={bubble.y + bubble.r * 0.11} r={bubble.r * 1.2} opacity={0.32}>
        <RadialGradient c={vec(bubble.x, bubble.y)} r={bubble.r * 1.25} colors={[`${bubble.glow}55`, `${bubble.glow}18`, 'rgba(0,0,0,0)']} positions={[0, 0.55, 1]} />
      </Circle>

      <Circle cx={bubble.x} cy={bubble.y} r={bubble.r * 1.055} color="rgba(255,255,255,0.08)">
        <Shadow dx={0} dy={6} blur={9} color="rgba(0,0,0,0.5)" />
      </Circle>

      <Circle cx={bubble.x} cy={bubble.y} r={bubble.r}>
        <RadialGradient
          c={vec(bubble.x - bubble.r * 0.35, bubble.y - bubble.r * 0.38)}
          r={bubble.r * 1.48}
          colors={[bubble.edge, bubble.mid, bubble.color, '#2b2933']}
          positions={[0, 0.24, 0.7, 1]}
        />
        <Shadow dx={-2} dy={-3} blur={5} color="rgba(255,255,255,0.18)" inner />
        <Shadow dx={2} dy={4} blur={7} color="rgba(20,18,28,0.55)" inner />
      </Circle>

      <Circle cx={bubble.x} cy={bubble.y} r={bubble.r * 0.79} opacity={0.45}>
        <RadialGradient
          c={vec(bubble.x - bubble.r * 0.25, bubble.y - bubble.r * 0.28)}
          r={bubble.r}
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.035)', 'rgba(24,22,31,0.24)']}
          positions={[0, 0.5, 1]}
        />
      </Circle>

      <Circle cx={bubble.highlightX} cy={bubble.highlightY} r={bubble.r * 0.17} color="rgba(255,255,255,0.62)">
        <Shadow dx={0} dy={0} blur={3} color="rgba(255,255,255,0.22)" />
      </Circle>
      <Circle cx={bubble.highlightX + bubble.r * 0.15} cy={bubble.highlightY + bubble.r * 0.03} r={bubble.r * 0.07} color="rgba(255,255,255,0.2)" />
      <Circle cx={bubble.x + bubble.r * 0.31} cy={bubble.y + bubble.r * 0.29} r={bubble.r * 0.075} color="rgba(255,255,255,0.16)" />
    </Group>
  );
}

export default function PopGameSkia() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [seed, setSeed] = useState(1);
  const [popped, setPopped] = useState<Record<number, boolean>>({});
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const bubbles = useMemo(() => makeBubbles(size.width, size.height, seed), [seed, size.height, size.width]);

  const pop = (bubble: Bubble) => {
    if (popped[bubble.id]) return;
    setPopped((current) => ({ ...current, [bubble.id]: true }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    playPop(bubble.r * 2);
    if (timers.current[bubble.id]) clearTimeout(timers.current[bubble.id]);
    timers.current[bubble.id] = setTimeout(() => {
      setPopped((current) => {
        const next = { ...current };
        delete next[bubble.id];
        return next;
      });
    }, 1300 + (bubble.id % 5) * 100);
  };

  return (
    <View style={styles.experience}>
      <View style={styles.copy}>
        <Text selectable={false} style={styles.title}>POP THEM</Text>
        <Text selectable={false} style={styles.subtitle}>tap forever</Text>
      </View>
      <View style={styles.tray} onLayout={(event) => setSize(event.nativeEvent.layout)}>
        {size.width > 0 && (
          <Canvas style={StyleSheet.absoluteFill}>
            <AmbientTray width={size.width} height={size.height} />
            {bubbles.map((bubble) => {
              if (popped[bubble.id]) {
                return (
                  <Group key={bubble.id}>
                    <Circle cx={bubble.x} cy={bubble.y + 2} r={bubble.r * 0.98} color="#0b0c11">
                      <Shadow dx={0} dy={3} blur={9} color="rgba(0,0,0,0.78)" inner />
                    </Circle>
                    <Circle cx={bubble.x} cy={bubble.y} r={bubble.r * 0.73}>
                      <RadialGradient c={vec(bubble.x - bubble.r * 0.2, bubble.y - bubble.r * 0.22)} r={bubble.r} colors={['#1c1c24', '#0b0c11']} />
                    </Circle>
                  </Group>
                );
              }
              return <GelBubble key={bubble.id} bubble={bubble} />;
            })}
          </Canvas>
        )}
        {bubbles.map((bubble) => (
          <Pressable
            key={`touch-${bubble.id}`}
            accessibilityLabel="Pop bubble"
            onPressIn={() => pop(bubble)}
            style={{
              position: 'absolute',
              left: bubble.x - bubble.r * 1.15,
              top: bubble.y - bubble.r * 1.15,
              width: bubble.r * 2.3,
              height: bubble.r * 2.3,
              borderRadius: bubble.r * 1.15,
            }}
          />
        ))}
        <Pressable style={styles.shuffle} onLongPress={() => { setPopped({}); setSeed((value) => value + 1); }}><View /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  experience: { flex: 1, backgroundColor: '#0b0b10', alignItems: 'center', paddingHorizontal: 22, paddingTop: 46, paddingBottom: 16 },
  copy: { alignItems: 'center', gap: 8, zIndex: 2 },
  title: { color: '#f2eff4', fontSize: 33, fontWeight: '800', letterSpacing: 1.65 },
  subtitle: { color: '#98939e', fontSize: 14, letterSpacing: 0.25 },
  tray: { flex: 1, width: '100%', marginTop: 24, marginBottom: 14, borderRadius: 29, borderWidth: 1, borderColor: 'rgba(185,177,203,0.17)', backgroundColor: '#15161d', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 20 },
  shuffle: { position: 'absolute', width: 1, height: 1, bottom: 0, right: 0 },
});
