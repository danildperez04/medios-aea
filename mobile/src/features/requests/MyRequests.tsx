import { router } from 'expo-router';
import { useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatTripWindow } from '@/lib/managua';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import { useMyRequests, type MyRequest, type RequestStatus } from './api';
import { StatusBadge } from './StatusBadge';
import { STATUS_FILTERS } from './status';

interface Props {
  /** Lo que va arriba de la lista (saludo, botón de nueva solicitud). */
  header: ReactElement;
  /** Lo que va al final (cerrar sesión). */
  footer: ReactElement;
}

/** Mis solicitudes, filtrables por estado (HU-18). Tocar una abre su detalle. */
export function MyRequests({ header, footer }: Props) {
  const [status, setStatus] = useState<RequestStatus | null>(null);
  const requests = useMyRequests(status);
  const rows = requests.data?.data ?? [];

  const emptyText =
    status === null
      ? 'Aún no has pedido ningún medio. Usa “Nueva solicitud” para pedir el primero.'
      : 'No tienes solicitudes en este estado.';

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={requests.isRefetching}
          onRefresh={() => void requests.refetch()}
        />
      }
      ListHeaderComponent={
        <View>
          {header}
          <Text style={styles.title} accessibilityRole="header">
            Mis solicitudes
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
            accessibilityRole="tablist"
          >
            {STATUS_FILTERS.map((filter) => {
              const selected = filter.value === status;
              return (
                <Pressable
                  key={filter.label}
                  onPress={() => setStatus(filter.value)}
                  style={[styles.chip, selected ? styles.chipSelected : null]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {requests.isLoading ? (
            <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando solicitudes" />
          ) : null}
          {requests.error ? (
            <View style={styles.alert} accessibilityRole="alert">
              <Text style={styles.alertText}>{requests.error.message}</Text>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        requests.isLoading || requests.error ? undefined : (
          <Text style={styles.empty}>{emptyText}</Text>
        )
      }
      ListFooterComponent={<View style={styles.footer}>{footer}</View>}
      renderItem={({ item }) => <RequestRow request={item} />}
    />
  );
}

function RequestRow({ request }: { request: MyRequest }) {
  const vehicle = request.assignment?.resource;
  return (
    <Pressable
      onPress={() => router.push(`/requests/${request.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${request.destination}, ${request.code}`}
    >
      <View style={styles.rowTop}>
        <Text style={styles.code}>{request.code}</Text>
        <StatusBadge status={request.status} />
      </View>
      <Text style={styles.destination}>{request.destination}</Text>
      <Text style={styles.when}>{formatTripWindow(request.startsAt, request.endsAt)}</Text>
      {vehicle ? (
        <Text style={styles.vehicle}>
          {vehicle.name} · {vehicle.identifier}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, flexGrow: 1 },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.negroLavado,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.negroLavado,
  },
  filters: { gap: spacing.sm, paddingVertical: spacing.md },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.linea,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.negroLavado, borderColor: colors.negroLavado },
  chipText: { fontFamily: fonts.semibold, fontSize: type.small, color: colors.negroLavado },
  chipTextSelected: { color: colors.blanco },
  loading: { marginVertical: spacing.lg },
  alert: {
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.naranjaFuerte,
    backgroundColor: '#FDECEB',
    borderRadius: 6,
  },
  alertText: { fontFamily: fonts.regular, fontSize: type.small, color: colors.negroLavado },
  empty: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    lineHeight: 25,
    color: colors.tintaSuave,
  },
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
  destination: {
    fontFamily: fonts.semibold,
    fontSize: type.body,
    color: colors.negroLavado,
    marginTop: spacing.xs,
  },
  when: { fontFamily: fonts.regular, fontSize: type.small, color: colors.negroLavado },
  vehicle: { fontFamily: fonts.mono, fontSize: 14, color: colors.negroLavado },
  footer: { marginTop: spacing.xl },
});
