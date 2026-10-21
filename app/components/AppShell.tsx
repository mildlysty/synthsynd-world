'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  return (
    <div className="flex min-h-screen">
      {!isLandingPage && <Sidebar />}
      <main className={`min-w-0 flex-1 ${isLandingPage ? '' : 'ml-0 lg:ml-64'}`}>{children}</main>
    </div>
  );
}
