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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/loading-spinner";

interface Department {
  id: string;
  name: string;
}

interface Skill {
  skill_id: string;
  skill_name: string;
  department_id?: string;
  department_name?: string;
}

interface EditSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  departments: Department[];
  onSuccess: () => void;
}

export function EditSkillModal({
  open,
  onOpenChange,
  skill,
  departments,
  onSuccess,
}: EditSkillModalProps) {
  const [skillName, setSkillName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens/closes or skill changes
  useEffect(() => {
    if (open && skill) {
      setSkillName(skill.skill_name);
      setDepartmentId(skill.department_id ?? "");
      setError("");
    } else {
      setSkillName("");
      setDepartmentId("");
      setError("");
    }
  }, [open, skill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!skillName.trim()) {
      setError("Skill name is required");
      return;
    }

    if (!departmentId) {
      setError("Please select a department");
      return;
    }

    if (!skill?.skill_id) {
      toast.error("Skill information is missing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");

      const response = await fetch("/api/skills", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skill_id: skill.skill_id,
          skill_name: skillName.trim(),
          department_id: departmentId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update skill");
      }

      toast.success("Skill updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating skill:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update skill",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Skill</DialogTitle>
          <DialogDescription>
            Update the skill name or department.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill_name">
              Skill Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="skill_name"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g., React, Node.js"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">
              Department <span className="text-destructive">*</span>
            </Label>
            <Select
              value={departmentId}
              onValueChange={setDepartmentId}
              disabled={loading}
            >
              <SelectTrigger id="department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

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
              {loading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                "Update Skill"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
