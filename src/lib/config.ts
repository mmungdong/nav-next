import navConfig from '../../nav.config.json';

export interface GithubConfig {
  owner: string;
  repo: string;
  branch: string;
  dbPath: string;
  configPath: string;
}

export const githubConfig: GithubConfig = navConfig.github;
export const { owner, repo, branch, dbPath, configPath } = githubConfig;
