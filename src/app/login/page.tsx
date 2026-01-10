'use client';

import GithubTokenAuth from '@/components/GithubTokenAuth';
import AuthLayout from '@/layouts/AuthLayout';

export default function LoginPage() {
  return (
    <AuthLayout>
      <GithubTokenAuth />
    </AuthLayout>
  );
}