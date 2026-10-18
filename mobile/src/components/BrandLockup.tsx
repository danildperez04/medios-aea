import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';

/**
 * Marca según la arquitectura de marca del manual: "Ayuda en Acción" y, tras una
 * línea, el nombre del proyecto. Sin isotipo hasta tener el archivo oficial del logo.
 */
export function BrandLockup({ color = colors.negroLavado }: { color?: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel="Ayuda en Acción, Medios">
      <Text style={[styles.org, { color }]}>Ayuda{'\n'}en Acción</Text>
      <View style={[styles.rule, { backgroundColor: color }]} />
      <Text style={[styles.product, { color }]}>Medios</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  org: { fontFamily: fonts.medium, fontSize: 26, lineHeight: 26 },
  rule: { width: 1, alignSelf: 'stretch' },
  product: { fontFamily: fonts.regular, fontSize: 26 },
});
