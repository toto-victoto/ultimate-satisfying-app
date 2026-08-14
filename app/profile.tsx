import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { setSynthMuted } from '../lib/synth-audio';

type HistoryEntry = { id: string; label: string; seconds: number; at: number };
type StoredState = { history?: HistoryEntry[]; muted?: boolean };
const STORAGE_KEY = 'ultimate-satisfying-state-v3';

export default function ProfilePage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [muted, setMuted] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!active) return;
      const saved = raw ? JSON.parse(raw) as StoredState : {};
      setHistory(saved.history ?? []);
      setMuted(saved.muted ?? false);
    });
    return () => { active = false; };
  }, []));

  const toggleSound = async () => {
    const next = !muted;
    setMuted(next);
    setSynthMuted(next);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) as StoredState : {};
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, muted: next }));
  };

  const totalSeconds = history.reduce((sum, entry) => sum + entry.seconds, 0);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text selectable={false} style={styles.eyebrow}>YOU</Text>
      <Text selectable={false} style={styles.title}>Profile</Text>
      <View style={styles.avatar}><Text selectable={false} style={styles.avatarText}>U</Text></View>
      <Text selectable={false} style={styles.name}>Local user</Text>
      <Text selectable={false} style={styles.subtle}>No account or backend yet</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statValue}>{history.length}</Text><Text style={styles.statLabel}>plays</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{Math.round(totalSeconds)}s</Text><Text style={styles.statLabel}>played</Text></View>
      </View>

      <Text selectable={false} style={styles.sectionTitle}>SETTINGS</Text>
      <Pressable style={styles.settingRow} onPress={toggleSound}>
        <Text selectable={false} style={styles.settingName}>Sound</Text>
        <Text selectable={false} style={styles.settingValue}>{muted ? 'Off' : 'On'}</Text>
      </Pressable>

      <Text selectable={false} style={styles.sectionTitle}>HISTORY</Text>
      {history.length === 0 ? (
        <Text selectable={false} style={styles.empty}>Your recently played games will appear here.</Text>
      ) : (
        history.slice(-20).reverse().map((entry, index) => (
          <View key={`${entry.id}-${entry.at}-${index}`} style={styles.historyRow}>
            <Text selectable={false} style={styles.historyName}>{entry.label}</Text>
            <Text selectable={false} style={styles.historyMeta}>{Math.round(entry.seconds)}s</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#08090c', paddingHorizontal: 24, paddingTop: 64, paddingBottom: 36 },
  eyebrow: { color: '#707583', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: '#f6f7f9', fontSize: 36, fontWeight: '900', marginTop: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1b1f29', borderWidth: 1, borderColor: '#303643', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  avatarText: { color: '#e9ebef', fontSize: 34, fontWeight: '900' },
  name: { color: '#f4f5f7', fontSize: 22, fontWeight: '800', marginTop: 14 },
  subtle: { color: '#777d89', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  stat: { flex: 1, backgroundColor: '#11141a', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#252a34' },
  statValue: { color: '#f4f5f7', fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#7b818e', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#777d89', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 34, marginBottom: 10 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#20242d' },
  settingName: { color: '#d9dce2', fontSize: 15, fontWeight: '700' },
  settingValue: { color: '#8f96a3', fontSize: 14, fontWeight: '700' },
  empty: { color: '#777d89', fontSize: 14 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#20242d' },
  historyName: { color: '#d9dce2', fontSize: 15, fontWeight: '700' },
  historyMeta: { color: '#7f8591', fontSize: 13 },
});
