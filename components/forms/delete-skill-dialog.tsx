"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/loading-spinner";

interface Skill {
  skill_id: string;
  skill_name: string;
}

interface DeleteSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  onSuccess: () => void;
}

export function DeleteSkillDialog({
  open,
  onOpenChange,
  skill,
  onSuccess,
}: DeleteSkillDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!skill?.skill_id) {
      toast.error("Skill information is missing");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      const response = await fetch("/api/skills", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skill_id: skill.skill_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete skill");
      }

      toast.success("Skill deleted successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting skill:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete skill",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the skill{" "}
            <span className="font-semibold">{skill?.skill_name}</span>. This
            action cannot be undone.
            {"\n\n"}
            Note: Skills assigned to employees cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
