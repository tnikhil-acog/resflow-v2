"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function EditEmployeePage() {
  return (
    <ProtectedRoute requiredRoles={["hr_executive"]}>
      <EditEmployeeContent />
    </ProtectedRoute>
  );
}

function EditEmployeeContent() {
  const params = useParams();
  const employeeId = params.id as string;
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

  useEffect(() => {
    if (user && user.employee_role !== "hr_executive") {
      toast.error("Access denied: HR Executive only");
      router.push("/employees");
    }
  }, [user, router]);

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      // Fetch employee details
      const empResponse = await fetch(
        `/api/employees?action=get&id=${employeeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!empResponse.ok) {
        throw new Error("Failed to fetch employee details");
      }

      const empData = await empResponse.json();

      setFormData({
        employee_code: empData.employee_code || "",
        ldap_username: empData.ldap_username || "",
        full_name: empData.full_name || "",
        email: empData.email || "",
        gender: empData.gender || "",
        employee_type: empData.employee_type || "",
        employee_role: empData.employee_role || "",
        employee_design: empData.employee_design || "",
        working_location: empData.working_location || "",
        department_id: empData.department_id || "",
        reporting_manager_id: empData.reporting_manager_id || "",
        experience_years: empData.experience_years?.toString() || "",
        resume_url: empData.resume_url || "",
        college: empData.college || "",
        degree: empData.degree || "",
        educational_stream: empData.educational_stream || "",
        joined_on: empData.joined_on
          ? new Date(empData.joined_on).toISOString().split("T")[0]
          : "",
      });

      // Fetch departments
      const deptResponse = await fetch("/api/departments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartments(deptData.departments || []);
      }

      // Fetch managers
      const managersResponse = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (managersResponse.ok) {
        const managersData = await managersResponse.json();
        const managersList = (managersData.employees || []).filter(
          (emp: any) =>
            (emp.employee_role === "project_manager" ||
              emp.employee_role === "hr_executive") &&
            emp.id !== employeeId,
        );
        setManagers(managersList);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load employee details");
      router.push("/employees");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

      const payload: any = {
        id: employeeId,
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        employee_type: formData.employee_type,
        employee_role: formData.employee_role,
        employee_design: formData.employee_design.trim(),
        working_location: formData.working_location.trim(),
      };

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
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update employee");
      }

      toast.success(`Employee ${formData.full_name} updated successfully`);
      router.push(`/employees/${employeeId}`);
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update employee",
      );
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
            onClick={() => router.push(`/employees/${employeeId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employee Profile
          </Button>
          <h1 className="text-3xl font-semibold">Edit Employee</h1>
          <p className="text-muted-foreground mt-1">
            Update employee information
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>
              Update the details for {formData.full_name}. Employee code and
              LDAP username cannot be changed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <EmployeeFormFields
                isEdit={true}
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
                  onClick={() => router.push(`/employees/${employeeId}`)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <LoadingSpinner className="mr-2" />}
                  Update Employee
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
