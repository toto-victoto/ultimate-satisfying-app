import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { Text, View } from 'react-native';

export default function PopGameWeb() {
  return (
    <WithSkiaWeb
      getComponent={() => import('./PopGameSkia')}
      fallback={<View style={{ flex: 1, backgroundColor: '#090a0e', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#96919d' }}>Loading texture…</Text></View>}
    />
  );
}
