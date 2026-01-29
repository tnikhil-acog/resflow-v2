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
import { EmployeeFormFields } from "@/components/forms/employee-form-fields";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { LoadingPage, LoadingSpinner } from "@/components/loading-spinner";

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  full_name: string;
}

interface EmployeeFormData {
  employee_code: string;
  ldap_username: string;
  full_name: string;
  email: string;
  gender?: string;
  employee_type: string;
  employee_role: string;
  employee_design: string;
  working_location: string;
  department_id: string;
  reporting_manager_id?: string;
  experience_years?: string;
  resume_url?: string;
  college?: string;
  degree?: string;
  educational_stream?: string;
  joined_on: string;
}

export default function NewEmployeePage() {
  return (
    <ProtectedRoute requiredRoles={["hr_executive"]}>
      <NewEmployeeContent />
    </ProtectedRoute>
  );
}

function NewEmployeeContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<EmployeeFormData>({
    employee_code: "",
    ldap_username: "",
    full_name: "",
    email: "",
    gender: "",
    employee_type: "",
    employee_role: "",
    employee_design: "",
    working_location: "",
    department_id: "",
    reporting_manager_id: "",
    experience_years: "",
    resume_url: "",
    college: "",
    degree: "",
    educational_stream: "",
    joined_on: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user is HR
  useEffect(() => {
    if (user && user.employee_role !== "hr_executive") {
      toast.error("Access denied: HR Executive only");
      router.push("/employees");
    }
  }, [user, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      // Fetch departments
      const deptResponse = await fetch("/api/departments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartments(deptData.departments || []);
      }

      // Fetch managers (project managers and HR executives)
      const empResponse = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (empResponse.ok) {
        const empData = await empResponse.json();
        const managersList = (empData.employees || []).filter(
          (emp: any) =>
            emp.employee_role === "project_manager" ||
            emp.employee_role === "hr_executive",
        );
        setManagers(managersList);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_code.trim()) {
      newErrors.employee_code = "Employee code is required";
    }

    if (!formData.ldap_username.trim()) {
      newErrors.ldap_username = "LDAP username is required";
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.employee_type) {
      newErrors.employee_type = "Employee type is required";
    }

    if (!formData.employee_role) {
      newErrors.employee_role = "Employee role is required";
    }

    if (!formData.employee_design.trim()) {
      newErrors.employee_design = "Designation is required";
    }

    if (!formData.working_location.trim()) {
      newErrors.working_location = "Working location is required";
    }

    if (!formData.joined_on) {
      newErrors.joined_on = "Joining date is required";
    } else {
      const joinedDate = new Date(formData.joined_on);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (joinedDate > today) {
        newErrors.joined_on = "Joining date cannot be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");

      // Prepare data
      const payload: any = {
        employee_code: formData.employee_code.trim(),
        ldap_username: formData.ldap_username.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        employee_type: formData.employee_type,
        employee_role: formData.employee_role,
        employee_design: formData.employee_design.trim(),
        working_location: formData.working_location.trim(),
        joined_on: formData.joined_on,
      };

      // Add optional fields if provided
      if (formData.gender) payload.gender = formData.gender;
      if (formData.department_id)
        payload.department_id = formData.department_id;
      if (formData.reporting_manager_id)
        payload.reporting_manager_id = formData.reporting_manager_id;
      if (formData.experience_years)
        payload.experience_years = parseFloat(formData.experience_years);
      if (formData.resume_url) payload.resume_url = formData.resume_url.trim();
      if (formData.college) payload.college = formData.college.trim();
      if (formData.degree) payload.degree = formData.degree.trim();
      if (formData.educational_stream)
        payload.educational_stream = formData.educational_stream.trim();

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create employee");
      }

      toast.success(`Employee ${formData.full_name} created successfully`);
      router.push(`/employees/${result.id}`);
    } catch (error) {
      console.error("Error creating employee:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create employee";
      toast.error(errorMessage);

      // Check for unique constraint errors
      if (errorMessage.includes("employee_code")) {
        setErrors((prev) => ({
          ...prev,
          employee_code: "Employee code already exists",
        }));
      }
      if (errorMessage.includes("ldap_username")) {
        setErrors((prev) => ({
          ...prev,
          ldap_username: "LDAP username already exists",
        }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/employees")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
          <h1 className="text-3xl font-semibold">Add New Employee</h1>
          <p className="text-muted-foreground mt-1">
            Create a new employee record in the system
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>
              Enter the details for the new employee. Fields marked with * are
              required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <EmployeeFormFields
                isEdit={false}
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
                departments={departments}
                managers={managers}
                disabled={submitting}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/employees")}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <LoadingSpinner className="mr-2" />}
                  Create Employee
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
