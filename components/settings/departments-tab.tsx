"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/data-table";
import { DepartmentFormModal } from "@/components/forms/department-form-modal";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";

interface Department {
  id: string;
  name: string;
  designations: string[];
  created_at: string;
}

interface DepartmentForModal {
  id?: string;
  name: string;
  designations: string;
}

export function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<DepartmentForModal | null>(null);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/departments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch departments");
      }

      const result = await response.json();
      setDepartments(result.departments || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleEdit = (department: Department) => {
    setSelectedDepartment({
      id: department.id,
      name: department.name,
      designations: department.designations.join(", "),
    });
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedDepartment(null);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    fetchDepartments();
  };

  const columns: Column<Department>[] = [
    {
      key: "name",
      header: "Department Name",
    },
    {
      key: "designations",
      header: "Designations",
      render: (dept) =>
        dept.designations && dept.designations.length > 0
          ? dept.designations.join(", ")
          : "No designations",
    },
    {
      key: "created_at",
      header: "Created At",
      render: (dept) => new Date(dept.created_at).toLocaleDateString(),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Departments</CardTitle>
            <CardDescription>
              Manage organizational departments and designations
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={departments}
            columns={columns}
            searchPlaceholder="Search departments..."
            searchKeys={["name"]}
            actions={(dept) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(dept);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            emptyMessage="No departments found"
          />
        </CardContent>
      </Card>

      <DepartmentFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        department={selectedDepartment}
        onSuccess={handleSuccess}
      />
    </>
  );
}
