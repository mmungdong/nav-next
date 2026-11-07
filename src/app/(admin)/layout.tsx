import type { Metadata } from 'next';
import AdminLayout from '@/layouts/AdminLayout';

export const metadata: Metadata = {
  title: '管理后台 - Guidebook',
  description: '管理后台系统',
};

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminLayout>{children}</AdminLayout>;
}
