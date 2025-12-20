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
      // 对于私有仓库，用户可能是协作者而不是所有者
      // 我们需要检查用户是否有访问该仓库的权限
      try {
        const repoResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/nav-next`,
          {
            headers: {
              Authorization: `token ${token}`,
              'User-Agent': 'nav-next-app',
            },
          }
        );

        if (!repoResponse.ok) {
          if (repoResponse.status === 404) {
            return {
              valid: false,
              message: '无法访问指定的私有仓库，请确认仓库名称和您的访问权限',
            };
          } else if (repoResponse.status === 403) {
            return {
              valid: false,
              message:
                'Token权限不足，无法访问私有仓库。请确保Token具有完整的repo权限',
            };
          } else {
            return {
              valid: false,
              message: `仓库访问失败 (${repoResponse.status})`,
            };
          }
        }
      } catch (repoError) {
        console.error('仓库访问检查失败:', repoError);
        return {
          valid: false,
          message: '无法验证对私有仓库的访问权限',
        };
      }
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

// 获取文件内容
export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
) {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'nav-next-app',
        },
      }
    );

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.log('GitHub API错误详情:', errorData); // 添加详细日志

        // 特别处理404错误（文件不存在）
        if (response.status === 404) {
          // 返回特殊标识表示文件不存在
          return { sha: null, content: null, notFound: true };
        }

        // 特别处理403错误（私有仓库访问问题）
        if (response.status === 403) {
          if (errorMessage.includes('Resource not accessible')) {
            errorMessage =
              '无法访问私有仓库资源，请检查Token权限和仓库访问权限';
          } else {
            errorMessage = `私有仓库访问权限不足: ${errorMessage}`;
          }
        }

        // 特别处理404错误（仓库不存在或无访问权限）
        if (response.status === 404) {
          errorMessage =
            '无法找到指定的仓库或文件，请检查仓库名称和您的访问权限';
        }

        // 特别处理422错误（验证错误，可能是分支保护规则）
        if (response.status === 422) {
          if (errorMessage.includes('protected branch')) {
            errorMessage =
              '分支受到保护，无法直接推送。请检查GitHub仓库的分支保护规则设置';
          } else {
            errorMessage = `验证错误: ${errorMessage}，可能是分支保护规则导致`;
          }
        }

        // 特别处理400错误（请求参数错误）
        if (response.status === 400) {
          errorMessage = `请求参数错误: ${errorMessage}`;
        }
      } catch (parseError) {
        // 如果无法解析错误响应，使用默认消息
        console.warn('无法解析GitHub API错误响应:', parseError);
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('获取文件内容失败:', error);
    throw error;
  }
}

// 更新文件内容
export async function updateFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string = 'main',
  sha?: string
) {
  try {
    // 将内容转换为base64编码
    const encodedContent = Buffer.from(content).toString('base64');

    // 构造请求体参数
    const requestBody: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message,
      content: encodedContent,
      branch,
    };

    // 只有在sha存在时才添加到请求体中（更新现有文件）
    // 如果sha不存在，则不添加（创建新文件）
    if (sha) {
      requestBody.sha = sha;
    }

    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'nav-next-app',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.log('GitHub API错误详情:', errorData); // 添加详细日志

        // 特别处理403错误（私有仓库访问问题）
        if (response.status === 403) {
          if (errorMessage.includes('Resource not accessible')) {
            errorMessage =
              '无法访问私有仓库资源，请检查Token权限和仓库访问权限';
          } else {
            errorMessage = `私有仓库访问权限不足: ${errorMessage}`;
          }
        }

        // 特别处理404错误（仓库或文件不存在）
        if (response.status === 404) {
          errorMessage =
            '无法找到指定的仓库或文件，请检查仓库名称和您的访问权限';
        }

        // 特别处理422错误（验证错误，可能是分支保护规则）
        if (response.status === 422) {
          if (errorMessage.includes('protected branch')) {
            errorMessage =
              '分支受到保护，无法直接推送。请检查GitHub仓库的分支保护规则设置';
          } else {
            errorMessage = `验证错误: ${errorMessage}，可能是分支保护规则导致`;
          }
        }

        // 特别处理400错误（请求参数错误）
        if (response.status === 400) {
          errorMessage = `请求参数错误: ${errorMessage}`;
        }
      } catch (parseError) {
        // 如果无法解析错误响应，使用默认消息
        console.warn('无法解析GitHub API错误响应:', parseError);
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('更新文件内容失败:', error);
    throw error;
  }
}

// 获取仓库信息
export async function getRepoInfo(token: string, owner: string, repo: string) {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
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
    console.error('获取仓库信息失败:', error);
    throw error;
  }
}
