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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, Column } from "@/components/data-table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkLog {
  id: string;
  emp_id: string;
  employee_code: string;
  employee_name: string;
  project_id: string;
  project_code: string;
  project_name: string;
  log_date: string;
  hours: string;
  notes: string | null;
  locked: boolean;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

export default function LogsPage() {
  return (
    <ProtectedRoute>
      <LogsContent />
    </ProtectedRoute>
  );
}

function LogsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<WorkLog | null>(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");

  const isHR = user?.employee_role === "hr_executive";

  useEffect(() => {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);

    fetchProjects();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchLogs();
    }
  }, [startDate, endDate, selectedProject]);

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

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      if (selectedProject && selectedProject !== "ALL") {
        params.append("project_id", selectedProject);
      }

      const response = await fetch(`/api/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to load work logs");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!logToDelete) return;

    if (logToDelete.locked) {
      toast.error("Cannot delete locked logs (already submitted in a report)");
      setDeleteDialogOpen(false);
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/logs/${logToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete log");
      }

      toast.success("Work log deleted successfully");
      fetchLogs();
    } catch (error: any) {
      console.error("Error deleting log:", error);
      toast.error(error.message || "Failed to delete log");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setLogToDelete(null);
    }
  };

  const handleEdit = (log: WorkLog) => {
    if (log.locked) {
      toast.error("Cannot edit locked logs (already submitted in a report)");
      return;
    }
    router.push(`/logs/${log.id}`);
  };

  const openDeleteDialog = (log: WorkLog) => {
    setLogToDelete(log);
    setDeleteDialogOpen(true);
  };

  const columns: Column<WorkLog>[] = [
    {
      key: "log_date",
      header: "Date",
      render: (log) => new Date(log.log_date).toLocaleDateString(),
    },
    {
      key: "project",
      header: "Project",
      render: (log) => (
        <div>
          <div className="font-medium">{log.project_name}</div>
          <div className="text-sm text-muted-foreground">
            {log.project_code}
          </div>
        </div>
      ),
    },
  ];

  // Add employee column for HR
  if (isHR) {
    columns.push({
      key: "employee",
      header: "Employee",
      render: (log) => (
        <div>
          <div className="font-medium">{log.employee_name}</div>
          <div className="text-sm text-muted-foreground">
            {log.employee_code}
          </div>
        </div>
      ),
    });
  }

  columns.push(
    {
      key: "hours",
      header: "Hours",
      render: (log) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{log.hours}h</span>
        </div>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (log) => (
        <span className="text-sm line-clamp-2">
          {log.notes || <span className="text-muted-foreground">No notes</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (log) =>
        log.locked ? (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            🔒 Locked
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            Editable
          </span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (log) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(log)}
            disabled={log.locked}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {(user?.id === log.emp_id || isHR) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteDialog(log)}
              disabled={log.locked}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Work Logs</h1>
              <p className="text-muted-foreground mt-1">
                Track your daily project hours
              </p>
            </div>
            <Button asChild>
              <Link href="/logs/new">
                <Plus className="h-4 w-4 mr-2" />
                Log Work
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Filter Logs</CardTitle>
            <CardDescription>
              Filter work logs by date range and project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project (Optional)</Label>
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_code} - {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Work Logs</CardTitle>
              <CardDescription>
                {logs.length} log(s) found for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={logs}
                columns={columns}
                searchKeys={["project_name", "project_code", "notes"]}
                searchPlaceholder="Search by project or notes..."
                emptyMessage="No work logs found for the selected period"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Log?</AlertDialogTitle>
            <AlertDialogDescription>
              {logToDelete && (
                <>
                  Are you sure you want to delete the log for{" "}
                  <strong>{logToDelete.project_name}</strong> on{" "}
                  <strong>
                    {new Date(logToDelete.log_date).toLocaleDateString()}
                  </strong>{" "}
                  ({logToDelete.hours} hours)?
                  <br />
                  <br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Log"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
