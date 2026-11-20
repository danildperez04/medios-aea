import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';

export interface Choice {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  label: string;
  choices: Choice[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Lo que se muestra si no hay opciones. */
  empty: string;
}

/**
 * Lista de opciones para elegir una, con áreas táctiles grandes. Las listas de la
 * fundación son cortas (proyectos, personas con licencia): no hace falta buscar.
 */
export function ChoiceList({ label, choices, value, onChange, error, empty }: Props) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      {choices.length === 0 ? <Text style={styles.empty}>{empty}</Text> : null}
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <Pressable
            key={choice.value}
            onPress={() => onChange(choice.value)}
            style={[styles.option, selected ? styles.optionSelected : null]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={choice.label}
          >
            <View style={[styles.dot, selected ? styles.dotSelected : null]} />
            <View style={styles.text}>
              <Text style={styles.optionLabel}>{choice.label}</Text>
              {choice.hint ? <Text style={styles.hint}>{choice.hint}</Text> : null}
            </View>
          </Pressable>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.semibold,
    fontSize: type.small,
    color: colors.negroLavado,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  empty: { fontFamily: fonts.regular, fontSize: type.small, color: colors.tintaSuave },
  option: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.linea,
    borderRadius: 6,
    marginTop: spacing.xs,
  },
  optionSelected: { borderColor: colors.turquesaFuerte, backgroundColor: '#EAF4F5' },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CFC5BB',
  },
  dotSelected: { borderColor: colors.turquesaFuerte, borderWidth: 6 },
  text: { flex: 1 },
  optionLabel: { fontFamily: fonts.regular, fontSize: type.body, color: colors.negroLavado },
  hint: { fontFamily: fonts.mono, fontSize: 13, color: colors.tintaSuave, marginTop: 2 },
  error: {
    fontFamily: fonts.regular,
    color: colors.negroLavado,
    fontSize: type.small,
    marginTop: spacing.xs,
  },
});
