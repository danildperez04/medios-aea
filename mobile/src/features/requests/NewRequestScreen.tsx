import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import type { CreatedRequest } from './api';
import { NewRequestForm } from './NewRequestForm';

/** Pantalla de nueva solicitud (HU-17); al enviarla confirma con el código. */
export function NewRequestScreen({ now }: { now?: () => Date }) {
  const [created, setCreated] = useState<CreatedRequest | null>(null);
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
          {created ? 'Solicitud enviada' : 'Nueva solicitud'}
        </Text>
      </View>

      {created ? (
        <View style={styles.done}>
          <Text style={styles.code}>{created.code}</Text>
          <Text style={styles.body}>
            La coordinación la revisará y te avisará cuando la apruebe o la rechace. Mientras tanto,
            no reserva el vehículo.
          </Text>
          <Pressable
            style={styles.button}
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio"
          >
            <Text style={styles.buttonText}>Volver al inicio</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <NewRequestForm onCreated={setCreated} now={now} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.blanco },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.linea,
  },
  back: { minHeight: touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.turquesaFuerte },
  title: { fontFamily: fonts.medium, fontSize: type.title, color: colors.negroLavado },
  scroll: { padding: spacing.lg },
  done: { padding: spacing.lg, gap: spacing.md },
  code: { fontFamily: fonts.monoMedium, fontSize: 22, color: colors.negroLavado },
  body: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    lineHeight: 25,
    color: colors.tintaSuave,
  },
  button: {
    minHeight: touchTarget + 4,
    backgroundColor: colors.naranja,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.negroLavado },
});
