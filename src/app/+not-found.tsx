import { FileQuestion } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { BrandMark } from '@/components/BrandMark';
import { EmptyState } from '@/components/EmptyState';
import { palette } from '@/constants/theme';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen contentContainerStyle={{ paddingTop: 24 }}>
      <BrandMark />
      <EmptyState
        icon={<FileQuestion color={palette.primary} size={30} strokeWidth={2} />}
        title="Halaman tidak ditemukan"
        description="Tautan yang kamu buka tidak tersedia atau sudah dipindahkan."
        actionLabel="Kembali ke beranda"
        onAction={() => router.replace('/')}
        style={{ paddingTop: 72 }}
      />
    </Screen>
  );
}
