import { StyleSheet, Text, View } from 'react-native';

export default function FavoritesPage() {
  return (
    <View style={styles.page}>
      <Text selectable={false} style={styles.eyebrow}>LIBRARY</Text>
      <Text selectable={false} style={styles.title}>Favorites</Text>
      <Text selectable={false} style={styles.copy}>Games you save will live here.</Text>
      <View style={styles.placeholder}>
        <Text selectable={false} style={styles.heart}>♡</Text>
        <Text selectable={false} style={styles.placeholderTitle}>Nothing saved yet</Text>
        <Text selectable={false} style={styles.placeholderCopy}>The favorite action will be wired in after the navigation POC.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#08090c', paddingHorizontal: 24, paddingTop: 64 },
  eyebrow: { color: '#707583', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: '#f6f7f9', fontSize: 36, fontWeight: '900', marginTop: 8 },
  copy: { color: '#8d929e', fontSize: 15, marginTop: 8 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  heart: { color: '#777c88', fontSize: 54 },
  placeholderTitle: { color: '#e6e8ed', fontSize: 20, fontWeight: '800', marginTop: 16 },
  placeholderCopy: { color: '#777c88', fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320, marginTop: 8 },
});
