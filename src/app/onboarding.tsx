import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GitFork,
  KeyRound,
  ShieldCheck,
  Smartphone,
  User,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LinkCard } from '@/components/LinkCard';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import {
  DEFAULT_FORK_REPO,
  DEFAULT_THEME_COLOR,
  GITHUB_TOKEN_DOCS_URL,
  PAT_SCOPES_URL,
} from '@/constants/config';
import { palette, radii, spacing } from '@/constants/theme';
import { delay } from '@/lib/async';
import { AppError, getErrorMessage, isAbortError } from '@/lib/errors';
import {
  getGitHubForkUrl,
  getGitHubTemplateUrl,
} from '@/lib/links';
import {
  normalizeRepoSlug,
  parseRepoSlug,
  validateRepoName,
  validateRepoSlug,
  validateUsername,
} from '@/lib/validation';
import { checkRepoExists, forkTemplate, verifyToken } from '@/lib/github';
import { useToast } from '@/providers/ToastProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { useTokenStore } from '@/store/tokenStore';

const ONBOARDING_STEPS = 3;

const featureItems = [
  {
    Icon: GitFork,
    title: 'Fork template sekali',
    description: 'Repo Android wrapper disiapkan otomatis di akun GitHub-mu.',
  },
  {
    Icon: KeyRound,
    title: 'Token milikmu sendiri',
    description: 'Token disimpan aman di perangkat, tidak pernah dikirim ke server lain.',
  },
  {
    Icon: Smartphone,
    title: 'APK siap dipasang',
    description: 'Build berjalan di GitHub Actions, hasilnya bisa langsung diunduh.',
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const settings = useSettingsStore();
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const saveToken = useTokenStore((state) => state.saveToken);

  const [step, setStep] = useState(0);
  const [templateRepo, setTemplateRepo] = useState(settings.templateRepo);
  const [username, setUsername] = useState(settings.githubUsername);
  const [repoName, setRepoName] = useState(settings.repoName || DEFAULT_FORK_REPO);
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [autoFork, setAutoFork] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const templateSlug = normalizeRepoSlug(templateRepo);
  const templateUrl = templateSlug ? getGitHubTemplateUrl(templateSlug) : null;
  const forkUrl = templateSlug ? getGitHubForkUrl(templateSlug) : null;

  const openUrl = useCallback(async (url: string | null) => {
    if (!url) {
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  }, []);

  const changeStep = useCallback((next: number) => {
    Keyboard.dismiss();
    setTemplateError(null);
    setConnectError(null);
    setStep(next);
  }, []);

  const handleGuideNext = useCallback(() => {
    const error = validateRepoSlug(templateRepo);
    if (error) {
      setTemplateError(error);
      return;
    }

    const normalized = normalizeRepoSlug(templateRepo);
    if (normalized) {
      setTemplateRepo(normalized);
    }
    changeStep(2);
  }, [changeStep, templateRepo]);

  const handleQuickConnect = useCallback(() => {
    if (!normalizeRepoSlug(templateRepo)) {
      setTemplateError('Isi repo template terlebih dahulu agar aplikasi tahu sumber fork.');
      changeStep(1);
      return;
    }
    changeStep(2);
  }, [changeStep, templateRepo]);

  const handleConnect = useCallback(async () => {
    const templateValidation = validateRepoSlug(templateRepo);
    if (templateValidation) {
      setConnectError(templateValidation);
      return;
    }

    const usernameValidation = username.trim() ? validateUsername(username) : null;
    if (usernameValidation) {
      setConnectError(usernameValidation);
      return;
    }

    const repoValidation = validateRepoName(repoName);
    if (repoValidation) {
      setConnectError(repoValidation);
      return;
    }

    if (!token.trim()) {
      setConnectError('Personal Access Token wajib diisi.');
      return;
    }

    const template = parseRepoSlug(templateRepo);
    if (!template) {
      setConnectError('Format repo template tidak valid.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setConnectError(null);
    setStage('Memverifikasi token GitHub...');

    try {
      const user = await verifyToken(token.trim(), controller.signal);
      const enteredUsername = username.trim();

      if (enteredUsername && enteredUsername.toLowerCase() !== user.login.toLowerCase()) {
        showToast(`Username disesuaikan menjadi @${user.login}.`, 'info');
      }
      setUsername(user.login);

      setStage('Memeriksa repo hasil fork...');
      let repoExists = await checkRepoExists(
        user.login,
        repoName.trim(),
        token.trim(),
        controller.signal,
      );

      if (!repoExists) {
        if (!autoFork) {
          throw new AppError(
            'not_found',
            `Repo ${user.login}/${repoName.trim()} belum ada. Fork template terlebih dahulu, atau aktifkan fork otomatis.`,
          );
        }

        setStage('Membuat fork dari template...');
        await forkTemplate(template.owner, template.repo, token.trim(), controller.signal);

        setStage('Menunggu fork siap...');
        for (let attempt = 0; attempt < 20 && !repoExists; attempt += 1) {
          await delay(3000, controller.signal);
          repoExists = await checkRepoExists(
            user.login,
            repoName.trim(),
            token.trim(),
            controller.signal,
          );
        }

        if (!repoExists) {
          throw new AppError(
            'timeout',
            'Fork sedang dibuat tetapi belum siap. Tunggu sebentar lalu coba hubungkan lagi.',
          );
        }

        await delay(2000, controller.signal);
      }

      setStage('Menyimpan pengaturan...');
      await saveToken(token.trim());
      saveSettings({
        githubUsername: user.login,
        repoName: repoName.trim(),
        templateRepo: normalizeRepoSlug(templateRepo) ?? templateRepo.trim(),
        defaultThemeColor: settings.defaultThemeColor || DEFAULT_THEME_COLOR,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Terhubung sebagai @${user.login}.`, 'success');
      router.replace('/');
    } catch (error) {
      if (!isAbortError(error)) {
        setConnectError(getErrorMessage(error));
      }
    } finally {
      setBusy(false);
      setStage(null);
      abortRef.current = null;
    }
  }, [
    autoFork,
    repoName,
    router,
    saveSettings,
    saveToken,
    settings.defaultThemeColor,
    showToast,
    templateRepo,
    token,
    username,
  ]);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <BrandMark size={30} />
        <View style={styles.stepPill}>
          <AppText variant="labelSmall" color={palette.primaryDark}>
            {step === 0 ? 'MULAI' : `LANGKAH ${step} / ${ONBOARDING_STEPS - 1}`}
          </AppText>
        </View>
      </View>

      <View style={styles.progressRow}>
        {Array.from({ length: ONBOARDING_STEPS }).map((_, index) => (
          <View
            key={index}
            style={[styles.progressSegment, index <= step && styles.progressSegmentActive]}
          />
        ))}
      </View>

      {step === 0 ? (
        <Animated.View entering={FadeIn.duration(220)}>
          <View style={styles.hero}>
            <LinearGradient
              colors={[palette.primary, palette.primaryDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroCircleLarge} />
            <View style={styles.heroCircleSmall} />

            <View style={styles.heroBadge}>
              <ShieldCheck color={palette.white} size={13} strokeWidth={2.3} />
              <AppText variant="labelSmall" color={palette.white} style={styles.heroBadgeText}>
                ANDROID BUILD STUDIO
              </AppText>
            </View>

            <AppText variant="display" color={palette.white} style={styles.heroTitle}>
              Website jadi aplikasi.
            </AppText>
            <AppText variant="body" color="rgba(255,255,255,0.82)" style={styles.heroDescription}>
              Ubah website milikmu menjadi APK Android yang bisa dipasang, tanpa menulis kode
              native.
            </AppText>

            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <AppText variant="labelSmall" color="rgba(255,255,255,0.68)">
                  ALUR
                </AppText>
                <AppText variant="bodyStrong" color={palette.white}>
                  4 langkah
                </AppText>
              </View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaItem}>
                <AppText variant="labelSmall" color="rgba(255,255,255,0.68)">
                  OUTPUT
                </AppText>
                <AppText variant="bodyStrong" color={palette.white}>
                  APK release
                </AppText>
              </View>
            </View>
          </View>

          <Card style={styles.featureCard}>
            {featureItems.map(({ Icon, title, description }, index) => (
              <View
                key={title}
                style={[styles.featureRow, index < featureItems.length - 1 && styles.featureDivider]}
              >
                <View style={styles.featureIcon}>
                  <Icon color={palette.primary} size={20} strokeWidth={2.1} />
                </View>
                <View style={styles.featureText}>
                  <AppText variant="bodyStrong">{title}</AppText>
                  <AppText variant="caption" color={palette.muted} style={styles.featureDescription}>
                    {description}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>

          <Button
            label="Mulai setup"
            onPress={() => changeStep(1)}
            icon={<ArrowRight color={palette.white} size={18} strokeWidth={2.3} />}
            style={styles.primaryAction}
          />

          <Pressable
            accessibilityRole="button"
            onPress={handleQuickConnect}
            style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
          >
            <AppText variant="bodyStrong" color={palette.primary} align="center">
              Sudah pernah fork? Langsung hubungkan
            </AppText>
          </Pressable>

          <Notice
            tone="info"
            title="Butuh akun GitHub"
            message="Build memakai GitHub Actions milikmu. Tidak ada server perantara yang menyimpan token atau logo."
            style={styles.notice}
          />
        </Animated.View>
      ) : null}

      {step === 1 ? (
        <Animated.View key="guide" entering={FadeIn.duration(180)}>
          <AppText variant="label" color={palette.primary} style={styles.eyebrow}>
            PERSIAPAN
          </AppText>
          <AppText variant="h1" style={styles.title}>
            Dua hal sebelum build pertama.
          </AppText>
          <AppText variant="body" color={palette.muted} style={styles.subtitle}>
            Fork repo template Android, lalu buat Personal Access Token dengan scope yang tepat.
          </AppText>

          <View style={styles.linkStack}>
            <LinkCard
              icon={<GitFork color={palette.primary} size={21} strokeWidth={2.1} />}
              title="1. Fork repo template"
              description={
                templateSlug
                  ? `Buka halaman fork ${templateSlug}, lalu klik Create fork.`
                  : 'Isi repo template di bawah untuk membuka halaman fork.'
              }
              actionLabel={forkUrl ? 'Buka halaman fork' : 'Repo belum diisi'}
              disabled={!forkUrl}
              onPress={() => void openUrl(forkUrl)}
            />

            <LinkCard
              icon={<KeyRound color={palette.primary} size={21} strokeWidth={2.1} />}
              title="2. Buat token GitHub"
              description="Pilih scope repo dan workflow. Simpan token di tempat aman."
              actionLabel="Buat token"
              onPress={() => void openUrl(PAT_SCOPES_URL)}
            />
          </View>

          <TextField
            label="Repo template"
            placeholder="pemilik/webview-wrapper-template"
            value={templateRepo}
            onChangeText={(value) => {
              setTemplateRepo(value);
              setTemplateError(null);
            }}
            onBlur={() => {
              const normalized = normalizeRepoSlug(templateRepo);
              if (normalized) {
                setTemplateRepo(normalized);
              }
            }}
            error={templateError}
            hint="Format pemilik/nama-repo. URL GitHub juga bisa ditempel."
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<GitFork color={palette.faint} size={17} strokeWidth={2} />}
            containerStyle={styles.templateField}
          />

          <View style={styles.inlineLinks}>
            <Pressable
              accessibilityRole="link"
              disabled={!templateUrl}
              onPress={() => void openUrl(templateUrl)}
              style={({ pressed }) => [styles.inlineLink, pressed && styles.pressed]}
            >
              <AppText variant="labelSmall" color={palette.primary}>
                LIHAT REPO TEMPLATE
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => void openUrl(GITHUB_TOKEN_DOCS_URL)}
              style={({ pressed }) => [styles.inlineLink, pressed && styles.pressed]}
            >
              <AppText variant="labelSmall" color={palette.primary}>
                PANDUAN TOKEN
              </AppText>
            </Pressable>
          </View>

          <Notice
            tone="warning"
            title="Gunakan repo publik"
            message="Build di repo publik memakai kuota Actions gratis. Fork dari repo publik tetap publik."
            style={styles.notice}
          />

          <Button
            label="Lanjut ke koneksi"
            onPress={handleGuideNext}
            icon={<ArrowRight color={palette.white} size={18} strokeWidth={2.3} />}
            style={styles.primaryAction}
          />
          <Button
            label="Kembali"
            variant="ghost"
            onPress={() => changeStep(0)}
            icon={<ArrowLeft color={palette.text} size={18} strokeWidth={2.2} />}
            iconPosition="left"
          />
        </Animated.View>
      ) : null}

      {step === 2 ? (
        <Animated.View key="connect" entering={FadeIn.duration(180)}>
          <AppText variant="label" color={palette.primary} style={styles.eyebrow}>
            KONEKSI
          </AppText>
          <AppText variant="h1" style={styles.title}>
            Hubungkan akun GitHub.
          </AppText>
          <AppText variant="body" color={palette.muted} style={styles.subtitle}>
            Token diverifikasi langsung ke GitHub. Setelah tersimpan, token dienkripsi di
            SecureStore perangkat.
          </AppText>

          <Card style={styles.formCard}>
            <TextField
              label="Username GitHub"
              placeholder="octocat"
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                setConnectError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<User color={palette.faint} size={17} strokeWidth={2} />}
              hint="Akan disesuaikan otomatis dengan pemilik token."
              containerStyle={styles.fieldSpacing}
            />

            <TextField
              label="Nama repo hasil fork"
              placeholder={DEFAULT_FORK_REPO}
              value={repoName}
              onChangeText={(value) => {
                setRepoName(value);
                setConnectError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<GitFork color={palette.faint} size={17} strokeWidth={2} />}
              hint="Repo ini yang menjalankan workflow build."
              containerStyle={styles.fieldSpacing}
            />

            <TextField
              label="Personal Access Token"
              placeholder="ghp_..."
              value={token}
              onChangeText={(value) => {
                setToken(value);
                setConnectError(null);
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
              hint="Scope yang dibutuhkan: repo dan workflow."
            />

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <AppText variant="bodyStrong">Fork otomatis</AppText>
                <AppText variant="caption" color={palette.muted} style={styles.switchDescription}>
                  Jika repo belum ada, aplikasi membuat fork dari template.
                </AppText>
              </View>
              <Switch
                accessibilityLabel="Fork otomatis"
                value={autoFork}
                onValueChange={setAutoFork}
                disabled={busy}
                trackColor={{ false: palette.borderStrong, true: palette.primary }}
                thumbColor={palette.white}
                ios_backgroundColor={palette.borderStrong}
              />
            </View>
          </Card>

          {connectError ? (
            <Notice tone="error" title="Koneksi belum berhasil" message={connectError} />
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
            label={busy ? 'Menghubungkan...' : 'Verifikasi & simpan'}
            onPress={() => void handleConnect()}
            loading={busy}
            disabled={busy}
            icon={<ShieldCheck color={palette.white} size={18} strokeWidth={2.2} />}
            style={styles.primaryAction}
          />

          <Pressable
            accessibilityRole="link"
            onPress={() => void openUrl(PAT_SCOPES_URL)}
            style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
          >
            <AppText variant="bodyStrong" color={palette.primary} align="center">
              Buat token baru dengan scope repo + workflow
            </AppText>
          </Pressable>

          <Button
            label="Kembali"
            variant="ghost"
            onPress={() => changeStep(1)}
            disabled={busy}
            icon={<ArrowLeft color={palette.text} size={18} strokeWidth={2.2} />}
            iconPosition="left"
          />
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepPill: {
    borderRadius: radii.pill,
    backgroundColor: palette.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: palette.border,
  },
  progressSegmentActive: {
    backgroundColor: palette.primary,
  },
  hero: {
    borderRadius: radii.xxl,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  heroCircleLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -120,
    right: -90,
  },
  heroCircleSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -80,
    left: -40,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    letterSpacing: 1.1,
  },
  heroTitle: {
    marginTop: spacing.lg,
    fontSize: 40,
    lineHeight: 45,
  },
  heroDescription: {
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  heroMetaItem: {
    gap: 2,
  },
  heroMetaDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  featureCard: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
  },
  featureDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  featureText: {
    flex: 1,
    gap: 1,
  },
  featureDescription: {
    lineHeight: 18,
  },
  primaryAction: {
    marginTop: spacing.xl,
  },
  textButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.65,
  },
  notice: {
    marginTop: spacing.lg,
  },
  eyebrow: {
    textTransform: 'uppercase',
  },
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  linkStack: {
    gap: spacing.sm,
  },
  templateField: {
    marginTop: spacing.lg,
  },
  inlineLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: 2,
  },
  inlineLink: {
    paddingVertical: 4,
  },
  formCard: {
    marginTop: spacing.xs,
  },
  fieldSpacing: {
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    marginTop: spacing.xs,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchDescription: {
    lineHeight: 17,
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
});
