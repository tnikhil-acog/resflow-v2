"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/data-table";
import { ClientFormModal } from "@/components/forms/client-form-modal";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";

interface Client {
  id: string;
  client_name: string;
  client_code: string | null;
  created_at: string;
  project_count?: number;
}

export function ClientsTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/clients", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }

      const result = await response.json();
      setClients(result.clients || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSuccess = () => {
    fetchClients();
  };

  const columns: Column<Client>[] = [
    {
      key: "client_code",
      header: "Client Code",
      render: (client) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-semibold ${
            client.client_code === "IN001"
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          {client.client_code ?? "—"}
        </span>
      ),
    },
    {
      key: "client_name",
      header: "Client Name",
      render: (client) => (
        <span className={client.client_code === "IN001" ? "text-muted-foreground italic" : ""}>
          {client.client_name}
        </span>
      ),
    },
    {
      key: "project_count",
      header: "Projects",
      render: (client) => client.project_count || 0,
    },
    {
      key: "created_at",
      header: "Added On",
      render: (client) =>
        client.created_at
          ? new Date(client.created_at).toLocaleDateString()
          : "—",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>
              Manage client organizations and relationships
            </CardDescription>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={clients}
            columns={columns}
            searchPlaceholder="Search clients..."
            searchKeys={["client_name", "client_code"]}
            emptyMessage="No clients found"
          />
        </CardContent>
      </Card>

      <ClientFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
