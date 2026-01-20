import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AllocationDetailPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Allocation Details</h1>
        <Link href="/allocations">
          <Button variant="outline">Back to Allocations</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This page shows the details of a single employee-project assignment.
            You can see which employee is assigned to which project, their role,
            allocation percentage, dates, and billing status. HR executives can
            edit the allocation percentage, end date, billing status, or
            transfer the employee to a different project while maintaining the
            same allocation percentage and role.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/allocations">
            <Button variant="outline">All Allocations</Button>
          </Link>
          <Link href="/employees">
            <Button variant="outline">Employee Profile</Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline">Project Details</Button>
          </Link>
          <Link href="/logs">
            <Button variant="outline">View Logs</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
