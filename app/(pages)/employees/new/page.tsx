import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NewEmployeePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Employee</h1>
        <Link href="/employees">
          <Button variant="outline">Back to Employees</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This form creates a new employee record in the system. You can enter
            their personal details, job role, department, assigned manager,
            educational background, and work location. The system automatically
            sets their status as active when created.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/employees">
            <Button variant="outline">View All Employees</Button>
          </Link>
          <Link href="/skills">
            <Button variant="outline">Manage Skills</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
