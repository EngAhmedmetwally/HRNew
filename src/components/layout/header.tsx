'use client';

import { Bell, ChevronDown, Search, Building, LogOut } from "lucide-react";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { findImage } from "@/lib/placeholder-images";
import Link from 'next/link';
import { useFirebase, useUser } from "@/firebase";
import { useRouter } from "next/navigation";

export function Header() {
  const { auth } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    auth.signOut();
    router.push('/login');
  };

  const userAvatar = findImage("avatar6");
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
         <div className="hidden md:block">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <Building className="h-6 w-6" />
                <span>HR Pulse</span>
            </Link>
         </div>
      </div>
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="بحث..."
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
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
              <span className="hidden md:inline">{isUserLoading ? 'تحميل...' : (user?.displayName || 'المستخدم')}</span>
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
