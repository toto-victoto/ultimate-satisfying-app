import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GAME_LABELS, type GameKind } from '../../lib/feed';
import { readState } from '../../lib/storage';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<GameKind[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    readState().then((state) => { if (active) setFavorites(state.favorites); });
    return () => { active = false; };
  }, []));

  return <View style={styles.page}>
    <Text style={styles.eyebrow}>LIBRARY</Text>
    <Text style={styles.title}>Favorites</Text>
    <Text style={styles.copy}>Your saved satisfying games.</Text>

    {favorites.length === 0 ? (
      <View style={styles.placeholder}><Text style={styles.heart}>♡</Text><Text style={styles.placeholderTitle}>Nothing saved yet</Text><Text style={styles.placeholderCopy}>Open a game from your history and tap the heart to save it.</Text></View>
    ) : (
      <View style={styles.list}>{favorites.map((game) => (
        <Pressable key={game} style={styles.card} onPress={() => router.push({ pathname: '/game/[id]', params: { id: String(game), from: 'favorites' } })}>
          <View><Text style={styles.cardTitle}>{GAME_LABELS[game]}</Text><Text style={styles.cardSub}>Tap to play</Text></View><Text style={styles.saved}>♥</Text>
        </Pressable>
      ))}</View>
    )}
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#08090c', paddingHorizontal: 24, paddingTop: 54 }, eyebrow: { color: '#888e9a', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 }, title: { color: '#f6f7f9', fontSize: 36, fontWeight: '900', marginTop: 8 }, copy: { color: '#9aa0ab', fontSize: 15, marginTop: 8 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }, heart: { color: '#b7bbc4', fontSize: 54 }, placeholderTitle: { color: '#e6e8ed', fontSize: 20, fontWeight: '800', marginTop: 16 }, placeholderCopy: { color: '#8c929d', fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320, marginTop: 8 },
  list: { marginTop: 28, gap: 12 }, card: { padding: 18, borderRadius: 18, backgroundColor: '#12151b', borderWidth: 1, borderColor: '#292e38', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardTitle: { color: '#f1f2f5', fontSize: 17, fontWeight: '800' }, cardSub: { color: '#858c98', fontSize: 12, marginTop: 4 }, saved: { color: '#ffffff', fontSize: 25 },
});
