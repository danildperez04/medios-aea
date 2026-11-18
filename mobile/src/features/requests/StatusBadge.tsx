import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/lib/theme';
import type { RequestStatus } from './api';
import { STATUS } from './status';

export function StatusBadge({ status }: { status: RequestStatus }) {
  const style = STATUS[status];
  return (
    <View style={[styles.badge, { backgroundColor: style.background, borderColor: style.border }]}>
      <Text style={styles.text}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  text: { fontFamily: fonts.semibold, fontSize: 13, color: colors.negroLavado },
});
