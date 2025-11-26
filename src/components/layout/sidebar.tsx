'use client';

import Link from "next/link";
import {
  CreditCard,
  LayoutDashboard,
  ScanLine,
  Settings,
  Users,
  Building,
  QrCode,
  Camera,
  LogOut,
  User,
} from "lucide-react";
import {
  Sidebar as AppSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
} from "@/components/ui/sidebar";
import { useUser, useFirebase } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";
import { FingerprintIcon } from "../auth/fingerprint-icon";

const menuItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم", roles: ['admin', 'hr'] },
    { href: "/employees", icon: Users, label: "الموظفين", roles: ['admin', 'hr'] },
    { href: "/attendance", icon: ScanLine, label: "سجل الحضور", roles: ['admin', 'hr'] },
    { href: "/attendance/qr", icon: QrCode, label: "إنشاء QR Code", roles: ['admin', 'hr'] },
    { href: "/scan", icon: Camera, label: "مسح QR", roles: ['admin', 'hr', 'employee'] },
    { href: "/payroll", icon: CreditCard, label: "الرواتب", roles: ['admin', 'hr'] },
    { href: "/settings", icon: Settings, label: "الإعدادات", roles: ['admin'] },
];

export function Sidebar() {
    const { auth } = useFirebase();
    const { user, roles, isUserLoading } = useUser();

    const handleLogout = () => {
        auth.signOut();
    };

    const accessibleMenuItems = menuItems.filter(item => {
        if (!user) return false;
        
        // If user is admin, show all menu items.
        if (roles.isAdmin) return true;

        if (!item.roles || item.roles.length === 0) return true;
        
        const userRoles = new Set<string>();
        if (roles.isHr) userRoles.add('hr');
        userRoles.add('employee'); // All authenticated users are at least employees
        
        return item.roles.some(requiredRole => userRoles.has(requiredRole));
    });

  return (
    <AppSidebar side="right" variant="sidebar" collapsible="icon">
      <SidebarHeader className="h-16 justify-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <FingerprintIcon className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg text-foreground group-data-[collapsible=icon]:hidden">
            HighClass HR
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {isUserLoading ? (
                 <>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                 </>
            ) : (
                accessibleMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        tooltip={{ children: item.label, side: "left" }}
                    >
                        <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
         {user && (
            <div className="w-full flex flex-col items-center gap-2 p-2">
                 <SidebarMenu className="w-full">
                     <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: "تسجيل الخروج", side: "left" }}
                            onClick={handleLogout}
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                        >
                            <a>
                                <LogOut />
                                <span>تسجيل الخروج</span>
                            </a>
                        </SidebarMenuButton>
                     </SidebarMenuItem>
                 </SidebarMenu>
            </div>
        )}
      </SidebarFooter>
    </AppSidebar>
  );
}
