import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NewProjectPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <Link href="/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This form creates a new project in the system. You can enter the
            project code, name, client, descriptions, documentation links,
            assign a project manager, set priority level, and specify when the
            project starts.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/projects">
            <Button variant="outline">View All Projects</Button>
          </Link>
          <Link href="/employees">
            <Button variant="outline">View Employees</Button>
          </Link>
          <Link href="/allocations">
            <Button variant="outline">Manage Allocations</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
