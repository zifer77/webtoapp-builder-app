import Constants from 'expo-constants';

const configuredTemplateRepo = Constants.expoConfig?.extra?.templateRepo;

export const APP_NAME = 'WebToApp';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const DEFAULT_TEMPLATE_REPO =
  typeof configuredTemplateRepo === 'string' ? configuredTemplateRepo.trim() : '';

export const DEFAULT_FORK_REPO = 'webview-wrapper-template';
export const DEFAULT_THEME_COLOR = '#2563EB';
export const WORKFLOW_FILE = 'build.yml';
export const DEFAULT_BRANCH = 'main';

export const MAX_HISTORY = 50;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const LOGO_SIZE = 512;
export const MAX_DISPATCH_BASE64_LENGTH = 52_000;
export const BUILD_POLL_INTERVAL_MS = 5_000;
export const DISPATCH_RUN_TIMEOUT_MS = 3 * 60 * 1000;
export const RUN_MATCH_WINDOW_MS = 30_000;
export const REQUEST_TIMEOUT_MS = 20_000;

export const BUILD_PROGRESS = {
  queued: 10,
  in_progress: 50,
  completed: 100,
} as const;

export const THEME_COLORS = [
  '#2563EB',
  '#0EA5E9',
  '#0D9488',
  '#059669',
  '#D97706',
  '#DC2626',
  '#0F172A',
] as const;

export const PAT_SCOPES_URL =
  'https://github.com/settings/tokens/new?scopes=repo,workflow&description=WebToApp%20Builder';

export const GITHUB_TOKEN_DOCS_URL =
  'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens';
