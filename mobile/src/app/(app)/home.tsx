import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup } from '@/components/BrandLockup';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import { useSession } from '@/store/session';

const ROLE_LABEL = {
  ADMIN: 'Coordinación',
  REQUESTER: 'Técnico/a de proyecto',
  DRIVER: 'Conductor/a',
} as const;

/**
 * Inicio. Para el técnico será "Mis solicitudes"; para el conductor, "Mis viajes".
 * Mientras esas pantallas no existan, se explica qué aparecerá aquí.
 */
export default function HomeScreen() {
  const { user, clearSession } = useSession();
  const isDriver = user?.role === 'DRIVER';

  const logout = async () => {
    await clearSession();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <BrandLockup />
      </View>
      <View style={styles.container}>
        <Text style={styles.greeting}>Hola, {user?.fullName.split(' ')[0]}</Text>
        <Text style={styles.role}>{user ? ROLE_LABEL[user.role] : ''}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {isDriver ? 'Mis viajes' : 'Mis solicitudes'}
          </Text>
          <Text style={styles.sectionBody}>
            {isDriver
              ? 'Aquí aparecerán los viajes que tengas asignados, con la hora de salida y el destino.'
              : 'Aquí aparecerán los medios que pidas y si la coordinación los aprobó.'}
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
  logout: {
    marginTop: 'auto',
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontFamily: fonts.semibold, color: colors.turquesaFuerte, fontSize: type.body },
});
