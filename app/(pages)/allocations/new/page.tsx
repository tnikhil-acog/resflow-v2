"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { AllocationFormFields } from "@/components/forms/allocation-form-fields";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  designation: string;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
}

interface AllocationFormData {
  employee_id: string | undefined;
  employee_ids: string[];
  project_id: string | undefined;
  allocation_percentage: string;
  role: string;
  start_date: string;
  end_date: string;
  is_billable: boolean;
  bulk_mode: boolean;
}

interface FormErrors {
  [key: string]: string | undefined;
  employee_id?: string;
  project_id?: string;
  allocation_percentage?: string;
  role?: string;
  start_date?: string;
  end_date?: string;
}

export default function CreateAllocationPage() {
  return (
    <ProtectedRoute requiredRoles={["hr_executive"]}>
      <CreateAllocationContent />
    </ProtectedRoute>
  );
}

function CreateAllocationContent() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [remainingCapacity, setRemainingCapacity] = useState<number | null>(
    null,
  );
  const [showCapacityWarning, setShowCapacityWarning] = useState(false);

  const [formData, setFormData] = useState<AllocationFormData>({
    employee_id: undefined,
    employee_ids: [],
    project_id: undefined,
    allocation_percentage: "",
    role: "",
    start_date: "",
    end_date: "",
    is_billable: false,
    bulk_mode: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchEmployees();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.employee_id) {
      fetchRemainingCapacity();
    } else {
      setRemainingCapacity(null);
      setShowCapacityWarning(false);
    }
  }, [formData.employee_id]);

  useEffect(() => {
    const percentage = parseFloat(formData.allocation_percentage);
    if (remainingCapacity !== null && percentage > 0) {
      setShowCapacityWarning(percentage > remainingCapacity);
    } else {
      setShowCapacityWarning(false);
    }
  }, [remainingCapacity, formData.allocation_percentage]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      // Fetch all active employees with high limit
      const response = await fetch("/api/employees?limit=999&status=ACTIVE", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(
          "Fetched employees for allocation:",
          data.employees?.length || 0,
        );
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      // Fetch all active projects with high limit
      const response = await fetch("/api/projects?limit=999", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only show ACTIVE projects (using uppercase to match enum)
        const activeProjects = (data.projects || []).filter(
          (p: Project) => p.status === "ACTIVE",
        );
        console.log(
          "Fetched active projects for allocation:",
          activeProjects.length,
        );
        setProjects(activeProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    }
  };

  const fetchRemainingCapacity = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/allocations?action=capacity&employee_id=${formData.employee_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setRemainingCapacity(data.remaining_capacity || 0);
      }
    } catch (error) {
      console.error("Error fetching capacity:", error);
    }
  };

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate employee selection based on mode
    if (formData.bulk_mode) {
      if (!formData.employee_ids || formData.employee_ids.length === 0) {
        newErrors.employee_id = "At least one employee is required";
      }
    } else {
      if (!formData.employee_id) {
        newErrors.employee_id = "Employee is required";
      }
    }

    if (!formData.project_id) newErrors.project_id = "Project is required";

    const percentage = parseFloat(formData.allocation_percentage);
    if (!formData.allocation_percentage || percentage <= 0) {
      newErrors.allocation_percentage =
        "Allocation percentage must be greater than 0";
    } else if (percentage > 100) {
      newErrors.allocation_percentage =
        "Allocation percentage cannot exceed 100%";
    }
    if (!formData.role || formData.role.trim().length === 0) {
      newErrors.role = "Role is required";
    }
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (formData.end_date && formData.start_date) {
      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        newErrors.end_date = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    const percentage = parseFloat(formData.allocation_percentage);

    // For single mode, check capacity
    if (
      !formData.bulk_mode &&
      remainingCapacity !== null &&
      percentage > remainingCapacity
    ) {
      toast.error(
        `Employee capacity exceeded. Available: ${remainingCapacity}%, Requested: ${percentage}%`,
      );
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      // Build payload based on mode
      const payload: any = {
        action: "create",
        project_id: formData.project_id,
        allocation_percentage: percentage,
        role: formData.role,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        billability: formData.is_billable,
      };

      // Add employee ID(s) based on mode
      if (formData.bulk_mode) {
        payload.emp_ids = formData.employee_ids;
      } else {
        payload.emp_id = formData.employee_id;
      }

      const response = await fetch("/api/allocations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create allocation");
      }

      // Handle bulk response
      if (formData.bulk_mode) {
        const successCount = data.created || 0;
        const failCount = data.failed || 0;

        if (failCount > 0) {
          toast.warning(
            `${successCount} allocation(s) created, ${failCount} failed. Check console for details.`,
            { duration: 5000 },
          );
          console.log("Failed allocations:", data.errors);
        } else {
          toast.success(`${successCount} allocation(s) created successfully!`);
        }
      } else {
        toast.success("Allocation created successfully");
      }

      router.push("/allocations");
    } catch (error) {
      console.error("Error creating allocation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create allocation",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold">Create Allocation</h1>
              <p className="text-muted-foreground mt-1">
                Assign an employee to a project with capacity management
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Allocation Details</CardTitle>
                <CardDescription>
                  Enter employee-project assignment information and allocation
                  percentage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <AllocationFormFields
                  isEdit={false}
                  formData={formData}
                  errors={errors as Record<string, string>}
                  onChange={handleChange}
                  employees={employees}
                  projects={projects}
                  disabled={loading}
                  remainingCapacity={remainingCapacity ?? undefined}
                  showCapacityWarning={showCapacityWarning}
                />

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Allocation"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
