const REPO_SLUG_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REPO_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function normalizeWebsiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^[A-Za-z][A-Za-z\d+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || parsed.username || parsed.password) {
      return null;
    }
    if (parsed.hostname !== 'localhost' && !parsed.hostname.includes('.')) {
      return null;
    }
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      return `https://${parsed.host}`;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function validateWebsiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'URL website wajib diisi.';
  }
  if (!normalizeWebsiteUrl(trimmed)) {
    return 'Gunakan URL https yang valid, contoh: https://example.com';
  }
  return null;
}

export function validateAppName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return 'Nama aplikasi minimal 2 karakter.';
  }
  if (trimmed.length > 30) {
    return 'Nama aplikasi maksimal 30 karakter.';
  }
  return null;
}

export function validateRepoName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Nama repo wajib diisi.';
  }
  if (!REPO_NAME_PATTERN.test(trimmed)) {
    return 'Nama repo hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.';
  }
  return null;
}

export function validateUsername(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Username GitHub wajib diisi.';
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return 'Format username GitHub tidak valid.';
  }
  return null;
}

export function isValidRepoSlug(value: string): boolean {
  return REPO_SLUG_PATTERN.test(value.trim());
}

export function normalizeRepoSlug(value: string): string | null {
  let trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  trimmed = trimmed
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  return isValidRepoSlug(trimmed) ? trimmed : null;
}

export function parseRepoSlug(value: string): { owner: string; repo: string } | null {
  const normalized = normalizeRepoSlug(value);
  if (!normalized) {
    return null;
  }
  const [owner, repo] = normalized.split('/');
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
}

export function validateRepoSlug(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Repo template wajib diisi.';
  }
  if (!normalizeRepoSlug(trimmed)) {
    return 'Gunakan format pemilik/nama-repo, contoh: octocat/webview-wrapper-template';
  }
  return null;
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function isAllowedLogoMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) {
    return false;
  }
  return ['image/png', 'image/jpeg', 'image/jpg'].includes(mimeType.toLowerCase());
}
