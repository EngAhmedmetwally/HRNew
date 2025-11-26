'use client';

import { usePathname } from 'next/navigation';
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/splash');

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <SidebarProvider>
        <Sidebar />
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
