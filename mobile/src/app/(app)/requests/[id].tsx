import { useLocalSearchParams } from 'expo-router';
import { RequestDetailScreen } from '@/features/requests/RequestDetailScreen';

/** Ruta /requests/:id: la pantalla vive en features/requests (HU-18). */
export default function RequestDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RequestDetailScreen id={id} />;
}
