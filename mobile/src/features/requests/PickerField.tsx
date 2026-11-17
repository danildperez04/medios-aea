import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';

interface Props {
  label: string;
  mode: 'date' | 'time';
  /** Valor que se muestra en el campo, ya formateado. */
  display: string;
  /** Valor actual para abrir el selector en él. */
  value: Date;
  minimumDate?: Date;
  onChange: (value: Date) => void;
  error?: string;
}

/**
 * Campo de fecha u hora con el selector nativo del teléfono: el diálogo del sistema en
 * Android y el selector en línea en iOS. Se toca un botón grande, no se escribe.
 */
export function PickerField({ label, mode, display, value, minimumDate, onChange, error }: Props) {
  const [inlineOpen, setInlineOpen] = useState(false);

  const handle = (event: DateTimePickerEvent, picked?: Date) => {
    setInlineOpen(false);
    if (event.type === 'set' && picked) onChange(picked);
  };

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode, minimumDate, is24Hour: false, onChange: handle });
    } else {
      setInlineOpen((current) => !current);
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={open}
        style={[styles.field, error ? styles.fieldError : null]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        accessibilityHint="Abre el selector"
      >
        <Text style={styles.value}>{display}</Text>
      </Pressable>
      {inlineOpen ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="spinner"
          minimumDate={minimumDate}
          onChange={handle}
        />
      ) : null}
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
  },
  field: {
    minHeight: touchTarget,
    borderWidth: 1.5,
    borderColor: '#CFC5BB',
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  fieldError: { borderColor: colors.naranjaFuerte },
  value: { fontFamily: fonts.regular, fontSize: type.body, color: colors.negroLavado },
  error: {
    fontFamily: fonts.regular,
    color: colors.negroLavado,
    fontSize: type.small,
    marginTop: spacing.xs,
  },
});
