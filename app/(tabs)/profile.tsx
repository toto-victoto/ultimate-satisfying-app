import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { setSynthMuted } from '../../lib/synth-audio';
import { readState, writeState, type StoredState } from '../../lib/storage';

export default function ProfilePage() {
  const [state, setState] = useState<StoredState | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    readState().then((next) => { if (active) setState(next); });
    return () => { active = false; };
  }, []));

  const toggleSound = async () => {
    if (!state) return;
    const next = { ...state, muted: !state.muted };
    setState(next);
    setSynthMuted(next.muted);
    await writeState(next);
  };

  const history = state?.history ?? [];
  const stats = state?.stats;

  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>YOU</Text>
    <Text style={styles.title}>Profile</Text>
    <View style={styles.avatar}><Text style={styles.avatarText}>U</Text></View>
    <Text style={styles.name}>Local user</Text>
    <Text style={styles.subtle}>No account or backend yet</Text>

    <View style={styles.statsRow}>
      <View style={styles.stat}><Text style={styles.statValue}>{stats?.gamesViewed ?? history.length}</Text><Text style={styles.statLabel}>games viewed</Text></View>
      <View style={styles.stat}><Text style={styles.statValue}>{Math.round(stats?.totalSeconds ?? 0)}s</Text><Text style={styles.statLabel}>played</Text></View>
    </View>

    <Text style={styles.sectionTitle}>SETTINGS</Text>
    <Pressable style={styles.settingRow} onPress={toggleSound}><Text style={styles.settingName}>Sound</Text><Text style={styles.settingValue}>{state?.muted ? 'Off' : 'On'}</Text></Pressable>

    <Text style={styles.sectionTitle}>HISTORY</Text>
    <Text style={styles.hint}>Tap any game to play it again.</Text>
    {history.length === 0 ? <Text style={styles.empty}>Your recently played games will appear here.</Text> : history.slice(-30).reverse().map((entry, index) => (
      <Pressable key={`${entry.id}-${entry.at}-${index}`} style={styles.historyRow} onPress={() => router.push({ pathname: '/game/[id]', params: { id: String(entry.game), from: 'profile' } })}>
        <View><Text style={styles.historyName}>{entry.label}</Text><Text style={styles.historySub}>Replay</Text></View>
        <Text style={styles.historyMeta}>{entry.seconds.toFixed(1)}s  ›</Text>
      </Pressable>
    ))}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#08090c', paddingHorizontal: 24, paddingTop: 54, paddingBottom: 36 }, eyebrow: { color: '#888e9a', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 }, title: { color: '#f6f7f9', fontSize: 36, fontWeight: '900', marginTop: 8 }, avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1b1f29', borderWidth: 1, borderColor: '#303643', alignItems: 'center', justifyContent: 'center', marginTop: 28 }, avatarText: { color: '#e9ebef', fontSize: 34, fontWeight: '900' }, name: { color: '#f4f5f7', fontSize: 22, fontWeight: '800', marginTop: 14 }, subtle: { color: '#8a909b', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 28 }, stat: { flex: 1, backgroundColor: '#11141a', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#252a34' }, statValue: { color: '#f4f5f7', fontSize: 24, fontWeight: '900' }, statLabel: { color: '#8a909b', fontSize: 12, marginTop: 4 }, sectionTitle: { color: '#8a909b', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 34, marginBottom: 10 }, hint: { color: '#777e89', fontSize: 12, marginBottom: 4 }, settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#20242d' }, settingName: { color: '#d9dce2', fontSize: 15, fontWeight: '700' }, settingValue: { color: '#a0a6b1', fontSize: 14, fontWeight: '700' }, empty: { color: '#8a909b', fontSize: 14 }, historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#20242d' }, historyName: { color: '#e2e4e9', fontSize: 15, fontWeight: '700' }, historySub: { color: '#777e89', fontSize: 11, marginTop: 3 }, historyMeta: { color: '#a0a6b1', fontSize: 13 },
});
