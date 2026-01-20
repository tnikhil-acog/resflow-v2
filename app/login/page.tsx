import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card rounded border border-border p-8 shadow-sm">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Login
          </h1>
          <div className="text-sm mb-6 space-y-1">
            <p className="font-medium">What this does:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Accepts LDAP email and password in form</li>
              <li>POST /api/auth/login with credentials</li>
              <li>Returns JWT token containing user_id and role</li>
              <li>Role is one of: employee, project_manager, hr_executive</li>
              <li>Token stored in cookie for subsequent API calls</li>
            </ul>
          </div>

          <Link href="/tasks">
            <Button className="w-full">Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
