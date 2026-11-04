export type BuildStatus = 'queued' | 'in_progress' | 'success' | 'failed';

export type HistoryRecord = {
  id: string;
  url: string;
  appName: string;
  themeColor: string;
  logoUri: string;
  owner: string;
  repo: string;
  createdAt: number;
  dispatchedAt: number;
  status: BuildStatus;
  progress: number;
  runId: number | null;
  runUrl: string | null;
  artifactId: number | null;
  apkUri: string | null;
  error: string | null;
};

export type SettingsValues = {
  githubUsername: string;
  repoName: string;
  templateRepo: string;
  defaultThemeColor: string;
};
