import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EditEmployeePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Employee</h1>
        <Link href="/employees">
          <Button variant="outline">Back to Employees</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This form updates an employee's information. You can change their
            role, department, manager, work location, and educational details.
            For employee exits, there's a separate section where you can mark
            their exit date, which automatically cancels any pending tasks and
            validates they have no active project assignments.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/employees">
            <Button variant="outline">View Employee Profile</Button>
          </Link>
          <Link href="/employees">
            <Button variant="outline">All Employees</Button>
          </Link>
          <Link href="/allocations">
            <Button variant="outline">View Allocations</Button>
          </Link>
          <Link href="/tasks">
            <Button variant="outline">View Tasks</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
