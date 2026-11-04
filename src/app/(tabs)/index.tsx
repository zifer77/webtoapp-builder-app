import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  ChevronRight,
  Globe2,
  Palette,
  Rocket,
  Settings2,
  Smartphone,
  User,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppPreviewCard } from '@/components/AppPreviewCard';
import { AppText } from '@/components/AppText';
import { BrandMark } from '@/components/BrandMark';
import { BuildStatusBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ColorSwatchPicker } from '@/components/ColorSwatchPicker';
import { EmptyState } from '@/components/EmptyState';
import { LogoPicker } from '@/components/LogoPicker';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { StepIndicator } from '@/components/StepIndicator';
import { TextField } from '@/components/TextField';
import {
  DEFAULT_THEME_COLOR,
  THEME_COLORS,
} from '@/constants/config';
import { palette, radii, spacing } from '@/constants/theme';
import { createId } from '@/lib/async';
import { getErrorMessage } from '@/lib/errors';
import { deleteFileIfExists, persistLogo } from '@/lib/files';
import { formatRelativeDate, getHostname } from '@/lib/format';
import { triggerBuild } from '@/lib/github';
import { logoToDispatchBase64, normalizeLogoAsset } from '@/lib/image';
import { normalizeWebsiteUrl, validateAppName, validateWebsiteUrl } from '@/lib/validation';
import { useToast } from '@/providers/ToastProvider';
import { useHistoryStore } from '@/store/historyStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTokenStore } from '@/store/tokenStore';
import type { HistoryRecord } from '@/types/build';

const STEPS = ['Website', 'Nama', 'Logo', 'Warna'] as const;

type FormErrors = {
  url?: string | null;
  appName?: string | null;
  logo?: string | null;
};

function suggestAppName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    const first = hostname.split('.')[0] ?? '';
    const words = first.replace(/[-_]+/g, ' ').trim();

    if (!words) {
      return '';
    }

    return words
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .slice(0, 30);
  } catch {
    return '';
  }
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.stepHeading}>
      <AppText variant="h2">{title}</AppText>
      <AppText variant="body" color={palette.muted} style={styles.stepDescription}>
        {description}
      </AppText>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const settings = useSettingsStore();
  const token = useTokenStore((state) => state.token);
  const records = useHistoryStore((state) => state.records);
  const addRecord = useHistoryStore((state) => state.addRecord);

  const [step, setStep] = useState(0);
  const [url, setUrl] = useState('');
  const [appName, setAppName] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState(
    settings.defaultThemeColor || DEFAULT_THEME_COLOR,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [logoProcessing, setLogoProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isConfigured = Boolean(settings.githubUsername && settings.repoName && token);
  const lastRecord = records[0] ?? null;
  const normalizedUrl = normalizeWebsiteUrl(url);

  const resetForm = useCallback(() => {
    setStep(0);
    setUrl('');
    setAppName('');
    setLogoUri(null);
    setThemeColor(useSettingsStore.getState().defaultThemeColor || DEFAULT_THEME_COLOR);
    setErrors({});
    setFormError(null);
  }, []);

  const handlePickLogo = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrors((current) => ({
        ...current,
        logo: 'Izin galeri diperlukan untuk memilih logo.',
      }));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      exif: false,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setLogoProcessing(true);
    setErrors((current) => ({ ...current, logo: null }));

    try {
      const normalized = await normalizeLogoAsset(result.assets[0]);
      if (logoUri) {
        deleteFileIfExists(logoUri);
      }
      setLogoUri(normalized);
    } catch (error) {
      setErrors((current) => ({ ...current, logo: getErrorMessage(error) }));
    } finally {
      setLogoProcessing(false);
    }
  }, [logoUri]);

  const handleRemoveLogo = useCallback(() => {
    if (logoUri) {
      deleteFileIfExists(logoUri);
    }
    setLogoUri(null);
    setErrors((current) => ({ ...current, logo: null }));
  }, [logoUri]);

  const validateStep = useCallback(
    (target: number): boolean => {
      if (target === 0) {
        const error = validateWebsiteUrl(url);
        setErrors((current) => ({ ...current, url: error }));

        if (!error) {
          const normalized = normalizeWebsiteUrl(url);
          if (normalized) {
            setUrl(normalized);
            if (!appName.trim()) {
              setAppName(suggestAppName(normalized));
            }
          }
        }

        return !error;
      }

      if (target === 1) {
        const error = validateAppName(appName);
        setErrors((current) => ({ ...current, appName: error }));
        return !error;
      }

      if (target === 2) {
        const error = logoUri ? null : 'Pilih logo aplikasi terlebih dahulu.';
        setErrors((current) => ({ ...current, logo: error }));
        return !error;
      }

      return true;
    },
    [appName, logoUri, url],
  );

  const handleNext = useCallback(() => {
    if (!validateStep(step)) {
      return;
    }

    Keyboard.dismiss();
    void Haptics.selectionAsync();
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }, [step, validateStep]);

  const handleStepPress = useCallback(
    (index: number) => {
      if (index < step) {
        Keyboard.dismiss();
        setStep(index);
      }
    },
    [step],
  );

  const handleSubmit = useCallback(async () => {
    const urlError = validateWebsiteUrl(url);
    const nameError = validateAppName(appName);
    const logoError = logoUri ? null : 'Pilih logo aplikasi terlebih dahulu.';

    setErrors({ url: urlError, appName: nameError, logo: logoError });

    if (urlError) {
      setStep(0);
      return;
    }
    if (nameError) {
      setStep(1);
      return;
    }
    if (logoError || !logoUri) {
      setStep(2);
      return;
    }

    const finalUrl = normalizeWebsiteUrl(url);
    if (!finalUrl) {
      setErrors((current) => ({ ...current, url: 'URL website tidak valid.' }));
      setStep(0);
      return;
    }

    const currentToken = useTokenStore.getState().token;
    const currentSettings = useSettingsStore.getState();

    if (!currentToken || !currentSettings.githubUsername || !currentSettings.repoName) {
      router.replace('/onboarding');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const buildId = createId('build');
    let persistedLogoUri: string | null = null;

    try {
      persistedLogoUri = await persistLogo(logoUri, buildId);
      const logoBase64 = await logoToDispatchBase64(persistedLogoUri);
      const dispatchedAt = Date.now();

      await triggerBuild({
        owner: currentSettings.githubUsername,
        repo: currentSettings.repoName,
        token: currentToken,
        url: finalUrl,
        appName: appName.trim(),
        logoBase64,
        themeColor,
      });

      const record: HistoryRecord = {
        id: buildId,
        url: finalUrl,
        appName: appName.trim(),
        themeColor,
        logoUri: persistedLogoUri,
        owner: currentSettings.githubUsername,
        repo: currentSettings.repoName,
        createdAt: dispatchedAt,
        dispatchedAt,
        status: 'queued',
        progress: 10,
        runId: null,
        runUrl: null,
        artifactId: null,
        apkUri: null,
        error: null,
      };

      addRecord(record);
      deleteFileIfExists(logoUri);
      resetForm();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/build/[id]', params: { id: buildId } });
    } catch (error) {
      if (persistedLogoUri) {
        deleteFileIfExists(persistedLogoUri);
      }
      setFormError(getErrorMessage(error));
      showToast('Build belum bisa dimulai.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    addRecord,
    appName,
    logoUri,
    resetForm,
    router,
    showToast,
    themeColor,
    url,
  ]);

  if (!isConfigured) {
    return (
      <Screen contentContainerStyle={styles.gateContent}>
        <BrandMark size={32} />
        <EmptyState
          icon={<Settings2 color={palette.primary} size={30} strokeWidth={2} />}
          title="Hubungkan GitHub dulu"
          description="Isi username, repo hasil fork, dan token GitHub untuk mulai membuat aplikasi."
          actionLabel="Buka onboarding"
          onAction={() => router.replace('/onboarding')}
          style={styles.gate}
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <BrandMark size={32} />
        <View style={styles.accountChip}>
          <User color={palette.primary} size={14} strokeWidth={2.2} />
          <AppText
            variant="labelSmall"
            color={palette.primaryDark}
            numberOfLines={1}
            style={styles.accountText}
          >
            @{settings.githubUsername}
          </AppText>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Smartphone color={palette.primary} size={13} strokeWidth={2.2} />
            <AppText variant="labelSmall" color={palette.primaryDark}>
              ANDROID APK
            </AppText>
          </View>
          <AppText variant="labelSmall" color={palette.faint}>
            BUILD STUDIO
          </AppText>
        </View>

        <AppText variant="display" color={palette.primaryDeep} style={styles.heroTitle}>
          Dari tautan, jadi aplikasi.
        </AppText>
        <AppText variant="body" color={palette.textSecondary} style={styles.heroDescription}>
          Masukkan website, atur nama dan logo, lalu biarkan GitHub Actions membangun APK-nya.
        </AppText>

        <View style={styles.heroFooter}>
          <View style={styles.heroDot} />
          <AppText variant="caption" color={palette.muted}>
            Tanpa server perantara. Build berjalan di repo milikmu.
          </AppText>
        </View>
      </View>

      {lastRecord ? (
        <View style={styles.recentBlock}>
          <View style={styles.sectionHeader}>
            <AppText variant="label" color={palette.muted}>
              BUILD TERAKHIR
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/history')}
              style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
            >
              <AppText variant="labelSmall" color={palette.primary}>
                LIHAT SEMUA
              </AppText>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Buka build ${lastRecord.appName}`}
            onPress={() =>
              router.push({ pathname: '/build/[id]', params: { id: lastRecord.id } })
            }
            style={({ pressed }) => [styles.recentCard, pressed && styles.recentPressed]}
          >
            <Image source={{ uri: lastRecord.logoUri }} style={styles.recentLogo} />
            <View style={styles.recentText}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {lastRecord.appName}
              </AppText>
              <AppText variant="caption" color={palette.muted} numberOfLines={1}>
                {getHostname(lastRecord.url)} · {formatRelativeDate(lastRecord.createdAt)}
              </AppText>
            </View>
            <BuildStatusBadge status={lastRecord.status} />
            <ChevronRight color={palette.faint} size={17} strokeWidth={2.2} />
          </Pressable>
        </View>
      ) : null}

      <Card style={styles.formCard}>
        <View style={styles.formTop}>
          <AppText variant="label" color={palette.primary}>
            LANGKAH {step + 1} DARI {STEPS.length}
          </AppText>
          <AppText variant="labelSmall" color={palette.faint}>
            {STEPS[step].toUpperCase()}
          </AppText>
        </View>

        <StepIndicator
          steps={[...STEPS]}
          current={step}
          onStepPress={step > 0 ? handleStepPress : undefined}
        />

        <Animated.View key={step} entering={FadeIn.duration(170)} style={styles.stepBody}>
          {step === 0 ? (
            <>
              <StepHeading
                title="Website mana yang mau dijadikan aplikasi?"
                description="Gunakan alamat https yang bisa dibuka publik. Halaman login tetap bisa dipakai di dalam aplikasi."
              />
              <TextField
                label="URL Website"
                placeholder="https://example.com"
                value={url}
                onChangeText={(value) => {
                  setUrl(value);
                  setErrors((current) => ({ ...current, url: null }));
                }}
                error={errors.url}
                hint="Hanya https. Contoh: https://example.com"
                keyboardType="url"
                textContentType="URL"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={handleNext}
                leftIcon={<Globe2 color={palette.faint} size={18} strokeWidth={2} />}
                containerStyle={styles.field}
              />
              <Notice
                tone="info"
                title="Satu aplikasi, satu website"
                message="Semua navigasi di dalam website akan berjalan di dalam aplikasi Android."
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <StepHeading
                title="Beri nama aplikasinya."
                description="Nama ini tampil di home screen Android, pengaturan, dan judul aplikasi."
              />
              <TextField
                label="Nama Aplikasi"
                placeholder="Contoh: Toko Online"
                value={appName}
                onChangeText={(value) => {
                  setAppName(value);
                  setErrors((current) => ({ ...current, appName: null }));
                }}
                error={errors.appName}
                counter={`${appName.trim().length}/30`}
                hint="Minimal 2 karakter, maksimal 30 karakter."
                maxLength={30}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={handleNext}
                leftIcon={<Smartphone color={palette.faint} size={18} strokeWidth={2} />}
                containerStyle={styles.field}
              />
              <Notice
                tone="info"
                title="Bisa diubah kapan saja"
                message="Nama aplikasi akan disematkan saat build. Build berikutnya bisa memakai nama berbeda."
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepHeading
                title="Pasang logo yang mudah dikenali."
                description="Logo otomatis dipotong persegi dan dioptimalkan untuk ikon Android."
              />
              <LogoPicker
                logoUri={logoUri}
                onPick={() => void handlePickLogo()}
                onRemove={handleRemoveLogo}
                isProcessing={logoProcessing}
                error={errors.logo}
              />
              <Notice
                tone="info"
                title="Format logo"
                message="PNG atau JPG, maksimal 2 MB. Gunakan gambar dengan area tengah yang jelas agar tetap terbaca di ikon kecil."
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepHeading
                title="Pilih warna aksen aplikasi."
                description="Warna ini dipakai untuk status bar, aksen ikon, dan tampilan pendukung di APK."
              />
              <ColorSwatchPicker
                colors={THEME_COLORS}
                selected={themeColor}
                onSelect={setThemeColor}
              />
              <View style={styles.colorInfo}>
                <View style={[styles.colorDot, { backgroundColor: themeColor }]} />
                <AppText variant="bodyStrong">{themeColor.toUpperCase()}</AppText>
                <AppText variant="caption" color={palette.muted}>
                  Warna utama
                </AppText>
              </View>

              {logoUri ? (
                <AppPreviewCard
                  appName={appName.trim()}
                  url={normalizedUrl ?? url}
                  logoUri={logoUri}
                  themeColor={themeColor}
                  style={styles.preview}
                />
              ) : null}

              <Notice
                tone="info"
                title="Build butuh 5-15 menit"
                message="Kamu bisa meninggalkan layar ini. Progres build tersimpan dan bisa dibuka lagi dari tab Riwayat."
              />
            </>
          ) : null}
        </Animated.View>

        {formError ? (
          <Notice
            tone="error"
            title="Build belum dimulai"
            message={formError}
            style={styles.formError}
          />
        ) : null}

        <View style={styles.navRow}>
          {step > 0 ? (
            <View style={styles.navItem}>
              <Button
                label="Kembali"
                variant="ghost"
                onPress={() => {
                  Keyboard.dismiss();
                  setStep((current) => Math.max(0, current - 1));
                }}
                disabled={submitting}
              />
            </View>
          ) : null}
          <View style={styles.navItem}>
            {step < STEPS.length - 1 ? (
              <Button
                label="Lanjut"
                onPress={handleNext}
                icon={<ArrowRight color={palette.white} size={18} strokeWidth={2.3} />}
              />
            ) : (
              <Button
                label="Buat Aplikasi"
                onPress={() => void handleSubmit()}
                loading={submitting}
                disabled={submitting}
                icon={<Rocket color={palette.white} size={18} strokeWidth={2.2} />}
              />
            )}
          </View>
        </View>
      </Card>

      <View style={styles.tipRow}>
        <Palette color={palette.faint} size={14} strokeWidth={2} />
        <AppText variant="caption" color={palette.faint} style={styles.tipText}>
          Semua data build tersimpan lokal. Token GitHub tidak pernah dikirim ke server lain.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: 122,
  },
  gateContent: {
    paddingTop: spacing.sm,
  },
  gate: {
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 190,
  },
  accountText: {
    flexShrink: 1,
  },
  hero: {
    marginTop: spacing.lg,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: palette.primaryMuted,
    backgroundColor: palette.primarySoft,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  heroTitle: {
    marginTop: spacing.md,
    fontSize: 36,
    lineHeight: 41,
  },
  heroDescription: {
    marginTop: spacing.xs,
    maxWidth: 330,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.primaryMuted,
  },
  heroDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.primary,
  },
  recentBlock: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionAction: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  pressed: {
    opacity: 0.65,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.sm + 2,
  },
  recentPressed: {
    opacity: 0.78,
    borderColor: palette.primaryMuted,
  },
  recentLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: palette.primarySoft,
  },
  recentText: {
    flex: 1,
    gap: 1,
  },
  formCard: {
    marginTop: spacing.lg,
  },
  formTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  stepBody: {
    marginTop: spacing.xl,
  },
  stepHeading: {
    marginBottom: spacing.lg,
    gap: 5,
  },
  stepDescription: {
    maxWidth: 340,
  },
  field: {
    marginBottom: spacing.md,
  },
  colorInfo: {
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
  preview: {
    marginTop: spacing.lg,
  },
  formError: {
    marginTop: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  navItem: {
    flex: 1,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  tipText: {
    flex: 1,
    lineHeight: 17,
  },
});
