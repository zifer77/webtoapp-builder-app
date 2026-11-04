import { Directory, File } from 'expo-file-system';
import { unzipSync } from 'fflate';
import { sanitizeFileName } from './format';
import { APK_DIRECTORY, deleteFileIfExists, ensureDirectory } from './files';
import { AppError } from './errors';

const APK_MIME_TYPE = 'application/vnd.android.package-archive';

export async function extractApkFromZip(zipFile: File, buildId: string): Promise<string> {
  if (!zipFile.exists) {
    throw new AppError('artifact', 'File artifact APK tidak ditemukan.');
  }

  let archive: Record<string, Uint8Array>;

  try {
    const bytes = await zipFile.bytes();
    archive = unzipSync(bytes, {
      filter: (file) => file.name.toLowerCase().endsWith('.apk') && file.size > 0,
    });
  } catch {
    throw new AppError('artifact', 'Artifact APK rusak atau tidak dapat dibaca.');
  }

  const apkEntry = Object.keys(archive).find((name) => name.toLowerCase().endsWith('.apk'));
  const apkBytes = apkEntry ? archive[apkEntry] : null;

  if (!apkBytes || apkBytes.length < 1024) {
    throw new AppError('artifact', 'APK tidak ditemukan di dalam artifact GitHub.');
  }

  ensureDirectory(APK_DIRECTORY);
  const target = new File(APK_DIRECTORY, `${buildId}.apk`);

  try {
    if (target.exists) {
      target.delete();
    }
    target.create({ intermediates: true, overwrite: true });
    await target.write(apkBytes);
    return target.uri;
  } catch {
    throw new AppError('storage', 'APK berhasil diunduh tetapi gagal disimpan di perangkat.');
  }
}

export async function saveApkToDevice(
  apkUri: string,
  appName: string,
): Promise<string | null> {
  const source = new File(apkUri);

  if (!source.exists) {
    throw new AppError('storage', 'File APK tidak ditemukan. Unduh ulang APK.');
  }

  let directory: Directory;

  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('cancel')) {
      return null;
    }
    throw new AppError('storage', 'Folder penyimpanan tidak dapat dibuka.');
  }

  const fileName = `${sanitizeFileName(appName)}-${Date.now()}.apk`;

  try {
    const target = directory.createFile(fileName, APK_MIME_TYPE);
    await source.copy(target, { overwrite: true });
    return fileName;
  } catch {
    throw new AppError('storage', 'APK gagal disimpan ke folder yang dipilih.');
  }
}

export function deleteApkFile(uri: string | null | undefined): void {
  deleteFileIfExists(uri);
}
