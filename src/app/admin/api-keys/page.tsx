"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from "@/hooks/use-api-keys";
import {
  createApiKeyColumns,
  type ApiKey,
} from "@/components/feature/api-key/api-key-table-columns";
import { ApiKeyFormDialog } from "@/components/feature/api-key/api-key-form-dialog";
import { ApiKeyViewDialog } from "@/components/feature/api-key/api-key-view-dialog";
import { ApiKeyDeleteDialog } from "@/components/feature/api-key/api-key-delete-dialog";

export default function ApiKeysPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Queries
  const { data: apiKeysData, isLoading, isFetching } = useApiKeys(page, limit);
  const apiKeys = apiKeysData?.data || [];
  const pagination = apiKeysData?.pagination;

  // Mutations
  const createMutation = useCreateApiKey();
  const deleteMutation = useDeleteApiKey();

  // Handlers
  const handleView = (key: ApiKey) => {
    setSelectedKey(key);
    setIsViewOpen(true);
  };

  const handleDelete = (key: ApiKey) => {
    setSelectedKey(key);
    setIsDeleteOpen(true);
  };

  const handleCreate = (data: {
    name: string;
    permissions: Record<string, string[]>;
  }) => {
    createMutation.mutate(data, {
      onSuccess: (result) => {
        setNewKey(result.key);
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (selectedKey) {
      deleteMutation.mutate(selectedKey.id, {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setSelectedKey(null);
        },
      });
    }
  };

  const handleFormClose = () => {
    setNewKey(null);
  };

  // Columns
  const columns = createApiKeyColumns({
    onView: handleView,
    onDelete: handleDelete,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading API keys...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys Management</h1>
          <p className="text-muted-foreground">
            Manage API keys and permissions
          </p>
        </div>
        <ApiKeyFormDialog
          onCreate={handleCreate}
          isCreating={createMutation.isPending}
          newKey={newKey}
          onClose={handleFormClose}
        />
      </div>

      <DataTable
        columns={columns}
        data={apiKeys}
        searchKey="name"
        searchPlaceholder="Search API keys..."
        pagination={pagination}
        onPaginationChange={(newPage) => setPage(newPage)}
        isLoading={isFetching}
      />

      <ApiKeyViewDialog
        apiKey={selectedKey}
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedKey(null);
        }}
      />

      <ApiKeyDeleteDialog
        apiKey={selectedKey}
        isOpen={isDeleteOpen}
        isDeleting={deleteMutation.isPending}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedKey(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
