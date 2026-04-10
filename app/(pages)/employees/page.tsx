"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExitEmployeeModal } from "@/components/forms/exit-employee-modal";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/pagination-controls";
import { toast } from "sonner";
import { Plus, Pencil, LogOut, Search, Users } from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";
import type { Department, Employee } from "@/lib/types";

const PM_TEAM_FILTER_VALUE = "__my_team__";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

export default function EmployeesListPage() {
  return <EmployeesListContent />;
}

function EmployeesListContent() {
  const router = useRouter();
  const { user, authenticatedFetch } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<
    { id: string; project_name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>(""); // Separate input state

  // Metrics state
  const [activeCount, setActiveCount] = useState(0);
  const [totalEmployeesCount, setTotalEmployeesCount] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(
    undefined,
  );
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [projectFilter, setProjectFilter] = useState<string | undefined>(
    undefined,
  );
  const [pmFilter, setPmFilter] = useState<string | undefined>(undefined);

  // Exit modal
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  const isHR = user?.employee_role === "hr_executive";
  const isPM = user?.employee_role === "project_manager";
  const isEmployee = user?.employee_role === "employee";

  // Fetch when filters or pagination changes
  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [statusFilter, departmentFilter, roleFilter, searchQuery, projectFilter, pmFilter]);

  useEffect(() => {
    fetchDepartments();
    fetchActiveCount();
    fetchTotalCount();
    if (isPM) {
      fetchPMProjects();
    }
    if (isHR) {
      fetchProjectManagers();
    }
  }, []);

  // Fetch employees whenever page, filters, or search changes
  useEffect(() => {
    fetchEmployees();
  }, [
    currentPage,
    statusFilter,
    departmentFilter,
    roleFilter,
    searchQuery,
    projectFilter,
    pmFilter,
  ]);

  const fetchActiveCount = async () => {
    try {
      const response = await authenticatedFetch("/api/employees?status=ACTIVE&limit=0", {
      });

      if (response.ok) {
        const data = await response.json();
        setActiveCount(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching active count:", error);
    }
  };

  const fetchTotalCount = async () => {
    try {
      const response = await authenticatedFetch("/api/employees?limit=0", {
      });

      if (response.ok) {
        const data = await response.json();
        setTotalEmployeesCount(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching total count:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await authenticatedFetch("/api/departments", {
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);

  const fetchProjectManagers = async () => {
    try {
      const response = await authenticatedFetch("/api/employees?role=PM&status=ACTIVE&limit=200");
      if (response.ok) {
        const data = await response.json();
        setManagers(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching project managers:", error);
    }
  };

  const fetchPMProjects = async () => {
    try {
      const response = await authenticatedFetch(
        `/api/projects?project_manager_id=${user?.id}&limit=1000`,
        {
        },
      );

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
      setLoading(true);

      // For PMs, project filter applies only when a concrete project is selected.
      if (projectFilter && isPM && projectFilter !== PM_TEAM_FILTER_VALUE) {
        const allocResponse = await authenticatedFetch(
          `/api/allocations?project_id=${projectFilter}&limit=1000`,
          {
          },
        );

        if (allocResponse.ok) {
          const allocData = await allocResponse.json();
          const allocations = allocData.allocations || [];

          // Get unique employee IDs from allocations
          const employeeIds = [
            ...new Set(allocations.map((a: any) => a.emp_id)),
          ];

          // Fetch employee details for these IDs
          if (employeeIds.length > 0) {
            const employeeResponses = await Promise.all(
              employeeIds.map((id) =>
                authenticatedFetch(`/api/employees?action=get&id=${id}`, {}),
              ),
            );

            const employeesData = await Promise.all(
              employeeResponses.map(async (response) => {
                if (!response.ok) {
                  return null;
                }
                return response.json();
              }),
            );

            let filteredEmps = employeesData.filter(
              (emp): emp is Employee => Boolean(emp && emp.id),
            );

            // Apply additional filters
            if (statusFilter) {
              filteredEmps = filteredEmps.filter(
                (e) => e.status === statusFilter,
              );
            }
            if (departmentFilter) {
              filteredEmps = filteredEmps.filter(
                (e) => e.department_id === departmentFilter,
              );
            }
            if (roleFilter) {
              filteredEmps = filteredEmps.filter(
                (e) => e.employee_role === roleFilter,
              );
            }
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              filteredEmps = filteredEmps.filter(
                (e) =>
                  e.full_name?.toLowerCase().includes(query) ||
                  e.email?.toLowerCase().includes(query) ||
                  e.employee_code?.toLowerCase().includes(query),
              );
            }

            setEmployees(filteredEmps);
            setTotal(filteredEmps.length);
          } else {
            setEmployees([]);
            setTotal(0);
          }
        }
      } else {
        // Normal employee fetch without project filter
        const params = new URLSearchParams();

        if (statusFilter) params.append("status", statusFilter);
        if (departmentFilter) params.append("department_id", departmentFilter);
        if (roleFilter) params.append("role", roleFilter);
        if (searchQuery) params.append("search", searchQuery);
        if (isPM && projectFilter === PM_TEAM_FILTER_VALUE) {
          params.append("pm_scope", "my_team");
        }
        if (pmFilter) params.append("pm_id", pmFilter);
        params.append("page", currentPage.toString());
        params.append("limit", pageSize.toString());

        const response = await authenticatedFetch(`/api/employees?${params.toString()}`, {
        });

        if (!response.ok) {
          throw new Error("Failed to fetch employees");
        }

        const result = await response.json();
        setEmployees(result.employees || []);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (
    filter: "status" | "department" | "role",
    value: string | undefined,
  ) => {
    if (filter === "status") {
      setStatusFilter(value || "ACTIVE");
    } else if (filter === "department") {
      setDepartmentFilter(value);
    } else if (filter === "role") {
      setRoleFilter(value);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleRowClick = (employee: Employee) => {
    // Route to selected employee detail; detail page handles permission checks.
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
        render: (emp: Employee) => (
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
        key: "department_name",
        header: "Department",
        render: (emp: Employee) => (
          <span className="text-sm">{emp.department_name || "N/A"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (emp: Employee) => (
          <Badge variant={emp.status === "ACTIVE" ? "success" : "secondary"}>
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
          render: (emp: Employee) =>
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
    <div className="space-y-6">
      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="group relative overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-all">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployeesCount}</div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-lg transition-all">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-lg transition-all">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-500/10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-l-4 border-l-violet-500 hover:shadow-lg transition-all">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-violet-500/10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Directory
              </CardTitle>
              <CardDescription>
                View and manage all employees in the organization
              </CardDescription>
            </div>
            {isHR && (
              <Button
                onClick={() => router.push("/employees/new")}
                className="whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Search</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, code..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} variant="default">
                  Search
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
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
                value={departmentFilter || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "department",
                    value === "all" ? undefined : value,
                  )
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
                value={roleFilter || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "role",
                    value === "all" ? undefined : value,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="EMP">Employee</SelectItem>
                  <SelectItem value="PM">Project Manager</SelectItem>
                  <SelectItem value="HR">HR Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isHR && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Manager</label>
                <Select
                  value={pmFilter || "all"}
                  onValueChange={(value) =>
                    setPmFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managers.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isPM && (
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-medium">Project Scope</label>
                <Select
                  value={projectFilter || "all"}
                  onValueChange={(value) =>
                    setProjectFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value={PM_TEAM_FILTER_VALUE}>My Team</SelectItem>
                    {projects.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Data Table with Server-Side Pagination */}
          {loading ? (
            <div className="text-center py-8">
              <LoadingPage />
            </div>
          ) : (
            <>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {getColumns().map((column) => (
                        <TableHead key={column.key}>{column.header}</TableHead>
                      ))}
                      {isHR && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={getColumns().length + (isHR ? 1 : 0)}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No employees found
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((emp) => (
                        <TableRow
                          key={emp.id}
                          onClick={() => handleRowClick(emp)}
                          className="cursor-pointer"
                        >
                          {getColumns().map((column) => (
                            <TableCell key={column.key}>
                              {column.render
                                ? column.render(emp)
                                : (emp[column.key as keyof Employee] ?? "N/A")}
                            </TableCell>
                          ))}
                          {isHR && (
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
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
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <PaginationControls
                currentPage={currentPage}
                pageSize={pageSize}
                total={total}
                onPageChange={setCurrentPage}
                itemName="employees"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Exit Employee Modal */}
      {selectedEmployee && (
        <ExitEmployeeModal
          open={exitModalOpen}
          onOpenChange={setExitModalOpen}
          employee={selectedEmployee || undefined}
          onSuccess={handleExitSuccess}
        />
      )}
    </div>
  );
}
