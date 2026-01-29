"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Trash2,
  Calendar,
  User,
  FileText,
  Tag,
} from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";
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

interface Task {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_code: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  status: string;
  due_on: string;
  assigned_by: string | null;
  assigned_by_name: string;
  created_at: string;
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/tasks?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch task");
      }

      const data = await response.json();
      setTask(data.task);
    } catch (error) {
      console.error("Error fetching task:", error);
      toast.error("Failed to load task details");
      router.push("/tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!task) return;

    setCompleting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/tasks/complete", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: task.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete task");
      }

      toast.success("Task marked as completed");
      fetchTask(); // Refresh task data
    } catch (error: any) {
      console.error("Error completing task:", error);
      toast.error(error.message || "Failed to complete task");
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/tasks?id=${task.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete task");
      }

      toast.success("Task deleted successfully");
      router.push("/tasks");
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error(error.message || "Failed to delete task");
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DUE":
        return (
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-700 border-orange-200"
          >
            Due
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 border-green-200"
          >
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEntityTypeBadge = (entityType: string | null) => {
    if (!entityType) return null;
    return (
      <Badge variant="outline" className="font-mono">
        {entityType.replace(/_/g, " ")}
      </Badge>
    );
  };

  const canComplete =
    task &&
    task.status === "DUE" &&
    (user?.employee_role === "hr_executive" || task.owner_id === user?.id);

  const canDelete = user?.employee_role === "hr_executive";

  if (loading) return <LoadingPage />;

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Task Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The task you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push("/tasks")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/tasks")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-semibold">Task Details</h1>
                <p className="text-muted-foreground mt-1">
                  View and manage task information
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canComplete && (
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {completing ? "Marking..." : "Mark Complete"}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Task Details</CardTitle>
                  <CardDescription className="mt-1">
                    Complete task information
                  </CardDescription>
                </div>
                {getStatusBadge(task.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Description - Full Width */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Description
                  </label>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {task.description || "No description provided"}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      Task Owner
                    </label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="text-sm font-medium">
                        {task.owner_code} - {task.owner_name}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Due Date
                    </label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="text-sm font-medium">
                        {task.due_on
                          ? new Date(task.due_on).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "No due date"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      Assigned By
                    </label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="text-sm font-medium">
                        {task.assigned_by_name || "System"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created At
                    </label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="text-sm font-medium">
                        {new Date(task.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Entity Section - Only show if entity_type and entity_id exist */}
                {task.entity_type && task.entity_id && (
                  <>
                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                          <Tag className="h-4 w-4" />
                          Entity Type
                        </label>
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          {getEntityTypeBadge(task.entity_type)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Entity ID
                        </label>
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          <p className="text-xs font-mono text-muted-foreground break-all">
                            {task.entity_id}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this task. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
