import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use a different variant of the sidebar for the main app layout
  return (
    <div className="min-h-screen w-full bg-background">
      <SidebarProvider defaultOpen={true}>
        <Sidebar />
        <div className={cn("flex flex-col", "md:pr-[16rem] group-data-[state=collapsed]/sidebar-wrapper:md:pr-12", "transition-all duration-200 ease-in-out")}>
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
