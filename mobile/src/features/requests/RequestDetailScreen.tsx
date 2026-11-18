import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatTripWindow } from '@/lib/managua';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import { useCancelRequest, useMyRequest, type MyRequest } from './api';
import { StatusBadge } from './StatusBadge';
import { canCancel } from './status';

/** Detalle de una solicitud propia: vehículo y conductor asignados, y cancelar (HU-18). */
export function RequestDetailScreen({ id }: { id: string }) {
  const request = useMyRequest(id);
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
          {request.data?.code ?? 'Solicitud'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {request.isLoading ? <ActivityIndicator accessibilityLabel="Cargando solicitud" /> : null}
        {request.error ? (
          <View style={styles.alert} accessibilityRole="alert">
            <Text style={styles.alertText}>{request.error.message}</Text>
          </View>
        ) : null}
        {request.data ? <Detail request={request.data} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ request }: { request: MyRequest }) {
  const cancel = useCancelRequest();
  const [confirming, setConfirming] = useState(false);
  const driver = request.assignment?.driver ?? request.proposedDriver;

  const confirm = async () => {
    try {
      await cancel.mutateAsync(request.id);
    } catch {
      // Se muestra desde cancel.error.
    }
    setConfirming(false);
  };

  return (
    <View>
      <StatusBadge status={request.status} />
      <Text style={styles.destination}>{request.destination}</Text>
      <Text style={styles.body}>{formatTripWindow(request.startsAt, request.endsAt)}</Text>

      {request.status === 'REJECTED' && request.rejectionReason ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Motivo del rechazo</Text>
          <Text style={styles.body}>{request.rejectionReason}</Text>
        </View>
      ) : null}
      {request.status === 'PENDING' ? (
        <View style={styles.notice}>
          <Text style={styles.body}>
            La coordinación aún no la revisa. El vehículo y quien conduce se confirman al aprobarla.
          </Text>
        </View>
      ) : null}

      <Field label="Vehículo">
        {request.assignment
          ? `${request.assignment.resource.name} · ${request.assignment.resource.identifier}`
          : 'Sin asignar todavía'}
      </Field>
      <Field label={request.assignment ? 'Conduce' : 'Propusiste que conduzca'}>
        {driver?.fullName ?? 'Sin indicar'}
      </Field>
      <Field label="Proyecto">{`${request.project.name} (${request.project.code})`}</Field>
      <Field label="Para qué">{request.purpose}</Field>
      <Field label="Personas que viajan">{String(request.passengers)}</Field>

      {cancel.error ? (
        <View style={styles.alert} accessibilityRole="alert">
          <Text style={styles.alertText}>{cancel.error.message}</Text>
        </View>
      ) : null}
      {cancel.isSuccess ? (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text style={styles.body}>Cancelaste la solicitud. El vehículo quedó libre.</Text>
        </View>
      ) : null}

      {canCancel(request.status) ? (
        confirming ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmText}>
              {request.status === 'APPROVED'
                ? '¿Cancelar este viaje aprobado? El vehículo y quien conduce quedarán libres para otras personas.'
                : '¿Cancelar esta solicitud? La coordinación ya no la verá pendiente.'}
            </Text>
            <Pressable
              style={[styles.button, styles.danger]}
              onPress={confirm}
              disabled={cancel.isPending}
              accessibilityRole="button"
              accessibilityLabel="Sí, cancelar"
            >
              {cancel.isPending ? (
                <ActivityIndicator color={colors.negroLavado} />
              ) : (
                <Text style={styles.buttonText}>Sí, cancelar</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => setConfirming(false)}
              disabled={cancel.isPending}
              accessibilityRole="button"
              accessibilityLabel="No, mantenerla"
            >
              <Text style={styles.secondaryText}>No, mantenerla</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.secondary}
            onPress={() => {
              cancel.reset();
              setConfirming(true);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Cancelar solicitud</Text>
          </Pressable>
        )
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
  destination: {
    fontFamily: fonts.medium,
    fontSize: type.title,
    color: colors.negroLavado,
    marginTop: spacing.md,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    lineHeight: 25,
    color: colors.negroLavado,
  },
  notice: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 6,
    backgroundColor: colors.crema,
    gap: spacing.xs,
  },
  noticeTitle: { fontFamily: fonts.semibold, fontSize: type.small, color: colors.negroLavado },
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
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.naranjaFuerte,
    backgroundColor: '#FDECEB',
    borderRadius: 6,
  },
  alertText: { fontFamily: fonts.regular, fontSize: type.small, color: colors.negroLavado },
  confirm: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.naranjaFuerte,
    borderRadius: 6,
  },
  confirmText: { fontFamily: fonts.regular, fontSize: type.body, color: colors.negroLavado },
  button: {
    minHeight: touchTarget + 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  danger: { backgroundColor: colors.naranja },
  buttonText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.negroLavado },
  secondary: {
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  secondaryText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.turquesaFuerte },
});
