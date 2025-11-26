'use client';

import { Bell, ChevronDown, Search, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { findImage } from "@/lib/placeholder-images";
import Link from 'next/link';
import { useFirebase, useUser } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { FingerprintIcon } from "../auth/fingerprint-icon";
import { menuItems } from "./sidebar";
import { cn } from "@/lib/utils";

export function Header() {
  const { auth } = useFirebase();
  const { user, roles, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();


  const handleLogout = () => {
    auth.signOut();
    router.push('/login');
  };

  const accessibleMenuItems = menuItems.filter(item => {
    if (!user) return false;
    if (roles.isAdmin) return true;
    if (!item.roles || item.roles.length === 0) return true;
    const userRoles = new Set<string>();
    if (roles.isHr) userRoles.add('hr');
    userRoles.add('employee');
    return item.roles.some(requiredRole => userRoles.has(requiredRole));
  });

  const userAvatar = findImage("avatar6");
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <FingerprintIcon className="h-8 w-8 text-primary" />
            <span className="font-bold text-lg">HighClass HR</span>
        </Link>
      </div>

       <nav className="hidden md:flex items-center gap-4 ml-6">
            {accessibleMenuItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "text-sm font-medium transition-colors hover:text-primary",
                        pathname === item.href ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    {item.label}
                </Link>
            ))}
      </nav>
      
      <div className="flex w-full items-center gap-4 md:ml-auto md:justify-end md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial md:ml-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="بحث..."
              className="pl-8 sm:w-auto md:w-52 lg:w-64"
            />
          </div>
        </form>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className="flex items-center gap-2 rounded-full pr-1"
              disabled={isUserLoading}
            >
              <Avatar className="h-8 w-8">
                {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={userAvatar.description} />}
                <AvatarFallback>{isUserLoading ? '' : (user?.displayName?.charAt(0) || 'U')}</AvatarFallback>
              </Avatar>
              {!isMobile && <span className="hidden md:inline">{isUserLoading ? 'تحميل...' : (user?.displayName || 'المستخدم')}</span>}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>الملف الشخصي</DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href="/settings">الإعدادات</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
