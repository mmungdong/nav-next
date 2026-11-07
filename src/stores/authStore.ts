import { create } from 'zustand';
import { GitHubUser, verifyGithubToken } from '@/lib/githubApi';

/**
 * Single-owner GitHub auth. There is no username/password login, no local role,
 * and no client-side permission model: GitHub decides what the token can write.
 *
 * Tokens live in sessionStorage by default. Only an explicit "remember on this
 * device" choice moves them to localStorage — page scripts can still read that,
 * so the UI never claims it is encrypted.
 */

const SESSION_TOKEN_KEY = 'navnext:auth:token';
const SESSION_USER_KEY = 'navnext:auth:user';
const REMEMBER_FLAG_KEY = 'navnext:auth:remember';
const REMEMBERED_TOKEN_KEY = 'navnext:auth:rememberedToken';
const LEGACY_KEYS = ['githubToken', 'githubUser', 'authToken', 'user'];

export type AuthStatus = 'unknown' | 'checking' | 'authenticated' | 'offline' | 'signed_out';

interface AuthState {
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  githubToken: string | null;
  githubUser: GitHubUser | null;
  rememberDevice: boolean;
  authError: string | null;
  validateGithubToken: (
    token: string,
    options?: { remember?: boolean }
  ) => Promise<{ valid: boolean; message?: string }>;
  checkAuth: () => Promise<void>;
  setGithubToken: (token: string) => void;
  clearGithubToken: () => void;
  logout: () => void;
}

const read = (storage: Storage | null, key: string): string | null => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const write = (storage: Storage | null, key: string, value: string): boolean => {
  try {
    storage?.setItem(key, value);
    return Boolean(storage);
  } catch {
    return false;
  }
};

const remove = (storage: Storage | null, key: string): void => {
  try {
    storage?.removeItem(key);
  } catch {
    // best effort
  }
};

const session = (): Storage | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
};

const local = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const parseUser = (raw: string | null): GitHubUser | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GitHubUser;
    return typeof parsed?.login === 'string' ? parsed : null;
  } catch {
    return null;
  }
};

const persistSession = (token: string, user: GitHubUser | null): void => {
  write(session(), SESSION_TOKEN_KEY, token);
  if (user) write(session(), SESSION_USER_KEY, JSON.stringify(user));
};

const persistRemembered = (token: string | null): void => {
  if (token) {
    write(local(), REMEMBERED_TOKEN_KEY, token);
    write(local(), REMEMBER_FLAG_KEY, '1');
  } else {
    remove(local(), REMEMBERED_TOKEN_KEY);
    remove(local(), REMEMBER_FLAG_KEY);
  }
};

const clearAllCredentials = (): void => {
  remove(session(), SESSION_TOKEN_KEY);
  remove(session(), SESSION_USER_KEY);
  remove(local(), REMEMBERED_TOKEN_KEY);
  remove(local(), REMEMBER_FLAG_KEY);
  for (const key of LEGACY_KEYS) remove(local(), key);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  authStatus: 'unknown',
  githubToken: null,
  githubUser: null,
  rememberDevice: false,
  authError: null,

  validateGithubToken: async (token, options = {}) => {
    const trimmed = token.trim();
    if (!trimmed) return { valid: false, message: '请输入 GitHub Token' };

    const result = await verifyGithubToken(trimmed);
    if (!result.valid || !result.user) {
      return { valid: false, message: result.message || 'Token 验证失败' };
    }

    persistSession(trimmed, result.user);
    persistRemembered(options.remember ? trimmed : null);
    // A legacy token only ever moves into sessionStorage; persistence needs opt-in.
    for (const key of LEGACY_KEYS) remove(local(), key);

    set({
      isAuthenticated: true,
      authStatus: 'authenticated',
      githubToken: trimmed,
      githubUser: result.user,
      rememberDevice: Boolean(options.remember),
      authError: null,
    });
    return { valid: true };
  },

  checkAuth: async () => {
    if (get().authStatus === 'checking') return;

    // Older builds stored a fake user/role here; read once for a cached display
    // name, then never restore them as an editing session.
    const legacyToken = read(local(), 'githubToken');
    const legacyUser = parseUser(read(local(), 'githubUser'));
    for (const key of LEGACY_KEYS) remove(local(), key);
    remove(local(), 'user');
    remove(local(), 'authToken');

    const remembered = read(local(), REMEMBERED_TOKEN_KEY);
    const sessionToken = read(session(), SESSION_TOKEN_KEY);
    const token = sessionToken ?? remembered ?? legacyToken;
    const rememberDevice = Boolean(remembered);
    const cachedUser = parseUser(read(session(), SESSION_USER_KEY)) ?? legacyUser;

    if (!token) {
      set({
        isAuthenticated: false,
        authStatus: 'signed_out',
        githubToken: null,
        githubUser: null,
        rememberDevice: false,
        authError: null,
      });
      return;
    }

    set({ authStatus: 'checking', authError: null });
    const result = await verifyGithubToken(token);

    if (result.valid && result.user) {
      // Re-validation is the only thing that can restore an editing session.
      persistSession(token, result.user);
      if (rememberDevice) persistRemembered(token);
      set({
        isAuthenticated: true,
        authStatus: 'authenticated',
        githubToken: token,
        githubUser: result.user,
        rememberDevice,
        authError: null,
      });
      return;
    }

    if (result.code === 'network_error' || result.code === 'timeout') {
      // Keep credentials and drafts; the user can keep editing offline.
      persistSession(token, cachedUser);
      set({
        isAuthenticated: true,
        authStatus: 'offline',
        githubToken: token,
        githubUser: cachedUser,
        rememberDevice,
        authError: `离线：${result.message ?? '无法验证 Token'}，凭据与草稿已保留`,
      });
      return;
    }

    clearAllCredentials();
    set({
      isAuthenticated: false,
      authStatus: 'signed_out',
      githubToken: null,
      githubUser: null,
      rememberDevice: false,
      authError: result.message ?? 'GitHub 授权已失效，请重新授权',
    });
  },

  setGithubToken: (token) => {
    persistSession(token, get().githubUser);
    set({ githubToken: token });
  },

  clearGithubToken: () => {
    remove(session(), SESSION_TOKEN_KEY);
    remove(session(), SESSION_USER_KEY);
    remove(local(), REMEMBERED_TOKEN_KEY);
    remove(local(), REMEMBER_FLAG_KEY);
    set({ githubToken: null, githubUser: null, isAuthenticated: false, authStatus: 'signed_out' });
  },

  logout: () => {
    // Drafts stay; only credentials are cleared.
    clearAllCredentials();
    set({
      isAuthenticated: false,
      authStatus: 'signed_out',
      githubToken: null,
      githubUser: null,
      rememberDevice: false,
      authError: null,
    });
  },
}));
