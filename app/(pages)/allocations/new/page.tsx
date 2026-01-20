import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NewAllocationPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Allocation</h1>
        <Link href="/allocations">
          <Button variant="outline">Back to Allocations</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This form assigns an employee to a project with a specific time
            commitment percentage. You can choose which employee works on which
            project, their role, how much of their time (percentage) they'll
            dedicate, the start and end dates, and whether they're billable to
            the client. The system ensures an employee's total allocation across
            all projects never exceeds 100% during overlapping periods.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/allocations">
            <Button variant="outline">View All Allocations</Button>
          </Link>
          <Link href="/employees">
            <Button variant="outline">View Employees</Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline">View Projects</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
