import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SatisfyingGame } from '../../components/SatisfyingGame';
import { GAME_LABELS, type GameKind } from '../../lib/feed';
import { readState, toggleFavorite, updateState } from '../../lib/storage';

export default function GamePage() {
  const params = useLocalSearchParams<{ id: string; from?: string }>();
  const parsed = Number(params.id);
  const game = (Number.isInteger(parsed) && parsed >= 0 && parsed <= 4 ? parsed : 0) as GameKind;
  const [favorite, setFavorite] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    readState().then((state) => { if (active) setFavorite(state.favorites.includes(game)); });
    void updateState((state) => ({ ...state, stats: { ...state.stats, replays: state.stats.replays + 1 } }));
    return () => { active = false; };
  }, [game]));

  const onFavorite = async () => {
    const next = await toggleFavorite(game);
    setFavorite(next.favorites.includes(game));
  };

  return <View style={styles.page}>
    <SatisfyingGame game={game} />
    <Pressable style={[styles.action, styles.back]} onPress={() => router.back()}><Text style={styles.actionText}>‹</Text></Pressable>
    <Pressable style={[styles.action, styles.favorite]} onPress={onFavorite}><Text style={[styles.favoriteText, favorite && styles.favoriteActive]}>{favorite ? '♥' : '♡'}</Text></Pressable>
    <View pointerEvents="none" style={styles.label}><Text style={styles.labelText}>{params.from === 'favorites' ? 'FAVORITE' : 'HISTORY'} · {GAME_LABELS[game]}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#08090c' },
  action: { position: 'absolute', top: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,22,28,0.84)', borderWidth: 1, borderColor: '#343944', zIndex: 30 },
  back: { left: 14 }, favorite: { right: 14 }, actionText: { color: '#ffffff', fontSize: 36, lineHeight: 38, marginTop: -3 }, favoriteText: { color: '#d3d7df', fontSize: 28 }, favoriteActive: { color: '#ffffff' },
  label: { position: 'absolute', top: 24, left: 70, right: 70, alignItems: 'center' }, labelText: { color: '#858b97', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});
