import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NewLogPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Daily Work Log</h1>
        <Link href="/logs">
          <Button variant="outline">Back to Logs</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This form records daily work hours. You can select a date, choose
            from projects you're currently assigned to, enter how many hours you
            worked, and describe what tasks you completed. The system ensures
            you can only log hours for projects where you have an active
            assignment.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/logs">
            <Button variant="outline">View All Logs</Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline">View Reports</Button>
          </Link>
          <Link href="/allocations">
            <Button variant="outline">View Allocations</Button>
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
