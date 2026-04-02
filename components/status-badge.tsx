import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "task" | "project" | "employee" | "demand" | "report" | "allocation";
  className?: string;
}

export function StatusBadge({
  status,
  type = "task",
  className,
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    const normalizedStatus = status.toUpperCase().replace(/\s+/g, "_");

    // Task statuses
    if (type === "task") {
      switch (normalizedStatus) {
        case "DUE":
          return {
            color: "bg-yellow-100 text-yellow-800 border-yellow-300",
            label: "Due",
          };
        case "COMPLETED":
          return {
            color: "bg-green-100 text-green-800 border-green-300",
            label: "Completed",
          };
        default:
          return {
            color: "bg-gray-100 text-gray-800 border-gray-300",
            label: status,
          };
      }
    }

    // Project statuses
    if (type === "project") {
      switch (normalizedStatus) {
        case "DRAFT":
          return {
            color: "bg-gray-100 text-gray-800 border-gray-300",
            label: "Draft",
          };
        case "ACTIVE":
          return {
            color: "bg-green-100 text-green-800 border-green-300",
            label: "Active",
          };
        case "ON_HOLD":
          return {
            color: "bg-yellow-100 text-yellow-800 border-yellow-300",
            label: "On Hold",
          };
        case "COMPLETED":
          return {
            color: "bg-blue-100 text-blue-800 border-blue-300",
            label: "Completed",
          };
        case "CANCELLED":
          return {
            color: "bg-red-100 text-red-800 border-red-300",
            label: "Cancelled",
          };
        default:
          return {
            color: "bg-gray-100 text-gray-800 border-gray-300",
            label: status,
          };
      }
    }

    // Employee statuses
    if (type === "employee") {
      switch (normalizedStatus) {
        case "ACTIVE":
          return {
            color: "bg-green-100 text-green-800 border-green-300",
            label: "Active",
          };
        case "EXITED":
          return {
            color: "bg-red-100 text-red-800 border-red-300",
            label: "Exited",
          };
        default:
          return {
            color: "bg-gray-100 text-gray-800 border-gray-300",
            label: status,
          };
      }
    }

    // Demand statuses
    if (type === "demand") {
      switch (normalizedStatus) {
        case "REQUESTED":
          return {
            color: "bg-yellow-100 text-yellow-800 border-yellow-300",
            label: "Requested",
          };
        case "FULFILLED":
          return {
            color: "bg-green-100 text-green-800 border-green-300",
            label: "Fulfilled",
          };
        case "CANCELLED":
          return {
            color: "bg-red-100 text-red-800 border-red-300",
            label: "Cancelled",
          };
        default:
          return {
            color: "bg-gray-100 text-gray-800 border-gray-300",
            label: status,
          };
      }
    }

    // Report statuses
    if (type === "report") {
      switch (normalizedStatus) {
        case "DRAFT":
          return {
            color: "bg-gray-100 text-gray-800 border-gray-300",
            label: "Draft",
          };
        case "SUBMITTED":
          return {
            color: "bg-green-100 text-green-800 border-green-300",
            label: "Submitted",
          };
        default:
          return {
            color: "bg-gray-100 text-gray-800 border-gray-300",
            label: status,
          };
      }
    }

    // Allocation billability
    if (type === "allocation") {
      switch (normalizedStatus) {
        case "BILLABLE":
        case "TRUE":
          return {
            color: "bg-green-100 text-green-800 border-green-300",
            label: "Billable",
          };
        case "NON_BILLABLE":
        case "FALSE":
          return {
            color: "bg-gray-100 text-gray-800 border-gray-300",
            label: "Non-Billable",
          };
        default:
          return {
            color: "bg-gray-100 text-gray-800 border-gray-300",
            label: status,
          };
      }
    }

    return {
      color: "bg-gray-100 text-gray-800 border-gray-300",
      label: status,
    };
  };

  const config = getStatusConfig();

  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", config.color, className)}
    >
      {config.label}
    </Badge>
  );
}
