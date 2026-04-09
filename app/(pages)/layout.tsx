import { ModernLayout } from "@/components/modern-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { AmplitudeProvider } from "@/components/amplitude-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AmplitudeProvider>
        <ModernLayout>
          {children}
        </ModernLayout>
      </AmplitudeProvider>
    </ProtectedRoute>
  );
}
