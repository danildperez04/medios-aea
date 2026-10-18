import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLockup } from '@/components/BrandLockup';
import { loginSchema, useLogin, type LoginInput } from '@/features/auth/api';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';

/**
 * Inicio de sesión para técnicos y conductores (HU-16). La franja naranja con la
 * marca en negro lavado es la aplicación de color por defecto del manual.
 */
export default function LoginScreen() {
  const login = useLogin();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      router.replace('/home');
    } catch {
      // El mensaje se muestra desde login.error.
    }
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.band}>
            <BrandLockup />
            <Text style={styles.lead}>Pide los medios para tu trabajo en las comunidades.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title} accessibilityRole="header">
              Iniciar sesión
            </Text>

            <Text style={styles.label}>Correo</Text>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  accessibilityLabel="Correo"
                />
              )}
            />
            {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}

            <Text style={styles.label}>Contraseña</Text>
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  secureTextEntry
                  autoComplete="password"
                  accessibilityLabel="Contraseña"
                  onSubmitEditing={onSubmit}
                />
              )}
            />
            {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}

            {login.error ? (
              <View style={styles.alert} accessibilityRole="alert">
                <Text style={styles.alertText}>{login.error.message}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={onSubmit}
              disabled={login.isPending}
              accessibilityRole="button"
            >
              {login.isPending ? (
                <ActivityIndicator color={colors.negroLavado} />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.naranja },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, backgroundColor: colors.blanco },
  band: {
    backgroundColor: colors.naranja,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  lead: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    color: colors.negroLavado,
    lineHeight: 24,
  },
  form: { padding: spacing.lg, gap: spacing.xs },
  title: {
    fontFamily: fonts.medium,
    fontSize: type.title,
    color: colors.negroLavado,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: type.small,
    color: colors.negroLavado,
    marginTop: spacing.md,
  },
  input: {
    minHeight: touchTarget,
    borderWidth: 1.5,
    borderColor: '#CFC5BB',
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: type.body,
    color: colors.negroLavado,
    marginTop: spacing.xs,
  },
  inputError: { borderColor: colors.naranjaFuerte },
  error: {
    fontFamily: fonts.regular,
    color: colors.negroLavado,
    fontSize: type.small,
    marginTop: spacing.xs,
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
});
