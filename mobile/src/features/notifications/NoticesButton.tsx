import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, touchTarget } from '@/lib/theme';
import { useUnreadCount } from './api';

/** Acceso a la bandeja con el número de avisos sin leer, para la cabecera del inicio. */
export function NoticesButton() {
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;
  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={count ? `Avisos, ${count} sin leer` : 'Avisos'}
    >
      <Text style={styles.text}>Avisos</Text>
      {count ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  text: { fontFamily: fonts.semibold, fontSize: 16, color: colors.turquesaFuerte },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.naranja,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.negroLavado },
});
