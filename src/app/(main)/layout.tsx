import MainLayout from '@/layouts/MainLayout';

// The document title / description come from useConfigStore at runtime so the
// admin-editable site name wins over any build-time metadata.
export default function MainRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MainLayout>{children}</MainLayout>;
}
