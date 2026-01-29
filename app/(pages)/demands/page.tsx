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

interface Demand {
  id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  role_required: string;
  skill_names: string[];
  start_date: string;
  requested_by: string;
  requested_by_name: string;
  demand_status: string;
  created_at: string;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

export default function DemandsListPage() {
  return (
    <ProtectedRoute requiredRoles={["project_manager", "hr_executive"]}>
      <DemandsListContent />
    </ProtectedRoute>
  );
}

function DemandsListContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [requestedByFilter, setRequestedByFilter] = useState<
    string | undefined
  >(undefined);

  const isPM = user?.employee_role === "project_manager";
  const isHR = user?.employee_role === "hr_executive";
  const canCreate = isPM || isHR;

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
    fetchDemands();
  }, [projectFilter, statusFilter, requestedByFilter]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDemands = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();

      if (projectFilter) params.append("project_id", projectFilter);
      if (statusFilter) params.append("demand_status", statusFilter);
      if (requestedByFilter) params.append("requested_by", requestedByFilter);

      const response = await fetch(`/api/demands?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch demands");
      }

      const data = await response.json();
      setDemands(data.demands || []);
    } catch (error) {
      console.error("Error fetching demands:", error);
      toast.error("Failed to load demands");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return "secondary";
      case "FULFILLED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const columns: Column<Demand>[] = [
    {
      key: "project_code",
      header: "Project Code",
      render: (d) => d.project_code,
    },
    {
      key: "project_name",
      header: "Project Name",
      render: (d) => d.project_name,
    },
    {
      key: "role_required",
      header: "Role Required",
      render: (d) => d.role_required,
    },
    {
      key: "skills",
      header: "Skills Required",
      render: (d) => (
        <div className="flex flex-wrap gap-1">
          {d.skill_names && d.skill_names.length > 0 ? (
            d.skill_names.map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">No skills</span>
          )}
        </div>
      ),
    },
    {
      key: "start_date",
      header: "Start Date",
      render: (d) => new Date(d.start_date).toLocaleDateString(),
    },
    {
      key: "requested_by_name",
      header: "Requested By",
      render: (d) => d.requested_by_name,
    },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <Badge variant={getStatusBadgeVariant(d.demand_status)}>
          {d.demand_status}
        </Badge>
      ),
    },
  ];

  if (loading) return <LoadingPage />;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Resource Demands</h1>
              <p className="text-muted-foreground mt-1">
                {isPM
                  ? "Manage your project resource requests"
                  : "View and manage all resource demands"}
              </p>
            </div>
            {canCreate && (
              <Button onClick={() => router.push("/demands/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Demand
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Demands List</CardTitle>
            <CardDescription>
              {isPM
                ? "Your resource demands for managed projects"
                : "All resource demands across the organization"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                <Select
                  value={projectFilter}
                  onValueChange={(v) =>
                    setProjectFilter(v === "all" ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_code} - {p.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) =>
                    setStatusFilter(v === "all" ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="REQUESTED">Requested</SelectItem>
                    <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isHR && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Requested By</label>
                  <Select
                    value={requestedByFilter}
                    onValueChange={(v) =>
                      setRequestedByFilter(v === "all" ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All requesters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Requesters</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.employee_code} - {e.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DataTable
              columns={columns}
              data={demands}
              searchKeys={["project_name", "project_code", "role_required"]}
              searchPlaceholder="Search by project or role..."
              onRowClick={(d) => router.push(`/demands/${d.id}`)}
              actions={(d) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/demands/${d.id}`);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
