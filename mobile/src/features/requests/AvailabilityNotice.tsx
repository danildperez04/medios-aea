import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, type } from '@/lib/theme';
import type { Availability } from './api';

interface Props {
  availability: Availability | undefined;
  loading: boolean;
  error: string | null;
  passengers: number;
}

const people = (n: number) => (n === 1 ? '1 persona' : `${n} personas`);

/**
 * Cuántos vehículos están libres en el horario elegido, antes de enviar (HU-17). Es
 * orientativo: la solicitud no reserva nada y la coordinación decide (RN-07).
 */
export function AvailabilityNotice({ availability, loading, error, passengers }: Props) {
  if (loading) {
    return (
      <View style={[styles.box, styles.neutral]} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.negroLavado} />
        <Text style={styles.body}>Revisando qué vehículos están libres…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.box, styles.neutral]} accessibilityLiveRegion="polite">
        <Text style={styles.body}>
          No pudimos revisar la disponibilidad: {error} Puedes enviar la solicitud igual.
        </Text>
      </View>
    );
  }
  if (!availability) return null;

  const free = availability.available;
  if (free.length === 0) {
    return (
      <View style={[styles.box, styles.warning]} accessibilityLiveRegion="polite">
        <Text style={styles.title}>No hay vehículos libres en ese horario</Text>
        <Text style={styles.body}>
          Puedes enviarla igual: la coordinación decide y te avisa. Si puedes, prueba otro horario.
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.box, styles.ok]} accessibilityLiveRegion="polite">
      <Text style={styles.title}>
        {free.length === 1
          ? `1 vehículo libre para ${people(passengers)}`
          : `${free.length} vehículos libres para ${people(passengers)}`}
      </Text>
      {free.map((vehicle) => (
        <Text key={vehicle.id} style={styles.item}>
          {vehicle.name} · {vehicle.identifier}
        </Text>
      ))}
      <Text style={styles.note}>
        Enviar no lo reserva: la coordinación asigna el vehículo al aprobar.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 6,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  neutral: { borderColor: colors.linea, backgroundColor: colors.blanco },
  ok: { borderColor: colors.verde, backgroundColor: '#EEF7F2' },
  warning: { borderColor: colors.amarillo, backgroundColor: '#FFF6E3' },
  title: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.negroLavado },
  body: { fontFamily: fonts.regular, fontSize: type.small, color: colors.negroLavado },
  item: { fontFamily: fonts.mono, fontSize: 14, color: colors.negroLavado },
  note: {
    fontFamily: fonts.regular,
    fontSize: type.small,
    color: colors.tintaSuave,
    marginTop: spacing.xs,
  },
});
