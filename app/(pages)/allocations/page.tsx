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

interface Allocation {
  id: string;
  emp_id: string;
  employee_code: string;
  employee_name: string;
  project_id: string;
  project_code: string;
  project_name: string;
  allocation_percentage: number;
  role: string;
  is_billable: boolean;
  start_date: string;
  end_date?: string;
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

export default function AllocationsListPage() {
  return (
    <ProtectedRoute>
      <AllocationsListContent />
    </ProtectedRoute>
  );
}

function AllocationsListContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState<string | undefined>(
    undefined,
  );
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>(
    undefined,
  );
  const [activeOnlyFilter, setActiveOnlyFilter] = useState<string>("true");

  const isHR = user?.employee_role === "hr_executive";

  useEffect(() => {
    fetchEmployees();
    fetchProjects();
    fetchAllocations();
  }, [projectFilter, employeeFilter, activeOnlyFilter]);

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

  const fetchAllocations = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();

      if (projectFilter) params.append("project_id", projectFilter);
      if (employeeFilter) params.append("employee_id", employeeFilter);
      if (activeOnlyFilter) params.append("active_only", activeOnlyFilter);

      const response = await fetch(`/api/allocations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch allocations");
      }

      const data = await response.json();
      setAllocations(data.allocations || []);
    } catch (error) {
      console.error("Error fetching allocations:", error);
      toast.error("Failed to load allocations");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Allocation>[] = [
    {
      key: "employee_code",
      header: "Employee Code",
      render: (a) => a.employee_code,
    },
    {
      key: "employee_name",
      header: "Employee Name",
      render: (a) => a.employee_name,
    },
    {
      key: "project_code",
      header: "Project Code",
      render: (a) => a.project_code,
    },
    {
      key: "project_name",
      header: "Project Name",
      render: (a) => a.project_name,
    },
    { key: "role", header: "Role", render: (a) => a.role },
    {
      key: "allocation_percentage",
      header: "Allocation %",
      render: (a) => (
        <Badge variant="secondary">{a.allocation_percentage}%</Badge>
      ),
    },
    {
      key: "billable",
      header: "Billable",
      render: (a) => (
        <Badge variant={a.is_billable ? "default" : "outline"}>
          {a.is_billable ? "Yes" : "No"}
        </Badge>
      ),
    },
    // 'Critical' column removed (no longer supported by DB)
    {
      key: "dates",
      header: "Duration",
      render: (a) => (
        <div className="text-sm">
          <div>{new Date(a.start_date).toLocaleDateString()}</div>
          {a.end_date && (
            <div className="text-muted-foreground">
              to {new Date(a.end_date).toLocaleDateString()}
            </div>
          )}
        </div>
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
              <h1 className="text-3xl font-semibold">Resource Allocations</h1>
              <p className="text-muted-foreground mt-1">
                Manage employee-project assignments and capacity
              </p>
            </div>
            {isHR && (
              <Button onClick={() => router.push("/allocations/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Allocation
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Allocations List</CardTitle>
            <CardDescription>
              View and manage employee project allocations
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
                <label className="text-sm font-medium">Employee</label>
                <Select
                  value={employeeFilter}
                  onValueChange={(v) =>
                    setEmployeeFilter(v === "all" ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.employee_code} - {e.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={activeOnlyFilter}
                  onValueChange={setActiveOnlyFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All allocations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active Only</SelectItem>
                    <SelectItem value="false">All Allocations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={allocations}
              searchKeys={[
                "employee_name",
                "project_name",
                "employee_code",
                "project_code",
              ]}
              searchPlaceholder="Search by employee or project..."
              onRowClick={(a) => router.push(`/allocations/${a.id}`)}
              actions={
                isHR
                  ? (a) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/allocations/${a.id}`);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
