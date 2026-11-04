import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import {
  Eye,
  EyeOff,
  GitFork,
  KeyRound,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ColorSwatchPicker } from '@/components/ColorSwatchPicker';
import { LinkCard } from '@/components/LinkCard';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import {
  APP_NAME,
  APP_VERSION,
  GITHUB_TOKEN_DOCS_URL,
  PAT_SCOPES_URL,
  THEME_COLORS,
} from '@/constants/config';
import { palette, radii, spacing } from '@/constants/theme';
import { AppError, getErrorMessage, isAbortError } from '@/lib/errors';
import { deleteRecordFiles } from '@/lib/files';
import { checkRepoExists, verifyToken } from '@/lib/github';
import { getGitHubForkUrl, getGitHubRepoUrl } from '@/lib/links';
import {
  normalizeRepoSlug,
  validateRepoName,
  validateRepoSlug,
  validateUsername,
} from '@/lib/validation';
import { useToast } from '@/providers/ToastProvider';
import { useHistoryStore } from '@/store/historyStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTokenStore } from '@/store/tokenStore';

export default function SettingsScreen() {
  const { showToast } = useToast();
  const settings = useSettingsStore();
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const token = useTokenStore((state) => state.token);
  const saveToken = useTokenStore((state) => state.saveToken);
  const records = useHistoryStore((state) => state.records);
  const clearRecords = useHistoryStore((state) => state.clearRecords);

  const [username, setUsername] = useState(settings.githubUsername);
  const [repoName, setRepoName] = useState(settings.repoName);
  const [templateRepo, setTemplateRepo] = useState(settings.templateRepo);
  const [defaultThemeColor, setDefaultThemeColor] = useState(settings.defaultThemeColor);
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repoMissing, setRepoMissing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const templateSlug = normalizeRepoSlug(templateRepo);
  const forkUrl = templateSlug ? getGitHubForkUrl(templateSlug) : null;
  const repoUrl =
    username.trim() && repoName.trim()
      ? getGitHubRepoUrl(username.trim(), repoName.trim())
      : null;

  const openUrl = useCallback(async (url: string | null) => {
    if (!url) {
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  }, []);

  const handleSave = useCallback(async () => {
    const templateValidation = validateRepoSlug(templateRepo);
    if (templateValidation) {
      setError(templateValidation);
      return;
    }

    const repoValidation = validateRepoName(repoName);
    if (repoValidation) {
      setError(repoValidation);
      return;
    }

    if (username.trim()) {
      const usernameValidation = validateUsername(username);
      if (usernameValidation) {
        setError(usernameValidation);
        return;
      }
    }

    const effectiveToken = newToken.trim() || token;
    if (!effectiveToken) {
      setError('Token GitHub belum ada. Buat token dengan scope repo dan workflow.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setRepoMissing(false);
    setStage('Memverifikasi token GitHub...');

    try {
      const user = await verifyToken(effectiveToken, controller.signal);

      if (username.trim() && username.trim().toLowerCase() !== user.login.toLowerCase()) {
        showToast(`Username disesuaikan menjadi @${user.login}.`, 'info');
      }
      setUsername(user.login);

      setStage('Memeriksa repo build...');
      const exists = await checkRepoExists(
        user.login,
        repoName.trim(),
        effectiveToken,
        controller.signal,
      );

      if (!exists) {
        setRepoMissing(true);
        throw new AppError(
          'not_found',
          `Repo ${user.login}/${repoName.trim()} tidak ditemukan. Fork template terlebih dahulu, lalu simpan lagi.`,
        );
      }

      setStage('Menyimpan pengaturan...');
      if (newToken.trim()) {
        await saveToken(newToken.trim());
      }

      saveSettings({
        githubUsername: user.login,
        repoName: repoName.trim(),
        templateRepo: normalizeRepoSlug(templateRepo) ?? templateRepo.trim(),
        defaultThemeColor,
      });

      setNewToken('');
      setShowToken(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Pengaturan tersimpan dan terverifikasi.', 'success');
    } catch (caught) {
      if (!isAbortError(caught)) {
        setError(getErrorMessage(caught));
      }
    } finally {
      setBusy(false);
      setStage(null);
      abortRef.current = null;
    }
  }, [
    defaultThemeColor,
    newToken,
    repoName,
    saveSettings,
    saveToken,
    showToast,
    templateRepo,
    token,
    username,
  ]);

  const handleResetHistory = useCallback(() => {
    if (records.length === 0) {
      showToast('Riwayat build masih kosong.', 'info');
      return;
    }

    Alert.alert(
      'Reset seluruh riwayat?',
      `${records.length} build akan dihapus dari perangkat, termasuk logo dan APK lokal yang tersimpan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            records.forEach(deleteRecordFiles);
            clearRecords();
            showToast('Seluruh riwayat sudah dihapus.', 'success');
          },
        },
      ],
    );
  }, [clearRecords, records, showToast]);

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Pengaturan"
        eyebrow="WORKSPACE"
        subtitle="Kelola koneksi GitHub dan preferensi build di perangkat ini."
      />

      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusIcon}>
            <ShieldCheck color={palette.primary} size={22} strokeWidth={2.1} />
          </View>
          <View style={styles.statusText}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {settings.githubUsername ? `@${settings.githubUsername}` : 'Belum terhubung'}
            </AppText>
            <AppText variant="caption" color={palette.muted} numberOfLines={1}>
              {settings.githubUsername && settings.repoName
                ? `${settings.githubUsername}/${settings.repoName}`
                : 'Hubungkan akun untuk mulai build'}
            </AppText>
          </View>
          <Badge
            label={token ? 'TERHUBUNG' : 'PERLU TOKEN'}
            tone={token ? 'success' : 'warning'}
          />
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <AppText variant="label" color={palette.muted}>
          KONEKSI GITHUB
        </AppText>
      </View>

      <Card>
        <TextField
          label="Username GitHub"
          placeholder="octocat"
          value={username}
          onChangeText={(value) => {
            setUsername(value);
            setError(null);
            setRepoMissing(false);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={<User color={palette.faint} size={17} strokeWidth={2} />}
          hint="Disesuaikan dengan pemilik token saat verifikasi."
          containerStyle={styles.field}
        />

        <TextField
          label="Nama repo build"
          placeholder="webview-wrapper-template"
          value={repoName}
          onChangeText={(value) => {
            setRepoName(value);
            setError(null);
            setRepoMissing(false);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={<GitFork color={palette.faint} size={17} strokeWidth={2} />}
          hint="Repo hasil fork yang berisi workflow build."
          containerStyle={styles.field}
        />

        <TextField
          label="Repo template"
          placeholder="pemilik/webview-wrapper-template"
          value={templateRepo}
          onChangeText={(value) => {
            setTemplateRepo(value);
            setError(null);
            setRepoMissing(false);
          }}
          onBlur={() => {
            const normalized = normalizeRepoSlug(templateRepo);
            if (normalized) {
              setTemplateRepo(normalized);
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={<GitFork color={palette.faint} size={17} strokeWidth={2} />}
          hint="Sumber fork. Format pemilik/nama-repo."
          containerStyle={styles.field}
        />

        <TextField
          label="Personal Access Token"
          placeholder={token ? 'Token tersimpan. Isi untuk mengganti.' : 'ghp_...'}
          value={newToken}
          onChangeText={(value) => {
            setNewToken(value);
            setError(null);
          }}
          secureTextEntry={!showToken}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={<KeyRound color={palette.faint} size={17} strokeWidth={2} />}
          rightElement={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showToken ? 'Sembunyikan token' : 'Tampilkan token'}
              hitSlop={10}
              onPress={() => setShowToken((current) => !current)}
            >
              {showToken ? (
                <EyeOff color={palette.muted} size={18} strokeWidth={2} />
              ) : (
                <Eye color={palette.muted} size={18} strokeWidth={2} />
              )}
            </Pressable>
          }
          hint={
            token
              ? 'Token lama tetap dipakai jika kolom ini dikosongkan.'
              : 'Scope yang dibutuhkan: repo dan workflow.'
          }
        />

        <Pressable
          accessibilityRole="link"
          onPress={() => void openUrl(PAT_SCOPES_URL)}
          style={({ pressed }) => [styles.tokenLink, pressed && styles.pressed]}
        >
          <KeyRound color={palette.primary} size={14} strokeWidth={2.1} />
          <AppText variant="labelSmall" color={palette.primary}>
            BUAT TOKEN BARU
          </AppText>
        </Pressable>
      </Card>

      <View style={styles.sectionHeader}>
        <AppText variant="label" color={palette.muted}>
          TAMPILAN DEFAULT
        </AppText>
      </View>

      <Card>
        <AppText variant="bodyStrong">Warna aksen build</AppText>
        <AppText variant="caption" color={palette.muted} style={styles.colorDescription}>
          Warna awal untuk form build berikutnya.
        </AppText>
        <ColorSwatchPicker
          colors={THEME_COLORS}
          selected={defaultThemeColor}
          onSelect={setDefaultThemeColor}
        />
        <View style={styles.colorValueRow}>
          <View style={[styles.colorDot, { backgroundColor: defaultThemeColor }]} />
          <AppText variant="bodyStrong">{defaultThemeColor.toUpperCase()}</AppText>
        </View>
      </Card>

      {error ? (
        <Notice
          tone="error"
          title="Pengaturan belum tersimpan"
          message={error}
          style={styles.errorNotice}
        />
      ) : null}

      {repoMissing ? (
        <Button
          label="Fork template di GitHub"
          variant="secondary"
          size="md"
          onPress={() => void openUrl(forkUrl)}
          disabled={!forkUrl}
          icon={<GitFork color={palette.primaryDark} size={16} strokeWidth={2.2} />}
          style={styles.forkButton}
        />
      ) : null}

      {busy && stage ? (
        <View style={styles.stageRow}>
          <ActivityIndicator color={palette.primary} size="small" />
          <AppText variant="bodyStrong" color={palette.primaryDark} style={styles.stageText}>
            {stage}
          </AppText>
        </View>
      ) : null}

      <Button
        label={busy ? 'Memverifikasi...' : 'Simpan pengaturan'}
        onPress={() => void handleSave()}
        loading={busy}
        disabled={busy}
        icon={<ShieldCheck color={palette.white} size={18} strokeWidth={2.2} />}
        style={styles.saveButton}
      />

      <View style={styles.sectionHeader}>
        <AppText variant="label" color={palette.muted}>
          TAUTAN CEPAT
        </AppText>
      </View>

      <View style={styles.linkStack}>
        <LinkCard
          icon={<GitFork color={palette.primary} size={21} strokeWidth={2.1} />}
          title="Repo build"
          description={
            repoUrl
              ? `${username.trim()}/${repoName.trim()}`
              : 'Isi username dan nama repo terlebih dahulu.'
          }
          actionLabel="Buka GitHub"
          disabled={!repoUrl}
          onPress={() => void openUrl(repoUrl)}
        />
        <LinkCard
          icon={<KeyRound color={palette.primary} size={21} strokeWidth={2.1} />}
          title="Panduan Personal Access Token"
          description="Cara membuat dan mengatur masa berlaku token GitHub."
          actionLabel="Baca dokumentasi"
          onPress={() => void openUrl(GITHUB_TOKEN_DOCS_URL)}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="label" color={palette.muted}>
          DATA LOKAL
        </AppText>
      </View>

      <Card style={styles.dangerCard}>
        <View style={styles.dangerHeader}>
          <View style={styles.dangerIcon}>
            <Trash2 color={palette.danger} size={19} strokeWidth={2.1} />
          </View>
          <View style={styles.dangerText}>
            <AppText variant="bodyStrong">Reset riwayat build</AppText>
            <AppText variant="caption" color={palette.muted} style={styles.dangerDescription}>
              Menghapus semua catatan build, logo, dan APK lokal. Token GitHub tidak terhapus.
            </AppText>
          </View>
        </View>
        <Button
          label="Reset riwayat"
          variant="danger"
          size="md"
          onPress={handleResetHistory}
          disabled={busy || records.length === 0}
          icon={<Trash2 color={palette.white} size={16} strokeWidth={2.2} />}
        />
      </Card>

      <View style={styles.sectionHeader}>
        <AppText variant="label" color={palette.muted}>
          TENTANG
        </AppText>
      </View>

      <Card>
        <View style={styles.aboutRow}>
          <BrandMark size={32} showWordmark={false} />
          <View style={styles.aboutText}>
            <AppText variant="bodyStrong">{APP_NAME}</AppText>
            <AppText variant="caption" color={palette.muted}>
              Versi {APP_VERSION} · Android release builder
            </AppText>
          </View>
          <Badge label="LOKAL" tone="info" showDot={false} />
        </View>
        <View style={styles.aboutDivider} />
        <AppText variant="caption" color={palette.muted} style={styles.aboutNote}>
          Token disimpan di SecureStore. Riwayat dan preferensi disimpan di perangkat.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: 122,
  },
  statusCard: {
    paddingVertical: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  statusIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  statusText: {
    flex: 1,
    gap: 1,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  field: {
    marginBottom: spacing.md,
  },
  tokenLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.65,
  },
  colorDescription: {
    marginTop: 2,
    marginBottom: spacing.md,
  },
  colorValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  errorNotice: {
    marginTop: spacing.md,
  },
  forkButton: {
    marginTop: spacing.sm,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.primarySoft,
    padding: spacing.sm + 2,
    marginTop: spacing.md,
  },
  stageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
  linkStack: {
    gap: spacing.sm,
  },
  dangerCard: {
    borderColor: '#FECACA',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  dangerIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.dangerSoft,
  },
  dangerText: {
    flex: 1,
    gap: 2,
  },
  dangerDescription: {
    lineHeight: 18,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  aboutText: {
    flex: 1,
    gap: 1,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: spacing.md,
  },
  aboutNote: {
    lineHeight: 18,
  },
});
