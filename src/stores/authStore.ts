import { create } from 'zustand';
import { verifyGithubToken } from '@/lib/githubApi';

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface User {
  id: number;
  username: string;
  role: string;
  email: string;
  avatar: string;
}

interface GithubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  githubToken: string | null;
  githubUser: GithubUser | null;
  isGithubAuth: boolean;
  roles: Role[];
  permissions: Permission[];
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (
    userData: Partial<User>
  ) => Promise<{ success: boolean; message?: string }>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  getUserPermissions: () => string[];
  validateGithubToken: (
    token: string
  ) => Promise<{ valid: boolean; message?: string }>;
  setGithubToken: (token: string) => void;
  clearGithubToken: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  githubToken: null,
  githubUser: null,
  isGithubAuth: false,
  roles: [
    {
      id: 'admin',
      name: '管理员',
      permissions: [
        'manage_users',
        'manage_websites',
        'manage_categories',
        'manage_tags',
        'manage_settings',
        'manage_components',
        'view_logs',
        'manage_system',
      ],
    },
    {
      id: 'editor',
      name: '编辑者',
      permissions: [
        'manage_websites',
        'manage_categories',
        'manage_tags',
        'manage_components',
      ],
    },
    {
      id: 'user',
      name: '普通用户',
      permissions: ['view_websites', 'submit_website', 'manage_bookmarks'],
    },
  ],
  permissions: [
    {
      id: 'manage_users',
      name: '管理用户',
      description: '创建、编辑、删除用户',
    },
    {
      id: 'manage_websites',
      name: '管理网站',
      description: '添加、编辑、删除网站',
    },
    {
      id: 'manage_categories',
      name: '管理分类',
      description: '创建、编辑、删除分类',
    },
    {
      id: 'manage_tags',
      name: '管理标签',
      description: '创建、编辑、删除标签',
    },
    { id: 'manage_settings', name: '管理设置', description: '修改系统设置' },
    {
      id: 'manage_components',
      name: '管理组件',
      description: '添加、编辑、删除组件',
    },
    { id: 'view_logs', name: '查看日志', description: '查看系统操作日志' },
    { id: 'manage_system', name: '管理系统', description: '系统维护和管理' },
    { id: 'view_websites', name: '查看网站', description: '浏览网站导航' },
    { id: 'submit_website', name: '提交网站', description: '提交新网站供审核' },
    { id: 'manage_bookmarks', name: '管理书签', description: '管理个人书签' },
  ],
  login: async (username, password) => {
    try {
      // 模拟API调用
      // 在实际应用中，这里会调用后端API进行身份验证
      if (username === 'admin' && password === 'password') {
        const user: User = {
          id: 1,
          username: 'admin',
          role: 'admin',
          email: 'admin@example.com',
          avatar: '/avatar.png',
        };
        set({ isAuthenticated: true, user });
        // 保存认证信息到localStorage
        localStorage.setItem('authToken', 'fake-jwt-token');
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true };
      }

      // 模拟其他用户登录
      if (username && password) {
        const user: User = {
          id: 2,
          username,
          role: 'user',
          email: `${username}@example.com`,
          avatar: '/avatar.png',
        };
        set({ isAuthenticated: true, user });
        // 保存认证信息到localStorage
        localStorage.setItem('authToken', 'fake-jwt-token');
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true };
      }

      return { success: false, message: '用户名或密码错误' };
    } catch {
      return { success: false, message: '登录失败，请稍后再试' };
    }
  },
  logout: () => {
    set({
      isAuthenticated: false,
      user: null,
      githubToken: null,
      githubUser: null,
      isGithubAuth: false,
    });
    // 清除localStorage中的认证信息
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('githubToken');
    localStorage.removeItem('githubUser');
  },
  checkAuth: async () => {
    try {
      // 检查localStorage中的认证信息
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ isAuthenticated: true, user });
        return;
      }

      // 检查GitHub Token
      const githubToken = localStorage.getItem('githubToken');
      const githubUserStr = localStorage.getItem('githubUser');

      if (githubToken && githubUserStr) {
        const githubUser = JSON.parse(githubUserStr) as GithubUser;
        set({
          isAuthenticated: true,
          isGithubAuth: true,
          githubToken,
          githubUser,
          user: {
            id: githubUser.id,
            username: githubUser.login,
            role: 'admin', // GitHub用户默认为管理员
            email: githubUser.email || '',
            avatar: githubUser.avatar_url,
          },
        });
      }
    } catch {
      // 如果解析失败，清除认证信息
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('githubToken');
      localStorage.removeItem('githubUser');
      set({
        isAuthenticated: false,
        user: null,
        githubToken: null,
        githubUser: null,
        isGithubAuth: false,
      });
    }
  },
  register: async (username, email, password) => {
    try {
      // 模拟注册逻辑
      // 在实际应用中，这里会调用后端API进行用户注册
      if (username && email && password) {
        // 检查用户名是否已存在
        if (username === 'admin' || username === 'existing_user') {
          return { success: false, message: '用户名已存在' };
        }

        // 注册成功后自动登录
        const user: User = {
          id: Math.floor(Math.random() * 1000) + 2, // 随机ID
          username,
          role: 'user',
          email,
          avatar: '/avatar.png',
        };
        set({ isAuthenticated: true, user });
        // 保存认证信息到localStorage
        localStorage.setItem('authToken', 'fake-jwt-token');
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true };
      }

      return { success: false, message: '请填写所有必填字段' };
    } catch {
      return { success: false, message: '注册失败，请稍后再试' };
    }
  },
  updateProfile: async (userData) => {
    try {
      const state = get();
      if (!state.isAuthenticated || !state.user) {
        return { success: false, message: '用户未登录' };
      }

      // 模拟更新用户信息
      const updatedUser = { ...state.user, ...userData };
      set({ user: updatedUser });

      // 更新localStorage中的用户信息
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { success: true };
    } catch {
      return { success: false, message: '更新失败，请稍后再试' };
    }
  },
  hasPermission: (permission) => {
    const state = get();
    if (!state.isAuthenticated || !state.user) return false;

    const role = state.roles.find((r) => r.id === state.user?.role);
    return !!role && role.permissions.includes(permission);
  },
  hasRole: (role) => {
    const state = get();
    if (!state.isAuthenticated || !state.user) return false;
    return state.user.role === role;
  },
  getUserPermissions: () => {
    const state = get();
    if (!state.isAuthenticated || !state.user) return [];

    const role = state.roles.find((r) => r.id === state.user?.role);
    return role ? role.permissions : [];
  },
  validateGithubToken: async (token: string) => {
    try {
      // 默认仓库URL
      const repoUrl = 'https://github.com/mmungdong/nav-next';

      const result = await verifyGithubToken(token, repoUrl);

      if (result.valid && result.user) {
        // 保存GitHub Token和用户信息到localStorage
        localStorage.setItem('githubToken', token);
        localStorage.setItem('githubUser', JSON.stringify(result.user));

        // 更新状态
        set({
          isAuthenticated: true,
          isGithubAuth: true,
          githubToken: token,
          githubUser: result.user,
          user: {
            id: result.user.id,
            username: result.user.login,
            role: 'admin', // GitHub用户默认为管理员
            email: result.user.email || '',
            avatar: result.user.avatar_url,
          },
        });

        return { valid: true };
      } else {
        return { valid: false, message: result.message || 'Token验证失败' };
      }
    } catch (error) {
      console.error('GitHub Token 验证错误:', error);
      return { valid: false, message: '验证过程中发生错误，请稍后再试' };
    }
  },
  setGithubToken: (token: string) => {
    set({ githubToken: token });
  },
  clearGithubToken: () => {
    set({ githubToken: null, githubUser: null, isGithubAuth: false });
  },
}));
