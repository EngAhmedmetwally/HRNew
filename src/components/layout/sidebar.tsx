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

export function Sidebar() {
  return (
    <AppSidebar side="right" variant="sidebar" collapsible="icon">
      <SidebarHeader className="h-16 justify-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Building className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg text-foreground group-data-[collapsible=icon]:hidden">
            HR Pulse
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={{ children: "لوحة التحكم", side: "left" }}
                isActive
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>لوحة التحكم</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={{ children: "الموظفين", side: "left" }}
              >
                <Link href="/employees">
                  <Users />
                  <span>الموظفين</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={{ children: "سجل الحضور", side: "left" }}
              >
                <Link href="/attendance">
                  <ScanLine />
                  <span>سجل الحضور</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={{ children: "إنشاء QR Code", side: "left" }}
              >
                <Link href="/attendance/qr">
                  <QrCode />
                  <span>إنشاء QR Code</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={{ children: "مسح QR", side: "left" }}
              >
                <Link href="/scan">
                  <Camera />
                  <span>مسح QR</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={{ children: "الرواتب", side: "left" }}
              >
                <Link href="/payroll">
                  <CreditCard />
                  <span>الرواتب</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={{ children: "الإعدادات", side: "left" }}
            >
              <Link href="/settings">
                <Settings />
                <span>الإعدادات</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
    </AppSidebar>
  );
}
