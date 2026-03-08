const REPOSITORY_FALLBACK = 'https://github.com/mafhper/imaginizim';

export interface ProjectMetaElements {
  commitLink: HTMLAnchorElement;
  repositoryLink: HTMLAnchorElement;
  issuesLink: HTMLAnchorElement;
}

export interface ProjectMeta {
  repositoryUrl: string;
  commitHash: string;
  shortHash: string;
  commitUrl: string;
  issuesUrl: string;
}

export function normalizeRepositoryUrl(url: string): string {
  if (url.startsWith('git@github.com:')) {
    return `https://github.com/${url.replace('git@github.com:', '').replace(/\.git$/, '')}`;
  }

  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url.replace(/\.git$/, '');
  }

  return REPOSITORY_FALLBACK;
}

export function applyProjectMeta(elements: ProjectMetaElements): void {
  const { repositoryUrl, shortHash, commitUrl, issuesUrl } = getProjectMeta();

  elements.commitLink.href = commitUrl;
  elements.commitLink.textContent = shortHash;

  elements.repositoryLink.href = repositoryUrl;
  elements.issuesLink.href = issuesUrl;
}

export function getProjectMeta(): ProjectMeta {
  const repositoryUrl = normalizeRepositoryUrl(__APP_REPO_URL__);
  const commitHash = __APP_COMMIT_HASH__ || 'unknown';
  const shortHash = commitHash === 'unknown' ? commitHash : commitHash.slice(0, 7);
  const commitUrl =
    commitHash === 'unknown'
      ? repositoryUrl
      : `${repositoryUrl.replace(/\/$/, '')}/commit/${commitHash}`;

  return {
    repositoryUrl,
    commitHash,
    shortHash,
    commitUrl,
    issuesUrl: `${repositoryUrl.replace(/\/$/, '')}/issues`
  };
}
