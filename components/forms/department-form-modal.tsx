"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/loading-spinner";

interface Department {
  id?: string;
  name: string;
  designations: string;
}

interface DepartmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
  onSuccess: () => void;
}

export function DepartmentFormModal({
  open,
  onOpenChange,
  department,
  onSuccess,
}: DepartmentFormModalProps) {
  const [name, setName] = useState("");
  const [designations, setDesignations] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!department?.id;

  // Initialize form when department changes
  useEffect(() => {
    if (department) {
      setName(department.name || "");
      setDesignations(department.designations || "");
    } else {
      setName("");
      setDesignations("");
    }
    setErrors({});
  }, [department, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Department name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      const payload: any = {
        name: name.trim(),
        designations: designations
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d),
      };

      if (isEdit && department?.id) {
        payload.id = department.id;
      }

      const response = await fetch("/api/departments", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save department");
      }

      toast.success(
        isEdit
          ? "Department updated successfully"
          : "Department created successfully",
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving department:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save department",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Department" : "Create Department"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the department information below."
              : "Add a new department to the organization."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Department Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Engineering, HR, Sales"
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="designations">Designations</Label>
            <Input
              id="designations"
              value={designations}
              onChange={(e) => setDesignations(e.target.value)}
              placeholder="e.g., Manager, Senior Engineer, Associate (comma-separated)"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter multiple designations separated by commas
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <LoadingSpinner className="mr-2" />}
              {isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
