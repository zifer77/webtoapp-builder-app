import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import {
  LOGO_SIZE,
  MAX_DISPATCH_BASE64_LENGTH,
  MAX_LOGO_BYTES,
} from '@/constants/config';
import { AppError } from './errors';
import { isAllowedLogoMimeType } from './validation';

function inferMimeType(asset: ImagePickerAsset): string | null {
  if (asset.mimeType) {
    return asset.mimeType;
  }

  const source = asset.fileName ?? asset.uri;
  const extension = source.split('?')[0]?.split('.').pop()?.toLowerCase();

  if (extension === 'png') {
    return 'image/png';
  }
  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg';
  }
  return null;
}

function getAssetSize(asset: ImagePickerAsset): number {
  if (typeof asset.fileSize === 'number' && asset.fileSize > 0) {
    return asset.fileSize;
  }

  try {
    const file = new File(asset.uri);
    return file.size;
  } catch {
    return 0;
  }
}

export async function normalizeLogoAsset(asset: ImagePickerAsset): Promise<string> {
  const mimeType = inferMimeType(asset);

  if (!isAllowedLogoMimeType(mimeType)) {
    throw new AppError('validation', 'Logo harus berupa file PNG atau JPG.');
  }

  const size = getAssetSize(asset);
  if (size > MAX_LOGO_BYTES) {
    throw new AppError('validation', 'Ukuran logo maksimal 2 MB. Pilih gambar yang lebih kecil.');
  }

  try {
    const loadContext = ImageManipulator.manipulate(asset.uri, {
      maxWidth: 2048,
      maxHeight: 2048,
    });
    const loadedImage = await loadContext.renderAsync();
    const side = Math.min(loadedImage.width, loadedImage.height);

    if (side <= 0) {
      throw new AppError('validation', 'Gambar logo tidak dapat dibaca.');
    }

    const originX = Math.max(0, Math.round((loadedImage.width - side) / 2));
    const originY = Math.max(0, Math.round((loadedImage.height - side) / 2));

    const cropContext = ImageManipulator.manipulate(loadedImage);
    cropContext.crop({ originX, originY, width: side, height: side });
    cropContext.resize({ width: LOGO_SIZE, height: LOGO_SIZE });

    const croppedImage = await cropContext.renderAsync();
    const result = await croppedImage.saveAsync({
      format: SaveFormat.PNG,
      compress: 1,
      base64: false,
    });

    return result.uri;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('validation', 'Logo gagal diproses. Coba pilih gambar lain.');
  }
}

export async function logoToDispatchBase64(logoUri: string): Promise<string> {
  const sizes = [512, 384, 320, 256, 192, 128];

  for (const size of sizes) {
    try {
      const context = ImageManipulator.manipulate(logoUri, {
        maxWidth: size,
        maxHeight: size,
      });
      context.resize({ width: size, height: size });
      const image = await context.renderAsync();
      const result = await image.saveAsync({
        format: SaveFormat.PNG,
        compress: 1,
        base64: true,
      });

      if (result.base64 && result.base64.length <= MAX_DISPATCH_BASE64_LENGTH) {
        return result.base64;
      }
    } catch {
      throw new AppError('validation', 'Logo gagal disiapkan untuk build. Coba pilih gambar lain.');
    }
  }

  throw new AppError(
    'validation',
    'Logo terlalu detail untuk dikirim ke GitHub. Gunakan logo yang lebih sederhana.',
  );
}
