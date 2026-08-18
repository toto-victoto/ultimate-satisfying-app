import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 25 : 23, color: focused ? '#ffffff' : '#a5a9b3', opacity: 1 }}>{symbol}</Text>;
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
      <Tabs.Screen name="favorites" options={{ title: 'Favorites', tabBarIcon: ({ focused }) => <TabIcon symbol={focused ? '♥' : '♡'} focused={focused} /> }} />
      <Tabs.Screen name="index" options={{ title: 'Feed', tabBarIcon: ({ focused }) => <TabIcon symbol={focused ? '●' : '○'} focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon symbol={focused ? '◉' : '○'} focused={focused} /> }} />
    </Tabs>
  );
}
