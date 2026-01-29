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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

export default function NewTaskPage() {
  return (
    <ProtectedRoute requiredRoles={["project_manager", "hr_executive"]}>
      <NewTaskContent />
    </ProtectedRoute>
  );
}

function NewTaskContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state - simplified to only required fields
  const [ownerId, setOwnerId] = useState("");
  const [description, setDescription] = useState("");
  const [dueOn, setDueOn] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      // Fetch employees
      const empResponse = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (empResponse.ok) {
        const empData = await empResponse.json();
        setEmployees(empData.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownerId || !description || !dueOn) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          owner_id: ownerId,
          description,
          due_on: dueOn,
          // entity_type and entity_id omitted - not needed for manual tasks
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create task");
      }

      const data = await response.json();
      toast.success("Task created successfully");
      router.push(`/tasks/${data.id}`);
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast.error(error.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingPage />;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/tasks")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold">Create New Task</h1>
              <p className="text-muted-foreground mt-1">
                Assign a new task to an employee
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Task Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Owner Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Task Owner <span className="text-destructive">*</span>
                  </label>
                  <Select value={ownerId} onValueChange={setOwnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.employee_code} - {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Employee who will be responsible for this task
                  </p>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Due Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={dueOn}
                    onChange={(e) => setDueOn(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Task completion deadline
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Task Description <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the task in detail... (e.g., Update your profile information, Complete training module, Review project document)"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Provide clear instructions for the task
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/tasks")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {submitting ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
