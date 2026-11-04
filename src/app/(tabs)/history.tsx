import { History } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { HistoryCard } from '@/components/HistoryCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText } from '@/components/AppText';
import { palette, spacing } from '@/constants/theme';
import { deleteRecordFiles } from '@/lib/files';
import { useToast } from '@/providers/ToastProvider';
import { useHistoryStore } from '@/store/historyStore';
import type { HistoryRecord } from '@/types/build';

export default function HistoryScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const records = useHistoryStore((state) => state.records);
  const removeRecord = useHistoryStore((state) => state.removeRecord);

  const handleOpen = useCallback(
    (record: HistoryRecord) => {
      router.push({ pathname: '/build/[id]', params: { id: record.id } });
    },
    [router],
  );

  const handleDelete = useCallback(
    (record: HistoryRecord) => {
      Alert.alert(
        'Hapus build ini?',
        `"${record.appName}" akan dihapus dari riwayat. File logo dan APK lokal juga dibersihkan.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: () => {
              removeRecord(record.id);
              deleteRecordFiles(record);
              showToast('Build dihapus dari riwayat.', 'success');
            },
          },
        ],
      );
    },
    [removeRecord, showToast],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryCard
            record={item}
            onOpen={() => handleOpen(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          records.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <View>
            <ScreenHeader
              title="Riwayat"
              eyebrow="ARSIP BUILD"
              subtitle={
                records.length > 0
                  ? `${records.length} build tersimpan di perangkat ini.`
                  : 'Semua build yang kamu jalankan akan muncul di sini.'
              }
            />
            {records.length > 0 ? (
              <AppText variant="label" color={palette.muted} style={styles.listLabel}>
                TERBARU DULU
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<History color={palette.primary} size={30} strokeWidth={2} />}
            title="Belum ada build"
            description="Mulai dari beranda: masukkan website, atur nama dan logo, lalu buat APK pertamamu."
            actionLabel="Buat aplikasi"
            onAction={() => router.push('/')}
            style={styles.emptyState}
          />
        }
        ListFooterComponent={
          records.length > 0 ? (
            <AppText variant="caption" color={palette.faint} align="center" style={styles.footer}>
              Riwayat menyimpan maksimal 50 build. Build lama otomatis dibersihkan.
            </AppText>
          ) : undefined
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 122,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listLabel: {
    marginBottom: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
  emptyState: {
    paddingTop: 46,
  },
  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});
