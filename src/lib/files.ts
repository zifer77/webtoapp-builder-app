import { Directory, File, Paths } from 'expo-file-system';
import type { HistoryRecord } from '@/types/build';
import { AppError } from './errors';

export const LOGO_DIRECTORY = new Directory(Paths.document, 'webtoapp', 'logos');
export const APK_DIRECTORY = new Directory(Paths.document, 'webtoapp', 'apks');
export const TEMP_DIRECTORY = new Directory(Paths.cache, 'webtoapp');

export function ensureDirectory(directory: Directory): void {
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
}

export function deleteFileIfExists(uri: string | null | undefined): void {
  if (!uri) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Pembersihan file bersifat best-effort dan tidak boleh mengganggu alur utama.
  }
}

export async function persistLogo(sourceUri: string, buildId: string): Promise<string> {
  ensureDirectory(LOGO_DIRECTORY);
  const source = new File(sourceUri);

  if (!source.exists) {
    throw new AppError('storage', 'File logo tidak ditemukan. Pilih logo kembali.');
  }

  const target = new File(LOGO_DIRECTORY, `${buildId}.png`);
  if (target.exists) {
    target.delete();
  }

  try {
    await source.copy(target);
    return target.uri;
  } catch {
    throw new AppError('storage', 'Logo gagal disimpan di perangkat.');
  }
}

export function deleteRecordFiles(record: HistoryRecord): void {
  deleteFileIfExists(record.logoUri);
  deleteFileIfExists(record.apkUri);
}

export function createTemporaryFile(fileName: string): File {
  ensureDirectory(TEMP_DIRECTORY);
  return new File(TEMP_DIRECTORY, fileName);
}

export function localFileExists(uri: string | null | undefined): boolean {
  if (!uri) {
    return false;
  }
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
