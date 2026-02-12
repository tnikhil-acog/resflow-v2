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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/pagination-controls";
import { EmptyState } from "@/components/empty-state";
import { ProjectCombobox } from "@/components/project-combobox";
import { EmployeeCombobox } from "@/components/employee-combobox";
import { toast } from "sonner";
import { Plus, Pencil, Search, FileText } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  // Search and pagination state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [projectFilter, setProjectFilter] = useState<string | undefined>(
    undefined,
  );
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>(
    undefined,
  );
  const [activeOnlyFilter, setActiveOnlyFilter] = useState<string>("true");

  const isHR = user?.employee_role === "hr_executive";

  // Fetch allocations when filters, search or page changes
  useEffect(() => {
    fetchAllocations();
  }, [
    projectFilter,
    employeeFilter,
    activeOnlyFilter,
    searchQuery,
    currentPage,
  ]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();

      if (projectFilter) params.append("project_id", projectFilter);
      if (employeeFilter) params.append("employee_id", employeeFilter);
      if (activeOnlyFilter) params.append("active_only", activeOnlyFilter);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", currentPage.toString());
      params.append("limit", pageSize.toString());

      const response = await fetch(`/api/allocations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch allocations");
      }

      const data = await response.json();
      setAllocations(data.allocations || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching allocations:", error);
      toast.error("Failed to load allocations");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingPage />;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-6 md:px-8 py-6">
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

      <div className="container mx-auto px-6 md:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Allocations List</CardTitle>
            <CardDescription>
              View and manage employee project allocations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by employee, project, or role..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={handleSearch} size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>
                  <ProjectCombobox
                    value={projectFilter || "ALL"}
                    onValueChange={(v) =>
                      setProjectFilter(v === "ALL" ? undefined : v)
                    }
                    placeholder="All projects"
                    showAllOption={true}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Employee</label>
                  <EmployeeCombobox
                    value={employeeFilter}
                    onValueChange={(v) =>
                      setEmployeeFilter(v === "" ? undefined : v)
                    }
                    placeholder="All employees"
                  />
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
            </div>

            {/* Allocations Table */}
            {allocations.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-10 w-10 text-muted-foreground" />}
                title="No allocations found"
                description="Try adjusting your search criteria or create a new allocation"
              />
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Code</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Project Code</TableHead>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Allocation %</TableHead>
                        <TableHead>Billable</TableHead>
                        <TableHead>Duration</TableHead>
                        {isHR && (
                          <TableHead className="w-12.5">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations.map((allocation) => (
                        <TableRow
                          key={allocation.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(`/allocations/${allocation.id}`)
                          }
                        >
                          <TableCell>{allocation.employee_code}</TableCell>
                          <TableCell>{allocation.employee_name}</TableCell>
                          <TableCell>{allocation.project_code}</TableCell>
                          <TableCell>{allocation.project_name}</TableCell>
                          <TableCell>{allocation.role}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {allocation.allocation_percentage}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                allocation.is_billable ? "default" : "outline"
                              }
                            >
                              {allocation.is_billable ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>
                                {new Date(
                                  allocation.start_date,
                                ).toLocaleDateString()}
                              </div>
                              {allocation.end_date && (
                                <div className="text-muted-foreground text-xs">
                                  to{" "}
                                  {new Date(
                                    allocation.end_date,
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          {isHR && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/allocations/${allocation.id}`);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setCurrentPage}
                  itemName="allocations"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
