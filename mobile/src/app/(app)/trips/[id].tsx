import { useLocalSearchParams } from 'expo-router';
import { TripDetailScreen } from '@/features/trips/TripDetailScreen';

/** Ruta /trips/:id (id de la solicitud): la pantalla vive en features/trips (HU-20). */
export default function TripDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TripDetailScreen reservationId={id} />;
}
