'use client';

import GithubTokenAuth from '@/components/GithubTokenAuth';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <GithubTokenAuth />
    </div>
  );
}
