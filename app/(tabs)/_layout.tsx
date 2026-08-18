import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

type IconKind = 'favorites' | 'feed' | 'profile';

function TabIcon({ kind, focused }: { kind: IconKind; focused: boolean }) {
  const color = focused ? '#ffffff' : '#aeb3bd';

  if (kind === 'feed') {
    return (
      <View style={styles.iconFrame}>
        <View style={[styles.feedDot, focused ? styles.feedDotActive : styles.feedDotInactive]} />
      </View>
    );
  }

  const symbol = kind === 'favorites' ? (focused ? '♥' : '♡') : (focused ? '◉' : '○');
  return (
    <View style={styles.iconFrame}>
      <Text style={[styles.iconText, { color }]}>{symbol}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: Platform.OS === 'web' ? 64 : 76,
          backgroundColor: '#0b0c10',
          borderTopColor: '#272a31',
          borderTopWidth: 1,
          paddingTop: 7,
          paddingBottom: Platform.OS === 'web' ? 7 : 12,
        },
        sceneStyle: { backgroundColor: '#08090c' },
      }}
    >
      <Tabs.Screen name="favorites" options={{ title: 'Favorites', tabBarIcon: ({ focused }) => <TabIcon kind="favorites" focused={focused} /> }} />
      <Tabs.Screen name="index" options={{ title: 'Feed', tabBarIcon: ({ focused }) => <TabIcon kind="feed" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon kind="profile" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconFrame: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 27, lineHeight: 32 },
  feedDot: { width: 22, height: 22, borderRadius: 11 },
  feedDotActive: { backgroundColor: '#ffffff' },
  feedDotInactive: { borderWidth: 2, borderColor: '#aeb3bd', backgroundColor: 'transparent' },
});
