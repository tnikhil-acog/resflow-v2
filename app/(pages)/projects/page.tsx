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
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { Plus, Pencil, Search, FileText } from "lucide-react";
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
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Metrics state
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [onHoldCount, setOnHoldCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [managerFilter, setManagerFilter] = useState<string | undefined>(
    undefined,
  );

  const isHR = user?.employee_role === "hr_executive";
  const isPM = user?.employee_role === "project_manager";

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, managerFilter, searchQuery]);

  useEffect(() => {
    fetchManagers();
    fetchProjectCounts();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [currentPage, statusFilter, managerFilter, searchQuery]);

  const fetchProjectCounts = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      // Fetch total count (all projects)
      const totalRes = await fetch(`/api/projects?limit=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (totalRes.ok) {
        const totalData = await totalRes.json();
        setTotalCount(totalData.total || 0);
      }

      // Fetch active count
      const activeRes = await fetch(`/api/projects?status=ACTIVE&limit=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveCount(activeData.total || 0);
      }

      // Fetch completed count
      const completedRes = await fetch(
        `/api/projects?status=COMPLETED&limit=0`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (completedRes.ok) {
        const completedData = await completedRes.json();
        setCompletedCount(completedData.total || 0);
      }

      // Fetch on hold count
      const onHoldRes = await fetch(`/api/projects?status=ON_HOLD&limit=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (onHoldRes.ok) {
        const onHoldData = await onHoldRes.json();
        setOnHoldCount(onHoldData.total || 0);
      }
    } catch (error) {
      console.error("Error fetching project counts:", error);
    }
  };

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/employees?limit=1000&role=PM", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setManagers(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const params = new URLSearchParams();

      if (statusFilter) params.append("status", statusFilter);
      if (managerFilter) params.append("project_manager_id", managerFilter);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", currentPage.toString());
      params.append("limit", pageSize.toString());

      const response = await fetch(`/api/projects?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const result = await response.json();
      setProjects(result.projects || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
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

  const handleRowClick = (project: Project) => {
    router.push(`/projects/${project.id}`);
  };

  const handleEdit = (project: Project) => {
    router.push(`/projects/${project.id}/edit`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "DRAFT":
        return "secondary";
      case "ON_HOLD":
        return "warning";
      case "COMPLETED":
        return "info";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
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

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="group relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-500/10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">All projects</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-lg transition-all">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In progress</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-l-4 border-l-violet-500 hover:shadow-lg transition-all">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-violet-500/10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Finished successfully
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-lg transition-all">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-500/10" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On Hold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onHoldCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Temporarily paused
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>Projects Directory</CardTitle>
          <CardDescription>
            View and manage all projects in the organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search */}
            <div className="md:col-span-5 space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} size="default">
                  Search
                </Button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3 space-y-2">
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

            {/* Project Manager Filter */}
            <div className="md:col-span-4 space-y-2">
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

          {/* Projects Table */}
          {projects.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10 text-muted-foreground" />}
              title="No projects found"
              description="Try adjusting your search criteria or create a new project"
            />
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">
                          Project Code
                        </TableHead>
                        <TableHead className="min-w-[200px]">
                          Project Name
                        </TableHead>
                        <TableHead className="min-w-[150px]">Client</TableHead>
                        <TableHead className="min-w-[150px]">
                          Project Manager
                        </TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">
                          Started On
                        </TableHead>
                        {(isHR || isPM) && (
                          <TableHead className="w-[80px]">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow
                          key={project.id}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => handleRowClick(project)}
                        >
                          <TableCell className="font-medium">
                            {project.project_code}
                          </TableCell>
                          <TableCell>{project.project_name}</TableCell>
                          <TableCell>{project.client_name}</TableCell>
                          <TableCell>{project.project_manager_name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusColor(project.status) as any}
                            >
                              {project.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {project.started_on
                              ? new Date(
                                  project.started_on,
                                ).toLocaleDateString()
                              : "Not set"}
                          </TableCell>
                          {(isHR || isPM) && (
                            <TableCell>
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
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <PaginationControls
                currentPage={currentPage}
                pageSize={pageSize}
                total={total}
                onPageChange={setCurrentPage}
                itemName="projects"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
