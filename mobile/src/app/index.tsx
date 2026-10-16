import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/store/session';

/** Punto de entrada: decide entre login y la app según haya token guardado. */
export default function Index() {
  const { ready, token } = useSession();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return <Redirect href={token ? '/home' : '/login'} />;
}
