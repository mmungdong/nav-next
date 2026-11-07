import type { Metadata } from 'next';
import MainLayout from '@/layouts/MainLayout';

export const metadata: Metadata = {
  title: 'Guidebook',
  description: 'Brookside Guidebook',
};

export default function MainRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MainLayout>{children}</MainLayout>;
}
