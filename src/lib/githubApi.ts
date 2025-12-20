import { getOwnerFromRepoUrl } from './utils';

// GitHub API 基础URL
const GITHUB_API_BASE = 'https://api.github.com';

// 验证 GitHub Token 的有效性
interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export async function verifyGithubToken(
  token: string,
  repoUrl: string
): Promise<{
  valid: boolean;
  user?: GitHubUser;
  message?: string;
}> {
  try {
    // 首先验证 token 本身的有效性
    const userResponse = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'nav-next-app',
      },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        return {
          valid: false,
          message: 'Token 无效或已过期',
        };
      } else if (userResponse.status === 403) {
        return {
          valid: false,
          message: 'Token 权限不足',
        };
      } else {
        return {
          valid: false,
          message: `验证失败 (${userResponse.status})`,
        };
      }
    }

    const userData = await userResponse.json();

    // 获取仓库所有者信息
    const owner = getOwnerFromRepoUrl(repoUrl);

    // 验证用户是否为仓库所有者
    if (userData.login !== owner) {
      return {
        valid: false,
        message: 'Token 用户与仓库所有者不匹配',
      };
    }

    return {
      valid: true,
      user: userData,
    };
  } catch (error) {
    console.error('GitHub Token 验证错误:', error);
    return {
      valid: false,
      message: '网络错误，请稍后再试',
    };
  }
}

// 获取用户信息
export async function getUserInfo(token: string) {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'nav-next-app',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}
