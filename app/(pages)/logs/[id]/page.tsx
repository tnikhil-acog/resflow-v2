import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LogDetailPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Work Log</h1>
        <Link href="/logs">
          <Button variant="outline">Back to Logs</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This page shows a single work log entry. You can see the date,
            project, hours worked, and task description. You can edit the hours
            and description if needed, but cannot change the date or project.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/logs">
            <Button variant="outline">All Logs</Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline">View Reports</Button>
          </Link>
          <Link href="/employees">
            <Button variant="outline">Employee Profile</Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline">Project Details</Button>
          </Link>
          <Link href="/allocations">
            <Button variant="outline">View Allocations</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
