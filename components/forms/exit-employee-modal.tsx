"use client";

import { useState } from "react";
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

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
}

interface ExitEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
  onSuccess: () => void;
}

export function ExitEmployeeModal({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: ExitEmployeeModalProps) {
  const [exitDate, setExitDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!employee) {
      setError("No employee selected");
      return;
    }

    if (!exitDate) {
      setError("Exit date is required");
      return;
    }

    // Validate exit date is not in the future
    const selectedDate = new Date(exitDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      setError("Exit date cannot be in the future");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      const response = await fetch("/api/employees/exit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: employee.id,
          exited_on: exitDate,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to exit employee");
      }

      toast.success(`Employee ${employee.full_name} marked as exited`);
      onSuccess();
      onOpenChange(false);
      setExitDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Error exiting employee:", error);
      setError(
        error instanceof Error ? error.message : "Failed to exit employee",
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to exit employee",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Exit Employee</DialogTitle>
            <DialogDescription>
              {employee 
                ? `Mark ${employee.full_name} (${employee.employee_code}) as exited from the organization`
                : "No employee selected"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exitDate">
                Exit Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exitDate"
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                disabled={loading || !employee}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">
                This action will change the employee status to EXITED. The
                employee will no longer appear in active listings.
              </p>
            </div>
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
            <Button 
              type="submit" 
              variant="destructive" 
              disabled={loading || !employee}
            >
              {loading && <LoadingSpinner className="mr-2" />}
              Exit Employee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
