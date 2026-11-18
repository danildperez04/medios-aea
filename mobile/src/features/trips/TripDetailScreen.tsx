import { router } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatTripWindow } from '@/lib/managua';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import { useMyTrip, type Trip } from './api';

/** Detalle de un viaje que la persona conduce (HU-20). La salida y llegada, en HU-21. */
export function TripDetailScreen({ reservationId }: { reservationId: string }) {
  const trip = useMyTrip(reservationId);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={back}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.backText}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {trip.data ? `Viaje ${trip.data.code}` : 'Viaje'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {trip.isLoading ? <ActivityIndicator accessibilityLabel="Cargando viaje" /> : null}
        {trip.error ? (
          <View style={styles.alert} accessibilityRole="alert">
            <Text style={styles.alertText}>{trip.error.message}</Text>
          </View>
        ) : null}
        {trip.data ? <Detail trip={trip.data} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ trip }: { trip: Trip }) {
  const phone = trip.requester.phone;
  return (
    <View>
      {trip.state === 'IN_PROGRESS' ? (
        <View style={styles.notice}>
          <Text style={styles.body}>Viaje en curso: falta registrar la llegada.</Text>
        </View>
      ) : null}
      <Text style={styles.destination}>{trip.destination}</Text>
      <Text style={styles.body}>{formatTripWindow(trip.startsAt, trip.endsAt)}</Text>

      <Field label="Vehículo">{`${trip.vehicle.name} · ${trip.vehicle.identifier}`}</Field>
      <Field label="Personas que viajan">
        {trip.vehicle.passengerCapacity
          ? `${trip.passengers} (caben ${trip.vehicle.passengerCapacity})`
          : String(trip.passengers)}
      </Field>
      <Field label="Para qué">{trip.purpose}</Field>
      <Field label="Proyecto">{`${trip.project.name} (${trip.project.code})`}</Field>
      <Field label="Quién lo pidió">{trip.requester.fullName}</Field>

      {phone ? (
        <Pressable
          style={styles.call}
          onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`)}
          accessibilityRole="button"
          accessibilityLabel={`Llamar a ${trip.requester.fullName}, ${phone}`}
        >
          <Text style={styles.callText}>Llamar · {phone}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.blanco },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.linea,
  },
  back: { minHeight: touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.turquesaFuerte },
  title: { fontFamily: fonts.monoMedium, fontSize: 22, color: colors.negroLavado },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  notice: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 6,
    backgroundColor: colors.crema,
  },
  destination: { fontFamily: fonts.medium, fontSize: type.title, color: colors.negroLavado },
  body: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    lineHeight: 25,
    color: colors.negroLavado,
  },
  field: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.linea,
  },
  label: { fontFamily: fonts.semibold, fontSize: type.small, color: colors.tintaSuave },
  value: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    color: colors.negroLavado,
    marginTop: 2,
  },
  alert: {
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.naranjaFuerte,
    backgroundColor: '#FDECEB',
    borderRadius: 6,
  },
  alertText: { fontFamily: fonts.regular, fontSize: type.small, color: colors.negroLavado },
  call: {
    minHeight: touchTarget + 4,
    marginTop: spacing.lg,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.turquesaFuerte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.turquesaFuerte },
});
