'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import AdminSidebar from '@/components/layout/AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, checkAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      await checkAuth();
      setLoading(false);
    };

    checkAuthentication();
  }, [checkAuth]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <div className="w-[200px] lg:w-[250px] border-r border-gray-200 dark:border-gray-700">
        <AdminSidebar onLogout={handleLogout} />
      </div>
      <div className="flex-1 min-w-0 p-6">{children}</div>
    </div>
  );
}