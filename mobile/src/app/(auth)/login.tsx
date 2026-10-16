import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginSchema, useLogin, type LoginInput } from '@/features/auth/api';
import { colors, spacing } from '@/lib/theme';

/** Inicio de sesión para técnicos y conductores (HU-16). */
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Medios AeA</Text>
          <Text style={styles.subtitle}>Solicitud de vehículos</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Correo</Text>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextInput
                style={styles.input}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="nombre@ayudaenaccion.org"
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
                style={styles.input}
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

          {login.error ? <Text style={styles.formError}>{login.error.message}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onSubmit}
            disabled={login.isPending}
            accessibilityRole="button"
          >
            {login.isPending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primaryDark },
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 32, fontWeight: '700', color: colors.onPrimary },
  subtitle: { fontSize: 16, color: colors.onPrimary, opacity: 0.8, marginTop: spacing.xs },
  form: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: spacing.xs,
    color: colors.text,
  },
  error: { color: colors.error, fontSize: 13, marginTop: spacing.xs },
  formError: { color: colors.error, fontSize: 14, marginTop: spacing.md, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
