import { AppPreviewCard } from '@/components/AppPreviewCard';
import { AppText } from '@/components/AppText';
import { BuildStatusBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BUILD_POLL_INTERVAL_MS } from '@/constants/config';
import { palette, radii, spacing } from '@/constants/theme';
import { downloadApkForRun, waitForRunAfterDispatch } from '@/lib/buildService';
import { getErrorMessage, isAbortError } from '@/lib/errors';
import { deleteFileIfExists, localFileExists } from '@/lib/files';
import { formatDateTime, getHostname } from '@/lib/format';
import { pollBuildStatus, triggerBuild } from '@/lib/github';
import { logoToDispatchBase64 } from '@/lib/image';
import { getActionsUrl, getGitHubRepoUrl } from '@/lib/links';
import { useToast } from '@/providers/ToastProvider';
import { useHistoryStore } from '@/store/historyStore';
import { useTokenStore } from '@/store/tokenStore';
import type { BuildStatus, HistoryRecord } from '@/types/build';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as IntentLauncher from 'expo-intent-launcher';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileQuestion,
  RefreshCw,
  RotateCcw,
  Smartphone,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

function describeConclusion(conclusion: string | null): string {
  switch (conclusion) {
    case 'cancelled':
      return 'Build dibatalkan di GitHub Actions.';
    case 'timed_out':
      return 'Build melewati batas waktu. Coba lagi dengan logo yang lebih sederhana.';
    case 'action_required':
      return 'Workflow memerlukan tindakan manual di GitHub Actions.';
    case 'startup_failure':
      return 'Workflow gagal dimulai. Pastikan file build.yml ada di repo hasil fork.';
    case 'skipped':
      return 'Build dilewati oleh konfigurasi workflow.';
    case 'failure':
      return 'Workflow gagal. Buka log GitHub Actions untuk melihat penyebabnya.';
    default:
      return 'Build tidak berhasil diselesaikan. Buka log GitHub Actions untuk detailnya.';
  }
}

function statusLabel(status: BuildStatus): string {
  switch (status) {
    case 'queued':
      return 'Menunggu antrean runner';
    case 'in_progress':
      return 'Membangun APK';
    case 'success':
      return 'Build selesai';
    case 'failed':
      return 'Build gagal';
    default:
      return 'Memproses';
  }
}

function BuildStep({
  label,
  state,
}: {
  label: string;
  state: 'done' | 'active' | 'pending';
}) {
  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepDot,
          state === 'done' && styles.stepDotDone,
          state === 'active' && styles.stepDotActive,
        ]}
      >
        {state === 'done' ? (
          <Check color={palette.white} size={12} strokeWidth={3} />
        ) : state === 'active' ? (
          <View style={styles.stepDotInner} />
        ) : null}
      </View>
      <AppText
        variant="bodyStrong"
        color={state === 'pending' ? palette.faint : palette.text}
        style={styles.stepLabel}
      >
        {label}
      </AppText>
      {state === 'active' ? <ActivityIndicator color={palette.primary} size="small" /> : null}
    </View>
  );
}

export default function BuildScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const records = useHistoryStore((state) => state.records);
  const updateRecord = useHistoryStore((state) => state.updateRecord);
  const token = useTokenStore((state) => state.token);

  const record = useMemo(
    () => records.find((item) => item.id === id),
    [id, records],
  );

  const [pollError, setPollError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const pollingRef = useRef(false);

  const hasLocalApk = localFileExists(record?.apkUri);
  const isRunning = record?.status === 'queued' || record?.status === 'in_progress';

  const startPolling = useCallback(
    async (
      target: HistoryRecord,
      currentToken: string,
      options?: { excludeRunId?: number | null },
    ) => {
      if (pollingRef.current) {
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      pollingRef.current = true;

      try {
        let runId = target.runId;

        if (runId === null) {
          const latest = await waitForRunAfterDispatch({
            owner: target.owner,
            repo: target.repo,
            token: currentToken,
            dispatchedAt: target.dispatchedAt,
            excludeRunId: options?.excludeRunId ?? null,
            signal: controller.signal,
          });

          runId = latest.id;
          updateRecord(target.id, {
            runId,
            runUrl: latest.htmlUrl,
            status: 'queued',
            progress: 10,
          });
        }

        const finalRun = await pollBuildStatus({
          owner: target.owner,
          repo: target.repo,
          token: currentToken,
          runId,
          signal: controller.signal,
          onUpdate: (snapshot) => {
            const completed = snapshot.status === 'completed';
            const nextStatus: BuildStatus = completed
              ? snapshot.conclusion === 'success'
                ? 'success'
                : 'failed'
              : snapshot.status === 'in_progress'
                ? 'in_progress'
                : 'queued';

            updateRecord(target.id, {
              runId: snapshot.run.id,
              runUrl: snapshot.run.htmlUrl,
              status: nextStatus,
              progress: snapshot.progress,
              error:
                completed && snapshot.conclusion !== 'success'
                  ? describeConclusion(snapshot.conclusion)
                  : null,
            });
          },
        });

        if (finalRun.conclusion === 'success') {
          updateRecord(target.id, {
            status: 'success',
            progress: 100,
            error: null,
            runUrl: finalRun.htmlUrl,
          });
          showToast('Build selesai. APK siap diunduh.', 'success');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          updateRecord(target.id, {
            status: 'failed',
            progress: 100,
            error: describeConclusion(finalRun.conclusion),
            runUrl: finalRun.htmlUrl,
          });
          showToast('Build gagal. Periksa log di GitHub Actions.', 'error');
        }
      } catch (error) {
        if (!isAbortError(error)) {
          setPollError(getErrorMessage(error));
        }
      } finally {
        pollingRef.current = false;
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [showToast, updateRecord],
  );

  const recordId = record?.id;

  useEffect(() => {
    if (!recordId || !token) {
      return;
    }

    const current = useHistoryStore.getState().records.find((item) => item.id === recordId);
    if (!current || current.status === 'success' || current.status === 'failed') {
      return;
    }

    const startTimer = setTimeout(() => {
      void startPolling(current, token);
    }, 0);

    return () => {
      clearTimeout(startTimer);
      controllerRef.current?.abort();
      controllerRef.current = null;
      pollingRef.current = false;
    };
  }, [recordId, startPolling, token]);

  const handleRetry = useCallback(async () => {
    if (!record) return;

    const currentToken = useTokenStore.getState().token;
    if (!currentToken) {
      setActionError('Token GitHub tidak tersedia. Buka Pengaturan untuk menghubungkan ulang.');
      return;
    }

    setRetrying(true);
    setActionError(null);
    setPollError(null);

    try {
      const logoBase64 = await logoToDispatchBase64(record.logoUri);
      const dispatchedAt = Date.now();
      const previousRunId = record.runId;

      await triggerBuild({
        owner: record.owner,
        repo: record.repo,
        token: currentToken,
        url: record.url,
        appName: record.appName,
        logoBase64,
        themeColor: record.themeColor,
      });

      if (record.apkUri) {
        deleteFileIfExists(record.apkUri);
      }

      updateRecord(record.id, {
        status: 'queued',
        progress: 10,
        runId: null,
        runUrl: null,
        artifactId: null,
        apkUri: null,
        error: null,
        createdAt: dispatchedAt,
        dispatchedAt,
      });

      const nextRecord: HistoryRecord = {
        ...record,
        status: 'queued',
        progress: 10,
        runId: null,
        runUrl: null,
        artifactId: null,
        apkUri: null,
        error: null,
        createdAt: dispatchedAt,
        dispatchedAt,
      };

      void startPolling(nextRecord, currentToken, { excludeRunId: previousRunId });
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setRetrying(false);
    }
  }, [record, startPolling, updateRecord]);

  // --- FUNGSI DOWNLOAD (Hanya simpan ke cache, tanpa pop-up folder) ---
  const handleDownload = useCallback(async () => {
    if (!record) return;

    const currentToken = useTokenStore.getState().token;
    if (!currentToken) {
      setActionError('Token GitHub tidak tersedia.');
      return;
    }

    if (!record.runId) {
      setActionError('Run build belum ditemukan.');
      return;
    }

    setDownloading(true);
    setActionError(null);

    try {
      const result = await downloadApkForRun({
        owner: record.owner,
        repo: record.repo,
        token: currentToken,
        runId: record.runId,
        buildId: record.id,
      });

      updateRecord(record.id, {
        apkUri: result.apkUri,
        artifactId: result.artifactId,
      });

      showToast('APK berhasil diunduh. Ketuk Install APK.', 'success');
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  }, [record, showToast, updateRecord]);

  // --- FUNGSI INSTALL LANGSUNG (Buka pop-up installer Android) ---
  const handleInstall = useCallback(async () => {
    if (!record || !record.apkUri) {
      setActionError('File APK tidak ditemukan. Silakan unduh ulang.');
      return;
    }

    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(record.apkUri);
        
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1, // Flag untuk grant read permission
          type: 'application/vnd.android.package-archive',
        });
      }
    } catch (error) {
      setActionError('Gagal membuka installer. Pastikan kamu mengizinkan instalasi dari sumber tidak dikenal.');
    }
  }, [record]);

  const handleCopyLink = useCallback(async () => {
    if (!record?.runUrl) {
      showToast('Tautan build belum tersedia.', 'info');
      return;
    }

    try {
      await Clipboard.setStringAsync(record.runUrl);
      showToast('Tautan build disalin.', 'success');
    } catch {
      showToast('Tautan gagal disalin.', 'error');
    }
  }, [record?.runUrl, showToast]);

  const handleResume = useCallback(() => {
    if (!record || !isRunning) return;

    const currentToken = useTokenStore.getState().token;
    if (!currentToken) {
      setPollError('Token GitHub tidak tersedia. Buka Pengaturan untuk menghubungkan ulang.');
      return;
    }

    setPollError(null);
    setActionError(null);
    void startPolling(record, currentToken);
  }, [isRunning, record, startPolling]);

  if (!record) {
    return (
      <Screen contentContainerStyle={styles.content}>
        <ScreenHeader title="Build tidak ditemukan" eyebrow="BUILD APK" onBack={() => router.back()} />
        <EmptyState
          icon={<FileQuestion color={palette.primary} size={30} strokeWidth={2} />}
          title="Data build hilang"
          description="Build ini mungkin sudah dihapus dari riwayat. Jalankan build baru dari beranda."
          actionLabel="Kembali ke beranda"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  const actionsUrl = getActionsUrl(record.owner, record.repo);
  const repoUrl = getGitHubRepoUrl(record.owner, record.repo);

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        title={record.appName}
        eyebrow="BUILD APK"
        subtitle={getHostname(record.url)}
        onBack={() => router.back()}
        right={<BuildStatusBadge status={record.status} />}
      />

      <AppPreviewCard
        appName={record.appName}
        url={record.url}
        logoUri={record.logoUri}
        themeColor={record.themeColor}
      />

      {!token ? (
        <>
          <Notice
            tone="warning"
            title="Token GitHub tidak tersedia"
            message="Token diperlukan untuk memantau build dan mengunduh artifact APK. Hubungkan ulang akun GitHub."
            style={styles.noticeSpacing}
          />
          <Button
            label="Buka pengaturan"
            variant="secondary"
            onPress={() => router.push('/settings')}
          />
        </>
      ) : null}

      {token && isRunning ? (
        <Card style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View>
              <AppText variant="label" color={palette.muted}>
                PROGRES BUILD
              </AppText>
              <View style={styles.progressNumberRow}>
                <AppText variant="number" color={palette.primaryDeep} style={styles.progressNumber}>
                  {record.progress}
                </AppText>
                <AppText variant="h2" color={palette.muted} style={styles.percent}>
                  %
                </AppText>
              </View>
            </View>
            <View style={styles.progressIcon}>
              <Smartphone color={palette.primary} size={28} strokeWidth={1.9} />
            </View>
          </View>

          <ProgressBar progress={record.progress} height={9} />

          <View style={styles.phaseRow}>
            <ActivityIndicator color={palette.primary} size="small" />
            <AppText variant="bodyStrong" color={palette.primaryDark} style={styles.phaseText}>
              {record.runId === null
                ? 'Menunggu build muncul di GitHub Actions...'
                : statusLabel(record.status)}
            </AppText>
          </View>
          <AppText variant="caption" color={palette.muted} style={styles.pollCaption}>
            Status diperbarui otomatis setiap {Math.round(BUILD_POLL_INTERVAL_MS / 1000)} detik.
            Kamu boleh meninggalkan layar ini.
          </AppText>

          <View style={styles.stepsCard}>
            <BuildStep
              label="Menunggu runner GitHub"
              state={record.status === 'in_progress' ? 'done' : 'active'}
            />
            <BuildStep
              label="Membangun APK release"
              state={record.status === 'in_progress' ? 'active' : 'pending'}
            />
            <BuildStep label="Mengunggah artifact" state="pending" />
          </View>
        </Card>
      ) : null}

      {token && record.status === 'success' ? (
        <Card style={styles.successCard}>
          <View style={styles.resultHeader}>
            <View style={styles.successIcon}>
              <CheckCircle2 color={palette.success} size={24} strokeWidth={2.2} />
            </View>
            <View style={styles.resultText}>
              <AppText variant="h3">APK siap dipasang</AppText>
              <AppText variant="caption" color={palette.muted}>
                Build selesai {formatDateTime(record.createdAt)}
              </AppText>
            </View>
          </View>

          {/* LOGIKA TOMBOL: Kalau belum ada APK -> Unduh. Kalau udah ada -> Install */}
          {!hasLocalApk ? (
            <Button
              label="Unduh APK"
              onPress={() => void handleDownload()}
              loading={downloading}
              disabled={downloading}
              icon={<Download color={palette.white} size={18} strokeWidth={2.2} />}
              style={styles.downloadButton}
            />
          ) : (
            <Button
              label="Install APK"
              onPress={() => void handleInstall()}
              icon={<Smartphone color={palette.white} size={18} strokeWidth={2.2} />}
              style={styles.downloadButton}
            />
          )}

          <Button
            label="Salin Link"
            variant="secondary"
            onPress={() => void handleCopyLink()}
            disabled={!record.runUrl}
            icon={<Copy color={palette.primaryDark} size={17} strokeWidth={2.1} />}
          />
          <Button
            label="Buka Website"
            variant="ghost"
            onPress={() => void WebBrowser.openBrowserAsync(record.url)}
            icon={<ExternalLink color={palette.text} size={17} strokeWidth={2.1} />}
            style={styles.resultButtonSpacing}
          />

          <AppText variant="caption" color={palette.faint} style={styles.resultNote}>
            Artifact di GitHub disimpan selama 90 hari. Unduh dan install APK sekarang agar tidak perlu membangun ulang.
          </AppText>
        </Card>
      ) : null}

      {token && record.status === 'failed' ? (
        <Card style={styles.failureCard}>
          <View style={styles.resultHeader}>
            <View style={styles.failureIcon}>
              <AlertCircle color={palette.danger} size={24} strokeWidth={2.2} />
            </View>
            <View style={styles.resultText}>
              <AppText variant="h3">Build belum berhasil</AppText>
              <AppText variant="caption" color={palette.muted} style={styles.failureText}>
                {record.error ?? 'Workflow tidak selesai dengan sukses.'}
              </AppText>
            </View>
          </View>

          <Button
            label="Coba build ulang"
            onPress={() => void handleRetry()}
            loading={retrying}
            disabled={retrying}
            icon={<RotateCcw color={palette.white} size={17} strokeWidth={2.2} />}
            style={styles.downloadButton}
          />
          <Button
            label="Buka log di GitHub Actions"
            variant="secondary"
            onPress={() => void WebBrowser.openBrowserAsync(record.runUrl ?? actionsUrl)}
            icon={<ExternalLink color={palette.primaryDark} size={17} strokeWidth={2.1} />}
          />

          <AppText variant="caption" color={palette.faint} style={styles.resultNote}>
            Periksa langkah yang gagal di Actions. Masalah umum: workflow belum ada di repo hasil
            fork, token kehilangan scope, atau input logo terlalu besar.
          </AppText>
        </Card>
      ) : null}

      {pollError ? (
        <Notice
          tone="error"
          title="Pemantauan terhenti"
          message={pollError}
          style={styles.noticeSpacing}
        />
      ) : null}

      {pollError && isRunning ? (
        <Button
          label="Lanjutkan pemantauan"
          variant="secondary"
          onPress={handleResume}
          icon={<RefreshCw color={palette.primaryDark} size={17} strokeWidth={2.1} />}
          style={styles.resumeButton}
        />
      ) : null}

      {actionError ? (
        <Notice
          tone="error"
          title="Aksi gagal"
          message={actionError}
          style={styles.noticeSpacing}
        />
      ) : null}

      <Button
        label="Buka GitHub Actions"
        variant="ghost"
        size="md"
        onPress={() => void WebBrowser.openBrowserAsync(record.runUrl ?? actionsUrl)}
        icon={<ExternalLink color={palette.text} size={16} strokeWidth={2.1} />}
        style={styles.actionsButton}
      />
      <Button
        label="Buka repo build"
        variant="ghost"
        size="md"
        onPress={() => void WebBrowser.openBrowserAsync(repoUrl)}
        icon={<ExternalLink color={palette.text} size={16} strokeWidth={2.1} />}
        style={styles.repoButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  noticeSpacing: {
    marginTop: spacing.md,
  },
  progressCard: {
    marginTop: spacing.md,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  progressNumber: {
    fontSize: 54,
    lineHeight: 58,
  },
  percent: {
    marginBottom: 7,
  },
  progressIcon: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  phaseText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
  },
  pollCaption: {
    marginTop: 3,
    lineHeight: 18,
  },
  stepsCard: {
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  stepDotDone: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  stepDotActive: {
    borderColor: palette.primary,
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
  },
  stepLabel: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
  },
  successCard: {
    marginTop: spacing.md,
    borderColor: '#A7F3D0',
  },
  failureCard: {
    marginTop: spacing.md,
    borderColor: '#FECACA',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.successSoft,
  },
  failureIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.dangerSoft,
  },
  resultText: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  failureText: {
    lineHeight: 18,
  },
  downloadButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  resultButtonSpacing: {
    marginTop: spacing.sm,
  },
  resultNote: {
    marginTop: spacing.md,
    lineHeight: 18,
  },
  resumeButton: {
    marginTop: spacing.sm,
  },
  actionsButton: {
    marginTop: spacing.lg,
  },
  repoButton: {
    marginTop: spacing.sm,
  },
});