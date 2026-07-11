'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

function GithubIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface GithubTokenAuthProps {
  onAuthSuccess?: () => void;
}

export default function GithubTokenAuth({
  onAuthSuccess,
}: GithubTokenAuthProps) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { validateGithubToken, isAuthenticated } = useAuthStore();

  // 检查是否已经认证
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/system');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    if (!token.trim()) {
      setError('请输入 GitHub Personal Access Token');
      setIsLoading(false);
      return;
    }

    try {
      const result = await validateGithubToken(token);

      if (result.valid) {
        setSuccess(true);
        // 短暂延迟后跳转到系统页面
        setTimeout(() => {
          router.push('/system');
          if (onAuthSuccess) {
            onAuthSuccess();
          }
        }, 1000);
      } else {
        setError(result.message || 'Token 验证失败');
      }
    } catch (err) {
      setError('验证过程中发生错误，请稍后再试');
      console.error('Token 验证错误:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <GithubIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            GitHub Token 认证
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            请输入您的 GitHub Personal Access Token 进行认证
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              GitHub Personal Access Token
            </label>
            <input
              id="token"
              name="token"
              type="password"
              autoComplete="off"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus-ring sm:text-sm bg-white dark:bg-gray-800"
              placeholder="请输入您的 GitHub Token"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              您可以在 GitHub 的 Settings &gt; Developer settings &gt; Personal
              access tokens 中生成新的 Token
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <div className="text-sm text-green-700 dark:text-green-300">
                认证成功！正在跳转到系统页面...
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  验证中...
                </>
              ) : (
                '认证'
              )}
            </button>
          </div>
        </form>
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                帮助
              </span>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              如何创建 GitHub Personal Access Token？
            </p>
            <ol className="mt-2 text-xs text-gray-500 dark:text-gray-400 list-decimal list-inside space-y-1">
              <li>访问 GitHub 并登录</li>
              <li>
                进入 Settings &gt; Developer settings &gt; Personal access
                tokens
              </li>
              <li>点击 &quot;Generate new token&quot;</li>
              <li>为 Token 添加描述，例如 &quot;nav-next app&quot;</li>
              <li>选择适当的权限（通常需要 repo 权限）</li>
              <li>点击 &quot;Generate token&quot; 并复制生成的 Token</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
