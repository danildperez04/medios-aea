import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup } from '@/components/BrandLockup';
import { logout } from '@/features/auth/api';
import { MyRequests } from '@/features/requests/MyRequests';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import { useSession } from '@/store/session';

const ROLE_LABEL = {
  ADMIN: 'Coordinación',
  REQUESTER: 'Técnico/a de proyecto',
  DRIVER: 'Conductor/a',
} as const;

/**
 * Inicio. Para quien pide medios (técnicos y coordinación), "Mis solicitudes" (HU-18).
 * Para el conductor serán "Mis viajes" (Sprint 5); mientras tanto se explica qué
 * aparecerá aquí.
 */
export default function HomeScreen() {
  const { user } = useSession();
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
            </View>
          }
          footer={logoutButton}
        />
      ) : (
        <View style={styles.container}>
          {greeting}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Mis viajes
            </Text>
            <Text style={styles.sectionBody}>
              Aquí aparecerán los viajes que tengas asignados, con la hora de salida y el destino.
            </Text>
          </View>
          <View style={styles.bottom}>{logoutButton}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.blanco },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.linea,
  },
  container: { flex: 1, padding: spacing.lg },
  greeting: { fontFamily: fonts.medium, fontSize: type.display, color: colors.negroLavado },
  role: {
    fontFamily: fonts.regular,
    fontSize: type.small,
    color: colors.tintaSuave,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.negroLavado,
  },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.negroLavado },
  sectionBody: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    lineHeight: 25,
    color: colors.tintaSuave,
    marginTop: spacing.sm,
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
  bottom: { marginTop: 'auto' },
  logout: {
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontFamily: fonts.semibold, color: colors.turquesaFuerte, fontSize: type.body },
});
