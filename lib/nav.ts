import {
  CheckSquare,
  Briefcase,
  Users,
  CalendarRange,
  FileText,
  ShieldAlert,
  Settings,
  GitPullRequest,
  BarChart3,
  ScrollText,
  UserCog,
  UserCircle,
  TrendingUp,
  Calendar,
  Download,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: any;
  badge?: string; // Optional: show count (e.g., "5 pending")
  roles: string[]; // Roles that can access this page
};

export const navConfig = {
  main: [
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
      roles: ["employee", "project_manager", "hr_executive"],
    },
  ],

  workTracking: [
    {
      title: "Tasks",
      url: "/tasks",
      icon: CheckSquare,
      roles: ["employee", "project_manager", "hr_executive"],
    },
    {
      title: "Projects",
      url: "/projects",
      icon: Briefcase,
      roles: ["employee", "project_manager", "hr_executive"],
    },
    {
      title: "Logs",
      url: "/logs",
      icon: ScrollText,
      roles: ["employee", "project_manager", "hr_executive"],
    },
  ],

  resources: [
    {
      title: "Employees",
      url: "/employees",
      icon: Users,
      roles: ["employee", "project_manager", "hr_executive"],
    },
    {
      title: "Allocations",
      url: "/allocations",
      icon: CalendarRange,
      roles: ["hr_executive"], // Only HR can manage allocations
    },
    {
      title: "Demands",
      url: "/demands",
      icon: GitPullRequest,
      roles: ["project_manager", "hr_executive"], // PM can create, HR can manage
    },
    {
      title: "Skills",
      url: "/skills",
      icon: UserCog,
      roles: ["employee", "project_manager", "hr_executive"],
    },
  ],

  governance: [
    {
      title: "Approvals",
      url: "/approvals",
      icon: ShieldAlert,
      roles: ["hr_executive"], // Only HR can access approvals
    },
    {
      title: "Audit",
      url: "/audit",
      icon: FileText,
      roles: ["hr_executive"], // Only HR can access audit logs
    },
    {
      title: "Data Export",
      url: "/exports",
      icon: Download,
      roles: ["hr_executive"], // Only HR can export data
    },
  ],

  reports: [
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
      roles: ["employee", "project_manager", "hr_executive"],
    },
    {
      title: "Monthly Reports",
      url: "/reports/monthly",
      icon: Calendar,
      roles: ["project_manager", "hr_executive"],
    },
    {
      title: "Team Productivity",
      url: "/reports/productivity",
      icon: TrendingUp,
      roles: ["project_manager", "hr_executive"],
    },
  ],

  system: [
    {
      title: "Profile",
      url: "/profile",
      icon: UserCircle,
      roles: ["employee", "project_manager", "hr_executive"],
    },
  ],
};
