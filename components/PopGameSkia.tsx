import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { Canvas, Circle, Group, RadialGradient, Shadow, vec } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playPop } from '../lib/synth-audio';

type Bubble = {
  id: number;
  x: number;
  y: number;
  r: number;
  color: string;
  edge: string;
  glow: string;
  highlightX: number;
  highlightY: number;
};

const PALETTE = [
  ['#6f58a8', '#bfa9f0', '#9d7fe2'],
  ['#627fa8', '#b5d4ee', '#8fbde6'],
  ['#6f9789', '#bad9ce', '#91c2b1'],
  ['#ad7384', '#efbccb', '#dc95aa'],
  ['#aa9676', '#ead7b5', '#d4b98f'],
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
  const side = Math.min(width * 0.88, 330);
  const cellW = side / cols;
  const usableH = Math.min(height * 0.84, 470);
  const cellH = usableH / rows;
  const left = (width - side) / 2;
  const top = (height - usableH) / 2;
  const bubbles: Bubble[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (row === rows - 1 && col >= 3) continue;
      const id = row * cols + col;
      const palette = PALETTE[Math.floor(random() * PALETTE.length)];
      const baseR = Math.min(cellW, cellH) * (0.31 + random() * 0.08);
      const jitterX = (random() - 0.5) * 8;
      const jitterY = (random() - 0.5) * 8;
      const x = left + cellW * (col + 0.5) + jitterX;
      const y = top + cellH * (row + 0.5) + jitterY;
      bubbles.push({
        id,
        x,
        y,
        r: baseR,
        color: palette[0],
        edge: palette[1],
        glow: palette[2],
        highlightX: x - baseR * (0.28 + random() * 0.12),
        highlightY: y - baseR * (0.3 + random() * 0.1),
      });
    }
  }
  return bubbles;
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
    }, 1250 + (bubble.id % 5) * 90);
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
            <Group>
              {bubbles.map((bubble) => {
                const isPopped = Boolean(popped[bubble.id]);
                if (isPopped) {
                  return (
                    <Group key={bubble.id}>
                      <Circle cx={bubble.x} cy={bubble.y + 2} r={bubble.r * 0.94} color="#090a0f">
                        <Shadow dx={0} dy={3} blur={7} color="rgba(0,0,0,0.75)" inner />
                      </Circle>
                      <Circle cx={bubble.x} cy={bubble.y} r={bubble.r * 0.72} color="#11131a">
                        <RadialGradient c={vec(bubble.x - bubble.r * 0.18, bubble.y - bubble.r * 0.2)} r={bubble.r} colors={['#1b1d26', '#090a0f']} />
                      </Circle>
                    </Group>
                  );
                }
                return (
                  <Group key={bubble.id}>
                    <Circle cx={bubble.x} cy={bubble.y + bubble.r * 0.12} r={bubble.r * 1.08} color={bubble.glow} opacity={0.16}>
                      <Shadow dx={0} dy={4} blur={12} color={bubble.glow} />
                    </Circle>
                    <Circle cx={bubble.x} cy={bubble.y} r={bubble.r} color={bubble.color}>
                      <RadialGradient
                        c={vec(bubble.x - bubble.r * 0.28, bubble.y - bubble.r * 0.34)}
                        r={bubble.r * 1.35}
                        colors={[bubble.edge, bubble.color, '#302b3a']}
                        positions={[0, 0.58, 1]}
                      />
                      <Shadow dx={0} dy={5} blur={8} color="rgba(0,0,0,0.5)" />
                      <Shadow dx={-2} dy={-2} blur={3} color="rgba(255,255,255,0.2)" inner />
                    </Circle>
                    <Circle cx={bubble.highlightX} cy={bubble.highlightY} r={bubble.r * 0.19} color="rgba(255,255,255,0.58)" />
                    <Circle cx={bubble.x + bubble.r * 0.3} cy={bubble.y + bubble.r * 0.29} r={bubble.r * 0.065} color="rgba(255,255,255,0.13)" />
                  </Group>
                );
              })}
            </Group>
          </Canvas>
        )}
        {bubbles.map((bubble) => (
          <Pressable
            key={`touch-${bubble.id}`}
            accessibilityLabel="Pop bubble"
            onPressIn={() => pop(bubble)}
            style={{
              position: 'absolute',
              left: bubble.x - bubble.r * 1.12,
              top: bubble.y - bubble.r * 1.12,
              width: bubble.r * 2.24,
              height: bubble.r * 2.24,
              borderRadius: bubble.r * 1.12,
            }}
          />
        ))}
        <Pressable style={styles.shuffle} onLongPress={() => { setPopped({}); setSeed((value) => value + 1); }}>
          <View />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  experience: { flex: 1, backgroundColor: '#090a0e', alignItems: 'center', paddingHorizontal: 22, paddingTop: 48, paddingBottom: 16 },
  copy: { alignItems: 'center', gap: 7, zIndex: 2 },
  title: { color: '#f4f1f5', fontSize: 34, fontWeight: '800', letterSpacing: 1.9 },
  subtitle: { color: '#96919d', fontSize: 14, letterSpacing: 0.2 },
  tray: { flex: 1, width: '100%', marginTop: 22, marginBottom: 12, borderRadius: 28, borderWidth: 1, borderColor: '#292a32', backgroundColor: '#121319', overflow: 'hidden' },
  shuffle: { position: 'absolute', width: 1, height: 1, bottom: 0, right: 0 },
});
