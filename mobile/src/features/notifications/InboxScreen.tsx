import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatClockTime, formatDateKey, managuaParts } from '@/lib/managua';
import { colors, fonts, spacing, touchTarget, type } from '@/lib/theme';
import { useSession } from '@/store/session';
import { useMarkAllRead, useMarkRead, useNotices, type Notice } from './api';
import { openNotice } from './open';

const when = (iso: string) => {
  const { date, time } = managuaParts(iso);
  return `${formatDateKey(date)}, ${formatClockTime(time)}`;
};

/** Bandeja de avisos con leídos y no leídos (RF-19, HU-19). */
export function InboxScreen() {
  const role = useSession((state) => state.user?.role);
  const notices = useNotices();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const rows = notices.data?.data ?? [];
  const unread = rows.filter((notice) => !notice.readAt).length;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const open = (notice: Notice) => {
    if (!notice.readAt) markRead.mutate(notice.id);
    // Un aviso sin solicitud asociada solo se marca como leído.
    if (notice.data?.reservationId) {
      openNotice(
        { reservationId: notice.data.reservationId, audience: notice.data.audience },
        role,
      );
    }
  };

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
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            Avisos
          </Text>
          {unread > 0 ? (
            <Pressable
              onPress={() => markAll.mutate()}
              disabled={markAll.isPending}
              style={styles.markAll}
              accessibilityRole="button"
            >
              <Text style={styles.markAllText}>Marcar todos como leídos</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={notices.isRefetching}
            onRefresh={() => void notices.refetch()}
          />
        }
        ListHeaderComponent={
          <View>
            {notices.isLoading ? <ActivityIndicator accessibilityLabel="Cargando avisos" /> : null}
            {notices.error ? (
              <View style={styles.alert} accessibilityRole="alert">
                <Text style={styles.alertText}>{notices.error.message}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          notices.isLoading || notices.error ? undefined : (
            <Text style={styles.empty}>
              Aquí te avisaremos cuando la coordinación apruebe, rechace o cambie tus solicitudes.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => open(item)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${item.readAt ? '' : 'Sin leer. '}${item.title}`}
          >
            <View style={[styles.dot, item.readAt ? styles.dotRead : null]} />
            <View style={styles.text}>
              <Text style={[styles.noticeTitle, item.readAt ? styles.read : null]}>
                {item.title}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.when}>{when(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.blanco },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.linea,
  },
  back: { minHeight: touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.turquesaFuerte },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.medium, fontSize: type.title, color: colors.negroLavado },
  markAll: { minHeight: touchTarget, justifyContent: 'center' },
  markAllText: { fontFamily: fonts.semibold, fontSize: type.small, color: colors.turquesaFuerte },
  content: { padding: spacing.lg, flexGrow: 1 },
  alert: {
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.naranjaFuerte,
    backgroundColor: '#FDECEB',
    borderRadius: 6,
  },
  alertText: { fontFamily: fonts.regular, fontSize: type.small, color: colors.negroLavado },
  empty: {
    fontFamily: fonts.regular,
    fontSize: type.body,
    lineHeight: 25,
    color: colors.tintaSuave,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.linea,
  },
  rowPressed: { backgroundColor: '#F7F3EF' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
    backgroundColor: colors.naranjaFuerte,
  },
  dotRead: { backgroundColor: 'transparent' },
  text: { flex: 1, gap: 2 },
  noticeTitle: { fontFamily: fonts.semibold, fontSize: type.body, color: colors.negroLavado },
  read: { fontFamily: fonts.regular },
  body: {
    fontFamily: fonts.regular,
    fontSize: type.small,
    lineHeight: 21,
    color: colors.negroLavado,
  },
  when: { fontFamily: fonts.mono, fontSize: 13, color: colors.tintaSuave, marginTop: 2 },
});
