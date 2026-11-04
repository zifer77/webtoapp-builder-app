import { LinearGradient } from 'expo-linear-gradient';
import { Globe2, Smartphone } from 'lucide-react-native';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, radii, spacing } from '@/constants/theme';
import { getHostname } from '@/lib/format';
import { Card } from './Card';
import { AppText } from './AppText';

type AppPreviewCardProps = {
  appName: string;
  url: string;
  logoUri: string;
  themeColor: string;
  style?: StyleProp<ViewStyle>;
};

function getTint(themeColor: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(themeColor) ? `${themeColor}1F` : palette.primarySoft;
}

export function AppPreviewCard({
  appName,
  url,
  logoUri,
  themeColor,
  style,
}: AppPreviewCardProps) {
  return (
    <Card padded={false} style={[styles.card, style]}>
      <LinearGradient
        colors={[getTint(themeColor), palette.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Image source={{ uri: logoUri }} style={styles.logo} />
        <View style={styles.identity}>
          <AppText variant="h3" numberOfLines={1}>
            {appName}
          </AppText>
          <View style={styles.urlRow}>
            <Globe2 color={palette.muted} size={12} strokeWidth={2} />
            <AppText variant="caption" color={palette.muted} numberOfLines={1} style={styles.url}>
              {getHostname(url)}
            </AppText>
          </View>
        </View>
        <View style={styles.chip}>
          <View style={[styles.chipDot, { backgroundColor: themeColor }]} />
          <AppText variant="labelSmall" color={palette.textSecondary}>
            APK
          </AppText>
        </View>
      </LinearGradient>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Smartphone color={palette.faint} size={14} strokeWidth={2} />
          <AppText variant="labelSmall" color={palette.faint}>
            ANDROID RELEASE
          </AppText>
        </View>
        <AppText variant="labelSmall" color={palette.faint}>
          WEBTOAPP
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: palette.surface,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  url: {
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
