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
      key: "client_name",
      header: "Client Name",
    },
    {
      key: "created_at",
      header: "Created At",
      render: (client) => new Date(client.created_at).toLocaleDateString(),
    },
    {
      key: "project_count",
      header: "Projects",
      render: (client) => client.project_count || 0,
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
    <>
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
            searchKeys={["client_name"]}
            emptyMessage="No clients found"
          />
        </CardContent>
      </Card>

      <ClientFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
