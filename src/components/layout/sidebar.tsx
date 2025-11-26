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
import { useUser, useFirebase, UserPermissions } from "@/firebase";
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
    permissionKey: keyof Omit<UserPermissions, 'isAdmin'>; // The key in the permissions object
}

// Map href to a unique permission key. Keep this flat.
export const menuItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم", permissionKey: "dashboard" as const },
    { href: "/employees", icon: Users, label: "الموظفين", permissionKey: "employees" as const },
    { href: "/attendance", icon: ScanLine, label: "سجل الحضور", permissionKey: "attendance" as const },
    { href: "/payroll", icon: CreditCard, label: "الرواتب", permissionKey: "payroll" as const },
    { href: "/payroll/paid", icon: FileCheck2, label: "الرواتب المدفوعة", permissionKey: "payroll_paid" as const },
    { href: "/attendance/qr", icon: QrCode, label: "إنشاء QR Code", permissionKey: "attendance_qr" as const },
    { href: "/scan", icon: Camera, label: "مسح QR", permissionKey: "scan" as const },
    { href: "/settings", icon: Settings, label: "الإعدادات", permissionKey: "settings" as const },
];

export function Sidebar() {
    const { auth } = useFirebase();
    const { user, permissions, isUserLoading } = useUser();
    const pathname = usePathname();
    const { isMobile } = useSidebar();
    const userAvatar = findImage("avatar6");

    const handleLogout = () => {
        auth.signOut();
    };

    const accessibleMenuItems = menuItems.filter(item => {
        if (!user) return false;
        // Admin can see everything
        if (permissions.isAdmin) return true;
        // All users can scan
        if (item.permissionKey === 'scan') return true;
        // Check if the user's permissions array includes the item's key
        return permissions.screens.includes(item.permissionKey);
    });
    
    const getUserRoleName = () => {
        if (permissions.isAdmin) return 'مدير النظام';
        if (permissions.screens.length > 1) return 'موظف بصلاحيات';
        return 'موظف';
    }


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
                       <span className="text-xs text-muted-foreground">{getUserRoleName()}</span>
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
