import {
  BUILD_POLL_INTERVAL_MS,
  DISPATCH_RUN_TIMEOUT_MS,
  RUN_MATCH_WINDOW_MS,
} from '@/constants/config';
import type { WorkflowRun } from '@/types/github';
import { delay, throwIfAborted } from './async';
import { extractApkFromZip } from './apk';
import { AppError } from './errors';
import { createTemporaryFile, deleteFileIfExists, ensureDirectory, TEMP_DIRECTORY } from './files';
import { downloadArtifact, getArtifact, getLatestRun } from './github';

export async function waitForRunAfterDispatch(params: {
  owner: string;
  repo: string;
  token: string;
  dispatchedAt: number;
  excludeRunId?: number | null;
  signal?: AbortSignal;
}): Promise<WorkflowRun> {
  const deadline = Date.now() + DISPATCH_RUN_TIMEOUT_MS;
  const earliestAccepted = params.dispatchedAt - RUN_MATCH_WINDOW_MS;

  while (Date.now() < deadline) {
    throwIfAborted(params.signal);
    const latest = await getLatestRun(params.owner, params.repo, params.token, params.signal);

    if (latest && latest.id !== params.excludeRunId) {
      const createdAt = new Date(latest.createdAt).getTime();
      if (Number.isFinite(createdAt) && createdAt >= earliestAccepted) {
        return latest;
      }
    }

    await delay(BUILD_POLL_INTERVAL_MS, params.signal);
  }

  throw new AppError(
    'timeout',
    'Build belum muncul di GitHub Actions. Buka tab Actions untuk memeriksa repo, lalu coba lagi.',
  );
}

export async function downloadApkForRun(params: {
  owner: string;
  repo: string;
  token: string;
  runId: number;
  buildId: string;
  signal?: AbortSignal;
}): Promise<{ apkUri: string; artifactId: number }> {
  throwIfAborted(params.signal);

  let artifact = await getArtifact(
    params.owner,
    params.repo,
    params.runId,
    params.token,
    params.signal,
  );

  for (let attempt = 0; !artifact && attempt < 3; attempt += 1) {
    await delay(3000, params.signal);
    artifact = await getArtifact(
      params.owner,
      params.repo,
      params.runId,
      params.token,
      params.signal,
    );
  }

  if (!artifact) {
    throw new AppError(
      'artifact',
      'Artifact APK tidak ditemukan. Workflow mungkin belum mengunggah APK atau artifact sudah kedaluwarsa.',
    );
  }

  ensureDirectory(TEMP_DIRECTORY);
  const zipFile = createTemporaryFile(`artifact-${params.runId}.zip`);

  try {
    await downloadArtifact(artifact.archiveDownloadUrl, params.token, zipFile, params.signal);
    const apkUri = await extractApkFromZip(zipFile, params.buildId);
    return { apkUri, artifactId: artifact.id };
  } finally {
    deleteFileIfExists(zipFile.uri);
  }
}
