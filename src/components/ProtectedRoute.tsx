'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, checkAuth, hasPermission, hasRole } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      await checkAuth();
      setLoading(false);
    };

    checkAuthentication();
  }, [checkAuth]);

  useEffect(() => {
    if (!loading) {
      // 如果用户未认证，重定向到登录页面
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // 检查权限
      if (requiredPermission && !hasPermission(requiredPermission)) {
        router.push('/unauthorized');
        return;
      }

      // 检查角色
      if (requiredRole && !hasRole(requiredRole)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [
    isAuthenticated,
    loading,
    requiredPermission,
    requiredRole,
    router,
    hasPermission,
    hasRole,
  ]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 如果用户已认证并且满足权限要求，渲染子组件
  if (isAuthenticated) {
    // 检查权限和角色要求
    const hasRequiredPermission = requiredPermission
      ? hasPermission(requiredPermission)
      : true;
    const hasRequiredRole = requiredRole ? hasRole(requiredRole) : true;

    if (hasRequiredPermission && hasRequiredRole) {
      return <>{children}</>;
    }
  }

  return null;
}
