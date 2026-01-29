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
import { ExitEmployeeModal } from "@/components/forms/exit-employee-modal";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, LogOut } from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  employee_role: string;
  employee_design: string;
  status: string;
  ldap_username?: string;
  employee_type?: string;
  working_location?: string;
  joined_on?: string;
  exited_on?: string;
}

interface Department {
  id: string;
  name: string;
}

export default function EmployeesListPage() {
  return (
    <ProtectedRoute>
      <EmployeesListContent />
    </ProtectedRoute>
  );
}

function EmployeesListContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(
    undefined,
  );
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);

  // Exit modal
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  const isHR = user?.employee_role === "hr_executive";

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, [statusFilter, departmentFilter, roleFilter]);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/departments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();

      if (statusFilter) params.append("status", statusFilter);
      if (departmentFilter) params.append("department_id", departmentFilter);
      if (roleFilter) params.append("role", roleFilter);

      const response = await fetch(`/api/employees?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const result = await response.json();
      setEmployees(result.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (employee: Employee) => {
    router.push(`/employees/${employee.id}`);
  };

  const handleEdit = (employee: Employee) => {
    router.push(`/employees/${employee.id}/edit`);
  };

  const handleExitClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setExitModalOpen(true);
  };

  const handleExitSuccess = () => {
    fetchEmployees();
  };

  // Column definitions based on role
  const getColumns = (): Column<Employee>[] => {
    const baseColumns: Column<Employee>[] = [
      {
        key: "employee_code",
        header: "Employee Code",
      },
      {
        key: "full_name",
        header: "Full Name",
      },
      {
        key: "email",
        header: "Email",
      },
      {
        key: "employee_role",
        header: "Role",
        render: (emp) => (
          <Badge variant="outline">
            {emp.employee_role.replace("_", " ").toUpperCase()}
          </Badge>
        ),
      },
      {
        key: "employee_design",
        header: "Designation",
      },
      {
        key: "status",
        header: "Status",
        render: (emp) => (
          <Badge variant={emp.status === "ACTIVE" ? "default" : "secondary"}>
            {emp.status}
          </Badge>
        ),
      },
    ];

    // Add HR-specific columns
    if (isHR) {
      return [
        ...baseColumns.slice(0, 1),
        {
          key: "ldap_username",
          header: "LDAP Username",
        },
        ...baseColumns.slice(1, 4),
        {
          key: "employee_type",
          header: "Type",
        },
        {
          key: "working_location",
          header: "Location",
        },
        ...baseColumns.slice(4),
        {
          key: "joined_on",
          header: "Joined On",
          render: (emp) =>
            emp.joined_on ? new Date(emp.joined_on).toLocaleDateString() : "-",
        },
      ];
    }

    return baseColumns;
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Employees</h1>
              <p className="text-muted-foreground mt-1">
                Manage employee profiles and information
              </p>
            </div>
            {isHR && (
              <Button onClick={() => router.push("/employees/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>
              View and manage all employees in the organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="EXITED">Exited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select
                  value={departmentFilter}
                  onValueChange={(value) =>
                    setDepartmentFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={roleFilter}
                  onValueChange={(value) =>
                    setRoleFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="project_manager">
                      Project Manager
                    </SelectItem>
                    <SelectItem value="hr_executive">HR Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Table */}
            <DataTable
              data={employees}
              columns={getColumns()}
              searchPlaceholder="Search by name, email, or code..."
              searchKeys={["full_name", "email", "employee_code"]}
              onRowClick={handleRowClick}
              actions={
                isHR
                  ? (emp) => (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(emp);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {emp.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExitClick(emp);
                            }}
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )
                  : undefined
              }
              emptyMessage="No employees found"
              pageSize={20}
            />
          </CardContent>
        </Card>
      </div>

      {/* Exit Employee Modal */}
      {selectedEmployee && (
        <ExitEmployeeModal
          open={exitModalOpen}
          onOpenChange={setExitModalOpen}
          employee={selectedEmployee}
          onSuccess={handleExitSuccess}
        />
      )}
    </div>
  );
}
