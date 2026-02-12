"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { navConfig } from "@/lib/nav";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  // Filter nav items based on user role
  const filterByRole = (items: typeof navConfig.main) => {
    if (!user) return [];
    return items.filter((item) => item.roles.includes(user.employee_role));
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const filteredMain = filterByRole(navConfig.main);
  const filteredWorkTracking = filterByRole(navConfig.workTracking);
  const filteredResources = filterByRole(navConfig.resources);
  const filteredGovernance = filterByRole(navConfig.governance);
  const filteredReports = filterByRole(navConfig.reports);
  const filteredSystem = filterByRole(navConfig.system);

  // Combine all items into a single flat list
  const allItems = [
    ...filteredWorkTracking.filter((item) => item.title === "Tasks"),
    ...filteredMain, // Analytics
    ...filteredWorkTracking.filter((item) => item.title !== "Tasks"),
    ...filteredResources,
    ...filteredGovernance,
    ...filteredReports,
    ...filteredSystem,
  ];

  // Show loading state
  if (isLoading) {
    return (
      <Sidebar className="border-r bg-sidebar">
        <SidebarHeader className="border-b border-sidebar-border px-6 py-5">
          <h2 className="text-xl font-bold text-sidebar-primary tracking-tight">
            ResFlow
          </h2>
        </SidebarHeader>
        <SidebarContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-6 py-5">
        <h2 className="text-xl font-bold text-sidebar-primary tracking-tight">
          ResFlow
        </h2>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Single flat menu with improved spacing */}
        <SidebarGroup>
          <SidebarMenu className="space-y-1">
            {allItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === item.url || pathname.startsWith(item.url + "/")
                  }
                  tooltip={item.title}
                  className="h-10 px-3"
                >
                  <Link href={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="h-10 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
