import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup } from '@/components/BrandLockup';
import { logout } from '@/features/auth/api';
import { NoticesButton } from '@/features/notifications/NoticesButton';
import { MyRequests } from '@/features/requests/MyRequests';
import { MyTrips } from '@/features/trips/MyTrips';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import { useSession } from '@/store/session';

const ROLE_LABEL = {
  ADMIN: 'Coordinación',
  REQUESTER: 'Técnico/a de proyecto',
  DRIVER: 'Conductor/a',
} as const;

/**
 * Inicio. "Mis viajes" para quien tenga viajes asignados, sea cual sea su rol (HU-20,
 * RN-16), y "Mis solicitudes" para quien puede pedir medios: técnicos y coordinación
 * (HU-18). Un chofer de planta solo ve sus viajes.
 */
export default function HomeScreen() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  // La API solo acepta solicitudes de técnicos y de la coordinación (RF-10).
  const canRequest = user?.role === 'REQUESTER' || user?.role === 'ADMIN';

  // Al quedar sin token, el layout de la zona autenticada redirige al login.
  const logoutButton = (
    <Pressable onPress={() => void logout()} style={styles.logout} accessibilityRole="button">
      <Text style={styles.logoutText}>Cerrar sesión</Text>
    </Pressable>
  );
  const greeting = (
    <View>
      <Text style={styles.greeting}>Hola, {user?.fullName.split(' ')[0]}</Text>
      <Text style={styles.role}>{user ? ROLE_LABEL[user.role] : ''}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BrandLockup />
        <NoticesButton />
      </View>
      {canRequest ? (
        <MyRequests
          header={
            <View>
              {greeting}
              <Pressable
                onPress={() => router.push('/new-request')}
                style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>Nueva solicitud</Text>
              </Pressable>
              {/* Muchos técnicos también conducen (ADR 0004). */}
              <MyTrips />
            </View>
          }
          footer={logoutButton}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['trips'] })}
            />
          }
        >
          {greeting}
          <MyTrips />
          <View style={styles.bottom}>{logoutButton}</View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.blanco },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.linea,
  },
  container: { flexGrow: 1, padding: spacing.lg },
  greeting: { fontFamily: fonts.medium, fontSize: type.display, color: colors.negroLavado },
  role: {
    fontFamily: fonts.regular,
    fontSize: type.small,
    color: colors.tintaSuave,
    marginTop: spacing.xs,
  },
  primary: {
    minHeight: touchTarget + 4,
    backgroundColor: colors.naranja,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  primaryPressed: { backgroundColor: '#EF6E46' },
  primaryText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.negroLavado },
  bottom: { marginTop: 'auto', paddingTop: spacing.xl },
  logout: {
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontFamily: fonts.semibold, color: colors.turquesaFuerte, fontSize: type.body },
});
