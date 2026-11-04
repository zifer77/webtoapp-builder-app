import { File } from 'expo-file-system';
import {
  BUILD_POLL_INTERVAL_MS,
  BUILD_PROGRESS,
  DEFAULT_BRANCH,
  MAX_DISPATCH_BASE64_LENGTH,
  REQUEST_TIMEOUT_MS,
  WORKFLOW_FILE,
} from '@/constants/config';
import type {
  BuildArtifact,
  BuildProgressSnapshot,
  GitHubRepo,
  GitHubUser,
  TriggerBuildInput,
  WorkflowRun,
  WorkflowRunStatus,
} from '@/types/github';
import { delay, throwIfAborted } from './async';
import { AppError } from './errors';

const API_BASE = 'https://api.github.com';
const ACCEPT_HEADER = 'application/vnd.github+json';
const API_VERSION = '2022-11-28';

type GitHubRequestOptions = {
  method?: 'GET' | 'POST';
  token: string;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

type GitHubApiErrorPayload = {
  message?: string;
  errors?: { message?: string }[];
};

type GitHubUserPayload = {
  login: string;
  name: string | null;
  avatar_url: string;
};

type GitHubRepoPayload = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  fork: boolean;
  owner: { login: string };
};

type GitHubWorkflowRunPayload = {
  id: number;
  name: string;
  display_title: string;
  status: WorkflowRunStatus;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  event: string;
  head_branch: string;
};

type GitHubWorkflowRunsPayload = {
  total_count: number;
  workflow_runs: GitHubWorkflowRunPayload[];
};

type GitHubArtifactPayload = {
  id: number;
  name: string;
  size_in_bytes: number;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
  expires_at: string | null;
};

type GitHubArtifactsPayload = {
  total_count: number;
  artifacts: GitHubArtifactPayload[];
};

function isGitHubApiErrorPayload(value: unknown): value is GitHubApiErrorPayload {
  return typeof value === 'object' && value !== null;
}

function getApiErrorMessage(payload: unknown): string | null {
  if (!isGitHubApiErrorPayload(payload)) {
    return null;
  }
  if (payload.errors?.length) {
    const first = payload.errors.find((item) => Boolean(item.message));
    if (first?.message) {
      return first.message;
    }
  }
  return payload.message?.trim() || null;
}

function mapStatusError(status: number, payload: unknown, headers: Headers): AppError {
  const apiMessage = getApiErrorMessage(payload);
  const rateLimitRemaining = headers.get('x-ratelimit-remaining');
  const rateLimitReset = Number(headers.get('x-ratelimit-reset') ?? '0');

  if (status === 401) {
    return new AppError(
      'unauthorized',
      'Token GitHub tidak valid atau sudah kedaluwarsa. Buat token baru dengan scope repo dan workflow.',
      status,
    );
  }

  if (status === 403) {
    if (rateLimitRemaining === '0' || apiMessage?.toLowerCase().includes('rate limit')) {
      const resetLabel =
        rateLimitReset > 0
          ? new Intl.DateTimeFormat('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(rateLimitReset * 1000))
          : null;
      return new AppError(
        'rate_limit',
        resetLabel
          ? `Batas permintaan GitHub tercapai. Coba lagi setelah pukul ${resetLabel}.`
          : 'Batas permintaan GitHub tercapai. Coba lagi beberapa saat lagi.',
        status,
      );
    }
    return new AppError(
      'forbidden',
      'Akses ditolak GitHub. Pastikan token memiliki scope repo dan workflow serta punya akses ke repo tersebut.',
      status,
    );
  }

  if (status === 404) {
    return new AppError(
      'not_found',
      'Repo, workflow, atau artifact tidak ditemukan. Pastikan repo hasil fork berisi .github/workflows/build.yml.',
      status,
    );
  }

  if (status === 422) {
    return new AppError(
      'validation',
      apiMessage || 'Data build ditolak GitHub. Periksa kembali URL, nama aplikasi, dan logo.',
      status,
    );
  }

  if (status >= 500) {
    return new AppError(
      'server',
      'GitHub sedang mengalami gangguan. Coba lagi beberapa saat lagi.',
      status,
    );
  }

  return new AppError(
    'unknown',
    apiMessage || `Permintaan ke GitHub gagal (HTTP ${status}).`,
    status,
  );
}

async function githubRequest<T>(path: string, options: GitHubRequestOptions): Promise<T> {
  throwIfAborted(options.signal);

  const controller = new AbortController();
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  const handleExternalAbort = () => {
    controller.abort();
  };

  options.signal?.addEventListener('abort', handleExternalAbort, { once: true });

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: ACCEPT_HEADER,
        Authorization: `Bearer ${options.token}`,
        'X-GitHub-Api-Version': API_VERSION,
        'Content-Type': 'application/json',
        'User-Agent': 'WebToApp-Builder',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw mapStatusError(response.status, payload, response.headers);
    }

    if (response.status === 204 || !text) {
      return null as T;
    }

    return payload as T;
  } catch (error) {
    if (options.signal?.aborted) {
      throw new AppError('aborted', 'Proses dibatalkan.');
    }
    if (timedOut) {
      throw new AppError(
        'timeout',
        'Koneksi ke GitHub melewati batas waktu. Periksa jaringan lalu coba lagi.',
      );
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'network',
      'Tidak dapat terhubung ke GitHub. Periksa koneksi internet lalu coba lagi.',
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', handleExternalAbort);
  }
}

function mapUser(payload: GitHubUserPayload): GitHubUser {
  return {
    login: payload.login,
    name: payload.name,
    avatarUrl: payload.avatar_url,
  };
}

function mapRepo(payload: GitHubRepoPayload): GitHubRepo {
  return {
    id: payload.id,
    name: payload.name,
    fullName: payload.full_name,
    htmlUrl: payload.html_url,
    defaultBranch: payload.default_branch,
    private: payload.private,
    fork: payload.fork,
    ownerLogin: payload.owner.login,
  };
}

function mapRun(payload: GitHubWorkflowRunPayload): WorkflowRun {
  return {
    id: payload.id,
    name: payload.name,
    displayTitle: payload.display_title,
    status: payload.status,
    conclusion: payload.conclusion,
    htmlUrl: payload.html_url,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
    event: payload.event,
    headBranch: payload.head_branch,
  };
}

function mapArtifact(payload: GitHubArtifactPayload): BuildArtifact {
  return {
    id: payload.id,
    name: payload.name,
    sizeInBytes: payload.size_in_bytes,
    archiveDownloadUrl: payload.archive_download_url,
    expired: payload.expired,
    createdAt: payload.created_at,
    expiresAt: payload.expires_at,
  };
}

function progressForStatus(status: WorkflowRunStatus): number {
  switch (status) {
    case 'queued':
    case 'requested':
    case 'waiting':
    case 'pending':
      return BUILD_PROGRESS.queued;
    case 'in_progress':
      return BUILD_PROGRESS.in_progress;
    case 'completed':
      return BUILD_PROGRESS.completed;
    default:
      return 0;
  }
}

export async function verifyToken(token: string, signal?: AbortSignal): Promise<GitHubUser> {
  const payload = await githubRequest<GitHubUserPayload>('/user', { token, signal });
  return mapUser(payload);
}

export async function checkRepoExists(
  owner: string,
  repo: string,
  token: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    await githubRequest<GitHubRepoPayload>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { token, signal },
    );
    return true;
  } catch (error) {
    if (error instanceof AppError && error.code === 'not_found') {
      return false;
    }
    throw error;
  }
}

export async function getRepo(
  owner: string,
  repo: string,
  token: string,
  signal?: AbortSignal,
): Promise<GitHubRepo> {
  const payload = await githubRequest<GitHubRepoPayload>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { token, signal },
  );
  return mapRepo(payload);
}

export async function forkTemplate(
  templateOwner: string,
  templateRepo: string,
  token: string,
  signal?: AbortSignal,
): Promise<GitHubRepo> {
  const payload = await githubRequest<GitHubRepoPayload>(
    `/repos/${encodeURIComponent(templateOwner)}/${encodeURIComponent(templateRepo)}/forks`,
    {
      method: 'POST',
      token,
      body: { default_branch_only: true },
      signal,
    },
  );
  return mapRepo(payload);
}

export async function triggerBuild(input: TriggerBuildInput, signal?: AbortSignal): Promise<void> {
  if (input.logoBase64.length > MAX_DISPATCH_BASE64_LENGTH) {
    throw new AppError(
      'validation',
      'Logo terlalu besar untuk dikirim ke GitHub. Pilih gambar yang lebih sederhana.',
    );
  }

  await githubRequest<null>(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      token: input.token,
      body: {
        ref: input.ref ?? DEFAULT_BRANCH,
        inputs: {
          url: input.url,
          appName: input.appName,
          logoBase64: input.logoBase64,
          themeColor: input.themeColor,
        },
      },
      signal,
    },
  );
}

export async function getLatestRun(
  owner: string,
  repo: string,
  token: string,
  signal?: AbortSignal,
): Promise<WorkflowRun | null> {
  const payload = await githubRequest<GitHubWorkflowRunsPayload>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${WORKFLOW_FILE}/runs?event=workflow_dispatch&per_page=1`,
    { token, signal },
  );
  const latest = payload.workflow_runs[0];
  return latest ? mapRun(latest) : null;
}

export async function getRunStatus(
  owner: string,
  repo: string,
  runId: number,
  token: string,
  signal?: AbortSignal,
): Promise<WorkflowRun> {
  const payload = await githubRequest<GitHubWorkflowRunPayload>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}`,
    { token, signal },
  );
  return mapRun(payload);
}

export async function getArtifact(
  owner: string,
  repo: string,
  runId: number,
  token: string,
  signal?: AbortSignal,
): Promise<BuildArtifact | null> {
  const payload = await githubRequest<GitHubArtifactsPayload>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}/artifacts`,
    { token, signal },
  );

  const available = payload.artifacts.filter((artifact) => !artifact.expired);
  const preferred =
    available.find((artifact) => artifact.name === 'app-release') ??
    available.find((artifact) => artifact.name.toLowerCase().includes('apk')) ??
    available[0];

  return preferred ? mapArtifact(preferred) : null;
}

export async function downloadArtifact(
  archiveDownloadUrl: string,
  token: string,
  destination: File,
  signal?: AbortSignal,
): Promise<File> {
  throwIfAborted(signal);

  let parsed: URL;
  try {
    parsed = new URL(archiveDownloadUrl);
  } catch {
    throw new AppError('artifact', 'URL artifact APK dari GitHub tidak valid.');
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'api.github.com') {
    throw new AppError('artifact', 'URL artifact APK dari GitHub tidak aman.');
  }

  try {
    return await File.downloadFileAsync(archiveDownloadUrl, destination, {
      headers: {
        Accept: ACCEPT_HEADER,
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': API_VERSION,
        'User-Agent': 'WebToApp-Builder',
      },
      idempotent: true,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new AppError('aborted', 'Proses dibatalkan.');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'artifact',
      'Gagal mengunduh artifact APK dari GitHub. Artifact mungkin sudah kedaluwarsa.',
    );
  }
}

export async function pollBuildStatus(params: {
  owner: string;
  repo: string;
  token: string;
  runId: number;
  signal?: AbortSignal;
  intervalMs?: number;
  onUpdate?: (snapshot: BuildProgressSnapshot) => void;
}): Promise<WorkflowRun> {
  const interval = params.intervalMs ?? BUILD_POLL_INTERVAL_MS;

  while (true) {
    throwIfAborted(params.signal);
    const run = await getRunStatus(params.owner, params.repo, params.runId, params.token, params.signal);
    params.onUpdate?.({
      status: run.status,
      conclusion: run.conclusion,
      progress: progressForStatus(run.status),
      run,
    });

    if (run.status === 'completed') {
      return run;
    }

    await delay(interval, params.signal);
  }
}
