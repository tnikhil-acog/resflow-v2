"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  Home,
  Users,
  Briefcase,
  FileText,
  Clock,
  CheckSquare,
  BarChart3,
  User,
  Shield,
  Zap,
  TrendingUp,
  ShieldAlert,
  Download,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface ModernLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

const navigationItems = [
  {
    name: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    roles: ["employee", "project_manager", "hr_executive"],
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: Home,
    roles: ["employee", "project_manager", "hr_executive"],
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Briefcase,
    roles: ["employee", "project_manager", "hr_executive"],
  },
  {
    name: "Work Logs",
    href: "/logs",
    icon: Clock,
    roles: ["employee", "project_manager", "hr_executive"],
  },
  {
    name: "Employees",
    href: "/employees",
    icon: Users,
    roles: ["employee", "project_manager", "hr_executive"],
  },
  {
    name: "Allocations",
    href: "/allocations",
    icon: TrendingUp,
    roles: ["project_manager", "hr_executive"],
  },
  {
    name: "Demands",
    href: "/demands",
    icon: Zap,
    roles: ["project_manager", "hr_executive"],
  },
  {
    name: "Skills",
    href: "/skills",
    icon: Shield,
    roles: ["employee", "project_manager", "hr_executive"],
  },
  {
    name: "Approvals",
    href: "/approvals",
    icon: ShieldAlert,
    roles: ["hr_executive"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["project_manager", "hr_executive"],
  },
  {
    name: "Audit",
    href: "/audit",
    icon: FileText,
    roles: ["hr_executive"],
  },
  {
    name: "Data Export",
    href: "/exports",
    icon: Download,
    roles: ["hr_executive"],
  },
  {
    name: "Profile",
    href: "/profile",
    icon: User,
    roles: ["employee", "project_manager", "hr_executive"],
  },
];

export function ModernLayout({
  children,
  title,
  breadcrumbs,
}: ModernLayoutProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

  const userRole = user?.employee_role || "employee";

  // Fetch entity names based on pathname
  useEffect(() => {
    const fetchEntityNames = async () => {
      const paths = pathname.split("/").filter(Boolean);
      const names: Record<string, string> = {};

      // Check for specific patterns and fetch names
      if (paths.length >= 2) {
        const entityType = paths[0];
        const entityId = paths[1];

        // Skip if it's an action like "new", "edit", etc.
        if (["new", "edit", "phases"].includes(entityId)) {
          return;
        }

        const token = localStorage.getItem("auth_token");
        if (!token) return;

        try {
          let url = "";
          let nameField = "";

          switch (entityType) {
            case "projects":
              url = `/api/projects?action=get&id=${entityId}`;
              nameField = "project_name";
              break;
            case "employees":
              url = `/api/employees?action=get&id=${entityId}`;
              nameField = "full_name";
              break;
            case "allocations":
              if (entityId && entityId !== "new") {
                url = `/api/allocations?id=${entityId}`;
                nameField = "employee_name";
              }
              break;
            case "demands":
              url = `/api/demands?id=${entityId}`;
              nameField = "demand_title";
              break;
            case "skills":
              url = `/api/skills?id=${entityId}`;
              nameField = "skill_name";
              break;
            case "tasks":
              url = `/api/tasks/${entityId}`;
              nameField = "description";
              break;
            default:
              return;
          }

          if (url) {
            const response = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
              const data = await response.json();

              // Extract name value based on response structure
              let nameValue = "";

              // For employees with action=get, response is direct object
              if (entityType === "employees" && data[nameField]) {
                nameValue = data[nameField];
              }
              // For projects with action=get, response is direct object
              else if (entityType === "projects" && data[nameField]) {
                nameValue = data[nameField];
              }
              // First try direct field access
              else if (data[nameField] && typeof data[nameField] === "string") {
                nameValue = data[nameField];
              }
              // Then try array properties (allocations, tasks, skills, demands, etc.)
              else if (
                data.allocations &&
                Array.isArray(data.allocations) &&
                data.allocations[0]
              ) {
                nameValue = data.allocations[0][nameField];
              } else if (
                data.tasks &&
                Array.isArray(data.tasks) &&
                data.tasks[0]
              ) {
                nameValue = data.tasks[0][nameField];
              } else if (
                data.skills &&
                Array.isArray(data.skills) &&
                data.skills[0]
              ) {
                nameValue = data.skills[0][nameField];
              } else if (
                data.demands &&
                Array.isArray(data.demands) &&
                data.demands[0]
              ) {
                nameValue = data.demands[0][nameField];
              }
              // If data is an array itself
              else if (Array.isArray(data) && data[0]) {
                nameValue = data[0][nameField];
              }

              // Only store if we got a valid string name
              if (nameValue && typeof nameValue === "string") {
                names[`${entityType}-${entityId}`] = nameValue;
                setEntityNames(names);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching entity name:", error);
        }
      }
    };

    fetchEntityNames();
  }, [pathname]);

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter((item) =>
    item.roles.includes(userRole),
  );

  // Generate automatic breadcrumbs from pathname if not provided
  const generateBreadcrumbs = () => {
    if (breadcrumbs) return breadcrumbs;

    const paths = pathname.split("/").filter(Boolean);
    if (paths.length === 0 || paths[0] === "tasks") return [];

    const crumbs: { label: string; href?: string }[] = [];
    let currentPath = "";

    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const isLast = index === paths.length - 1;

      // Check if this is an ID that we fetched a name for
      if (index === 1 && !["new", "edit", "phases"].includes(path)) {
        const prevPath = paths[0];
        const entityKey = `${prevPath}-${path}`;
        const fetchedName = entityNames[entityKey];

        if (fetchedName) {
          crumbs.push({
            label: fetchedName,
            href: isLast ? undefined : currentPath,
          });
          return;
        }
      }

      // Format label: capitalize and replace hyphens with spaces
      const label = path
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      crumbs.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    });

    return crumbs;
  };

  const displayBreadcrumbs = generateBreadcrumbs();

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 flex-col border-r bg-card fixed h-screen">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent tracking-tight">
            ResFlow
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <div className="space-y-1 px-3">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center border-b px-6">
              <h1 className="text-xl font-bold text-primary">ResFlow</h1>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
              <div className="space-y-1 px-3">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:ml-64 xl:ml-72 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              {/* Breadcrumbs */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <Link
                  href="/tasks"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Home
                </Link>
                {displayBreadcrumbs?.map((crumb, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 rotate-90 text-muted-foreground" />
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium">
                        {crumb.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {getInitials(user?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium">
                      {user?.full_name || "User"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium">
                      {user?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {userRole.replace("_", " ")}
                    </p>
                  </div>
                  <Separator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {displayBreadcrumbs && displayBreadcrumbs.length > 0 && (
                <p className="text-muted-foreground mt-1">
                  {displayBreadcrumbs[displayBreadcrumbs.length - 1]?.label}
                </p>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
