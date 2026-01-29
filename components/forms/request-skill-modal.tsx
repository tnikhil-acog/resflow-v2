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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/loading-spinner";

interface Skill {
  id: string;
  skill_name: string;
  department_name?: string;
}

interface RequestSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  onSuccess: () => void;
}

const proficiencyLevels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export function RequestSkillModal({
  open,
  onOpenChange,
  skill,
  onSuccess,
}: RequestSkillModalProps) {
  const [proficiencyLevel, setProficiencyLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setProficiencyLevel("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proficiencyLevel) {
      setError("Please select a proficiency level");
      return;
    }

    if (!skill?.id) {
      toast.error("Skill information is missing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");

      const response = await fetch("/api/skills/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skill_id: skill.id,
          proficiency_level: proficiencyLevel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to request skill");
      }

      toast.success("Skill request submitted for approval");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error requesting skill:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to request skill",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Skill</DialogTitle>
          <DialogDescription>
            Request to add this skill to your profile. It will require approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected Skill Display */}
          <div className="space-y-2">
            <Label>Skill</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{skill?.skill_name || "N/A"}</p>
              {skill?.department_name && (
                <p className="text-sm text-muted-foreground">
                  Department: {skill.department_name}
                </p>
              )}
            </div>
          </div>

          {/* Proficiency Level Selection */}
          <div className="space-y-2">
            <Label htmlFor="proficiency">
              Proficiency Level <span className="text-destructive">*</span>
            </Label>
            <Select
              value={proficiencyLevel}
              onValueChange={setProficiencyLevel}
              disabled={loading}
            >
              <SelectTrigger id="proficiency">
                <SelectValue placeholder="Select proficiency level" />
              </SelectTrigger>
              <SelectContent>
                {proficiencyLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
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
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
