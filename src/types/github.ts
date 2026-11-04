export type GitHubUser = {
  login: string;
  name: string | null;
  avatarUrl: string;
};

export type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  private: boolean;
  fork: boolean;
  ownerLogin: string;
};

export type WorkflowRunStatus =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'requested'
  | 'waiting'
  | 'pending';

export type WorkflowRun = {
  id: number;
  name: string;
  displayTitle: string;
  status: WorkflowRunStatus;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  event: string;
  headBranch: string;
};

export type BuildArtifact = {
  id: number;
  name: string;
  sizeInBytes: number;
  archiveDownloadUrl: string;
  expired: boolean;
  createdAt: string;
  expiresAt: string | null;
};

export type TriggerBuildInput = {
  owner: string;
  repo: string;
  token: string;
  url: string;
  appName: string;
  logoBase64: string;
  themeColor: string;
  ref?: string;
};

export type BuildProgressSnapshot = {
  status: WorkflowRunStatus;
  conclusion: string | null;
  progress: number;
  run: WorkflowRun;
};
