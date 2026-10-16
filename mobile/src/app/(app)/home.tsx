import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing } from '@/lib/theme';
import { useSession } from '@/store/session';

const ROLE_LABEL = {
  ADMIN: 'Coordinación logística',
  REQUESTER: 'Técnico/a de proyecto',
  DRIVER: 'Conductor/a',
} as const;

/**
 * Inicio. En el Sprint 4 se convierte en "Mis solicitudes" para el técnico y
 * en el Sprint 5 en "Mis viajes" para el conductor.
 */
export default function HomeScreen() {
  const { user, clearSession } = useSession();

  const logout = async () => {
    await clearSession();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>Hola, {user?.fullName}</Text>
        <Text style={styles.role}>{user ? ROLE_LABEL[user.role] : ''}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {user?.role === 'DRIVER' ? 'Mis viajes' : 'Mis solicitudes'}
          </Text>
          <Text style={styles.cardBody}>
            {user?.role === 'DRIVER'
              ? 'Aquí verás los viajes que tienes asignados (Sprint 5).'
              : 'Aquí podrás solicitar un vehículo y seguir tus solicitudes (Sprint 4).'}
          </Text>
        </View>

        <Pressable onPress={logout} style={styles.logout} accessibilityRole="button">
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.text },
  role: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardBody: { fontSize: 15, color: colors.textMuted, marginTop: spacing.sm },
  logout: { marginTop: 'auto', alignItems: 'center', padding: spacing.md },
  logoutText: { color: colors.error, fontWeight: '600', fontSize: 16 },
});
