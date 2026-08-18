import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#08090c' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="game/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}
