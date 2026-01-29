"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  client_id: string;
  client_name: string;
  project_manager_id: string;
  project_manager_name: string;
  status: string;
  started_on: string;
  closed_on?: string;
}

interface Manager {
  id: string;
  full_name: string;
}

export default function ProjectsListPage() {
  return (
    <ProtectedRoute>
      <ProjectsListContent />
    </ProtectedRoute>
  );
}

function ProjectsListContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [managerFilter, setManagerFilter] = useState<string | undefined>(
    undefined,
  );

  const isHR = user?.employee_role === "hr_executive";
  const isPM = user?.employee_role === "project_manager";

  useEffect(() => {
    fetchManagers();
    fetchProjects();
  }, [statusFilter, managerFilter]);

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const pmList = (data.employees || []).filter(
          (emp: any) => emp.employee_role === "project_manager",
        );
        setManagers(pmList);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();

      if (statusFilter) params.append("status", statusFilter);
      if (managerFilter) params.append("project_manager_id", managerFilter);

      const response = await fetch(`/api/projects?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const result = await response.json();
      setProjects(result.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (project: Project) => {
    router.push(`/projects/${project.id}`);
  };

  const handleEdit = (project: Project) => {
    router.push(`/projects/${project.id}/edit`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "DRAFT":
        return "secondary";
      case "ON_HOLD":
        return "outline";
      case "COMPLETED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const columns: Column<Project>[] = [
    {
      key: "project_code",
      header: "Project Code",
    },
    {
      key: "project_name",
      header: "Project Name",
    },
    {
      key: "client_name",
      header: "Client",
    },
    {
      key: "project_manager_name",
      header: "Project Manager",
    },
    {
      key: "status",
      header: "Status",
      render: (project) => (
        <Badge variant={getStatusColor(project.status) as any}>
          {project.status}
        </Badge>
      ),
    },
    {
      key: "started_on",
      header: "Started On",
      render: (project) => new Date(project.started_on).toLocaleDateString(),
    },
  ];

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Projects</h1>
              <p className="text-muted-foreground mt-1">
                Manage projects and track progress
              </p>
            </div>
            {isHR && (
              <Button onClick={() => router.push("/projects/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Projects List</CardTitle>
            <CardDescription>
              View and manage all projects in the organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Manager</label>
                <Select
                  value={managerFilter}
                  onValueChange={(value) =>
                    setManagerFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Table */}
            <DataTable
              data={projects}
              columns={columns}
              searchPlaceholder="Search projects..."
              searchKeys={["project_name", "project_code", "client_name"]}
              onRowClick={handleRowClick}
              actions={
                isHR || isPM
                  ? (project) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(project);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )
                  : undefined
              }
              emptyMessage="No projects found"
              pageSize={20}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
