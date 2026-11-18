import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTripWindow, managuaDateKey, managuaParts } from '@/lib/managua';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import { useMyTrips, type Trip } from './api';

interface Props {
  /** Hora actual; solo las pruebas la fijan. */
  now?: Date;
}

/** Un viaje es de hoy si empieza hoy o antes (sigue hoy) o si está en curso. */
export function isToday(trip: Trip, now: Date = new Date()): boolean {
  return trip.state === 'IN_PROGRESS' || managuaParts(trip.startsAt).date <= managuaDateKey(now);
}

/** "Mis viajes": los que la persona conduce, de hoy y próximos (HU-20, RN-16). */
/**
 * Se muestra siempre, también vacía: muchos técnicos conducen (ADR 0004) y deben saber
 * dónde aparecerán sus viajes; si la carga falla, se dice en lugar de esconderla.
 */
export function MyTrips({ now = new Date() }: Props) {
  const trips = useMyTrips();
  const rows = trips.data ?? [];

  const today = rows.filter((trip) => isToday(trip, now));
  const upcoming = rows.filter((trip) => !isToday(trip, now));

  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        Mis viajes
      </Text>
      {trips.isLoading ? <ActivityIndicator accessibilityLabel="Cargando viajes" /> : null}
      {trips.error ? (
        <View style={styles.alert} accessibilityRole="alert">
          <Text style={styles.alertText}>{trips.error.message}</Text>
        </View>
      ) : null}
      {!trips.isLoading && !trips.error && rows.length === 0 ? (
        <Text style={styles.empty}>
          No tienes viajes asignados como conductor. Cuando la coordinación te asigne uno, aparecerá
          aquí.
        </Text>
      ) : null}
      {today.length ? <Group label="Hoy" trips={today} /> : null}
      {upcoming.length ? <Group label="Próximos" trips={upcoming} /> : null}
    </View>
  );
}

function Group({ label, trips }: { label: string; trips: Trip[] }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {trips.map((trip) => (
        <Pressable
          key={trip.reservationId}
          onPress={() => router.push(`/trips/${trip.reservationId}`)}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Viaje a ${trip.destination}, ${trip.code}`}
        >
          <View style={styles.rowTop}>
            <Text style={styles.code}>{trip.code}</Text>
            {trip.state === 'IN_PROGRESS' ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>En curso</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.destination}>{trip.destination}</Text>
          <Text style={styles.when}>{formatTripWindow(trip.startsAt, trip.endsAt)}</Text>
          <Text style={styles.vehicle}>
            {trip.vehicle.name} · {trip.vehicle.identifier}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.negroLavado,
  },
  title: { fontFamily: fonts.semibold, fontSize: 20, color: colors.negroLavado },
  group: { marginTop: spacing.sm },
  groupLabel: {
    fontFamily: fonts.semibold,
    fontSize: type.small,
    color: colors.tintaSuave,
    marginTop: spacing.sm,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    lineHeight: 25,
    color: colors.tintaSuave,
    marginTop: spacing.sm,
  },
  alert: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.naranjaFuerte,
    backgroundColor: '#FDECEB',
    borderRadius: 6,
  },
  alertText: { fontFamily: fonts.regular, fontSize: type.small, color: colors.negroLavado },
  row: {
    minHeight: touchTarget,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.linea,
    gap: 2,
  },
  rowPressed: { backgroundColor: '#F7F3EF' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontFamily: fonts.mono, fontSize: 14, color: colors.tintaSuave },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.turquesaFuerte,
    backgroundColor: '#EAF4F5',
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.negroLavado },
  destination: {
    fontFamily: fonts.semibold,
    fontSize: type.body,
    color: colors.negroLavado,
    marginTop: spacing.xs,
  },
  when: { fontFamily: fonts.regular, fontSize: type.small, color: colors.negroLavado },
  vehicle: { fontFamily: fonts.mono, fontSize: 14, color: colors.negroLavado },
});
