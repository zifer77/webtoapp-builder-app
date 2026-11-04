import { DEFAULT_BRANCH, PAT_SCOPES_URL, WORKFLOW_FILE } from '@/constants/config';

export function getGitHubRepoUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}

export function getGitHubTemplateUrl(repoSlug: string): string | null {
  const trimmed = repoSlug.trim();
  if (!trimmed.includes('/')) {
    return null;
  }
  return `https://github.com/${trimmed}`;
}

export function getGitHubForkUrl(repoSlug: string): string | null {
  const base = getGitHubTemplateUrl(repoSlug);
  return base ? `${base}/fork` : null;
}

export function getWorkflowFileUrl(owner: string, repo: string): string {
  return `${getGitHubRepoUrl(owner, repo)}/blob/${DEFAULT_BRANCH}/.github/workflows/${WORKFLOW_FILE}`;
}

export function getActionsUrl(owner: string, repo: string): string {
  return `${getGitHubRepoUrl(owner, repo)}/actions/workflows/${WORKFLOW_FILE}`;
}

export function getTokenCreationUrl(): string {
  return PAT_SCOPES_URL;
}
