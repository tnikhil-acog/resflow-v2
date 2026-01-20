import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EditProjectPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Project</h1>
        <Link href="/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This form updates project information. You can change the project
            name, client, descriptions, links, project manager, priority, and
            status. For closing projects, there's a separate section where you
            can set the closure date, which validates that no employees are
            currently allocated to the project.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/projects">
            <Button variant="outline">View Project Details</Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline">All Projects</Button>
          </Link>
          <Link href="/allocations">
            <Button variant="outline">View Allocations</Button>
          </Link>
          <Link href="/projects/phases">
            <Button variant="outline">View Phases</Button>
          </Link>
          <Link href="/demands">
            <Button variant="outline">View Demands</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
