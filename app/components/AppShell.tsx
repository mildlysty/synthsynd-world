'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/' || pathname === '/manifesto';

  return (
    <div className="flex min-h-screen">
      {!isLandingPage && <Sidebar />}
      {isLandingPage ? (
        <div className="min-w-0 flex-1">{children}</div>
      ) : (
        <main className="ml-0 min-w-0 flex-1 lg:ml-64">{children}</main>
      )}
    </div>
  );
}
