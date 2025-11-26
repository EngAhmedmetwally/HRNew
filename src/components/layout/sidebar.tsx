'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  ScanLine,
  Settings,
  Users,
  QrCode,
  Camera,
  LogOut,
  LucideIcon,
  FileCheck2
} from "lucide-react";
import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar";
import { useUser, useFirebase } from "@/firebase";
import { Button } from "../ui/button";
import { FingerprintIcon } from "../auth/fingerprint-icon";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { findImage } from "@/lib/placeholder-images";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface MenuItem {
    href: string;
    icon: LucideIcon;
    label: string;
    roles: ('admin' | 'hr' | 'employee')[];
}

export const menuItems: MenuItem[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم", roles: ['admin', 'hr'] },
    { href: "/employees", icon: Users, label: "الموظفين", roles: ['admin', 'hr'] },
    { href: "/attendance", icon: ScanLine, label: "سجل الحضور", roles: ['admin', 'hr'] },
    { href: "/payroll", icon: CreditCard, label: "الرواتب", roles: ['admin', 'hr'] },
    { href: "/payroll/paid", icon: FileCheck2, label: "الرواتب المدفوعة", roles: ['admin', 'hr'] },
    { href: "/attendance/qr", icon: QrCode, label: "إنشاء QR Code", roles: ['admin', 'hr'] },
    { href: "/scan", icon: Camera, label: "مسح QR", roles: ['admin', 'hr', 'employee'] },
    { href: "/settings", icon: Settings, label: "الإعدادات", roles: ['admin'] },
];

export function Sidebar() {
    const { auth } = useFirebase();
    const { user, roles, isUserLoading } = useUser();
    const pathname = usePathname();
    const { isMobile } = useSidebar();
    const userAvatar = findImage("avatar6");

    const handleLogout = () => {
        auth.signOut();
    };

    const accessibleMenuItems = menuItems.filter(item => {
        if (!user) return false;
        if (roles.isAdmin) return true;
        const userRolesSet = new Set<string>();
        if (roles.isHr) userRolesSet.add('hr');
        userRolesSet.add('employee'); // All authenticated users are at least employees
        return item.roles.some(requiredRole => userRolesSet.has(requiredRole));
    });

  return (
    <SidebarContainer side="right" variant="sidebar" collapsible={isMobile ? "offcanvas" : "none"} className="bg-sidebar text-sidebar-foreground border-sidebar-border">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 text-sidebar-foreground">
          <FingerprintIcon className="h-8 w-8" />
          <span className="font-bold text-lg">
            HighClass HR
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarMenu>
          {accessibleMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                className={cn(
                  "justify-start text-base font-normal",
                  pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="ml-2" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
         {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-between p-2 hover:bg-sidebar-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={userAvatar.description} />}
                      <AvatarFallback>{isUserLoading ? '' : (user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U')}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                       <span className="text-sm font-medium text-sidebar-foreground">{user.displayName || user.email?.split('@')[0]}</span>
                       <span className="text-xs text-muted-foreground">{roles.isAdmin ? 'مدير' : roles.isHr ? 'موارد بشرية' : 'موظف'}</span>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mb-2" side="top">
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        )}
      </SidebarFooter>
    </SidebarContainer>
  );
}
