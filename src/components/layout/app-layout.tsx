'use client';

import { usePathname } from 'next/navigation';
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/splash');

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen min-w-0 bg-background">
      <SidebarProvider defaultOpen={true}>
        <Sidebar />
        <div className={cn("flex flex-col", "md:mr-[16rem] group-data-[state=collapsed]/sidebar-wrapper:md:mr-12", "transition-all duration-200 ease-in-out")}>
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
