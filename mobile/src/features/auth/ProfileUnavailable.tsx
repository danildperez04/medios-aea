import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup } from '@/components/BrandLockup';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';

interface Props {
  message: string;
  retrying: boolean;
  onRetry: () => void;
  onLogout: () => void;
}

/**
 * Hay sesión guardada pero no se pudo pedir el perfil (sin señal, servidor caído).
 * La sesión no se cierra por eso: se explica qué pasó y se deja reintentar (HU-16).
 */
export function ProfileUnavailable({ message, retrying, onRetry, onLogout }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <BrandLockup />
      </View>
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          No pudimos abrir tu sesión
        </Text>
        <Text style={styles.body}>{message}</Text>
        <Text style={styles.body}>Tu sesión sigue guardada en este teléfono.</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
        >
          {retrying ? (
            <ActivityIndicator color={colors.negroLavado} />
          ) : (
            <Text style={styles.buttonText}>Reintentar</Text>
          )}
        </Pressable>
        <Pressable onPress={onLogout} style={styles.logout} accessibilityRole="button">
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
  title: { fontFamily: fonts.medium, fontSize: type.title, color: colors.negroLavado },
  body: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    lineHeight: 25,
    color: colors.tintaSuave,
    marginTop: spacing.sm,
  },
  button: {
    minHeight: touchTarget + 4,
    backgroundColor: colors.naranja,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  buttonPressed: { backgroundColor: '#EF6E46' },
  buttonText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.negroLavado },
  logout: {
    marginTop: spacing.sm,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontFamily: fonts.semibold, color: colors.turquesaFuerte, fontSize: type.body },
});
