"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/feature/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, ArrowUpDown, Copy, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { ColumnDef } from "@tanstack/react-table";

interface ApiKey {
  id: string;
  name: string;
  start: string;
  enabled: boolean;
  permissions: Record<string, string[]>;
  createdAt: string;
  expiresAt: string | null;
}

const PERMISSION_OPTIONS = [
  { resource: "abis", actions: ["read", "list", "create", "update", "delete"] },
  {
    resource: "contracts",
    actions: ["read", "list", "create", "update", "delete"],
  },
  {
    resource: "networks",
    actions: ["read", "list", "create", "update", "delete"],
  },
];

export default function ApiKeysPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    permissions: {} as Record<string, string[]>,
  });

  const queryClient = useQueryClient();

  const {
    data: apiKeys = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/admin/api-keys", {
        credentials: "include", // Important: include cookies for session auth
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Keys Error:", errorData);
        throw new Error(errorData.error?.message || "Failed to fetch API keys");
      }
      const data = await res.json();
      console.log("API Keys Response:", data);
      return data.data || [];
    },
  });

  // Show error toast
  if (error) {
    toast.error(error.message);
  }

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create API key");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
      setNewKey(data.data.key);
      setShowNewKey(true);
      toast.success("API key created successfully");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete API key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
      toast.success("API key deleted successfully");
      setIsDeleteOpen(false);
      setSelectedKey(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete API key");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", permissions: {} });
    setSelectedKey(null);
  };

  const handleDelete = (key: ApiKey) => {
    setSelectedKey(key);
    setIsDeleteOpen(true);
  };

  const handleView = (key: ApiKey) => {
    setSelectedKey(key);
    setIsViewOpen(true);
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      toast.success("API key copied to clipboard");
    }
  };

  const togglePermission = (resource: string, action: string) => {
    setFormData((prev) => {
      const permissions = { ...prev.permissions };
      if (!permissions[resource]) {
        permissions[resource] = [];
      }
      if (permissions[resource].includes(action)) {
        permissions[resource] = permissions[resource].filter(
          (a) => a !== action
        );
        if (permissions[resource].length === 0) {
          delete permissions[resource];
        }
      } else {
        permissions[resource] = [...permissions[resource], action];
      }
      return { ...prev, permissions };
    });
  };

  const columns: ColumnDef<ApiKey>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "start",
      header: "Key Preview",
      cell: ({ row }) => (
        <code className="rounded bg-muted px-2 py-1 text-sm">
          {row.original.start}...
        </code>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? "default" : "secondary"}>
          {row.original.enabled ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      accessorKey: "permissions",
      header: "Permissions",
      cell: ({ row }) => {
        const perms = row.original.permissions;
        const count = Object.keys(perms).length;
        return (
          <span className="text-sm text-muted-foreground">
            {count} resource{count !== 1 ? "s" : ""}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
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
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setNewKey(null);
              setShowNewKey(false);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key with custom permissions
              </DialogDescription>
            </DialogHeader>

            {showNewKey && newKey ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                  <h4 className="mb-2 font-semibold text-yellow-700 dark:text-yellow-500">
                    Important: Save Your API Key
                  </h4>
                  <p className="mb-4 text-sm text-muted-foreground">
                    This is the only time you&apos;ll see this key. Copy it now
                    and store it securely.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
                      {newKey}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyKey}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setIsCreateOpen(false)}>Done</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Production API Key"
                  />
                </div>

                <div>
                  <Label>Permissions</Label>
                  <div className="mt-2 space-y-4">
                    {PERMISSION_OPTIONS.map((option) => (
                      <div
                        key={option.resource}
                        className="rounded-lg border p-4"
                      >
                        <h4 className="mb-2 font-semibold capitalize">
                          {option.resource}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {option.actions.map((action) => (
                            <div
                              key={action}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`${option.resource}-${action}`}
                                checked={
                                  formData.permissions[
                                    option.resource
                                  ]?.includes(action) || false
                                }
                                onCheckedChange={() =>
                                  togglePermission(option.resource, action)
                                }
                              />
                              <label
                                htmlFor={`${option.resource}-${action}`}
                                className="text-sm font-medium capitalize leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {action}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate(formData)}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Key"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={apiKeys}
        searchKey="name"
        searchPlaceholder="Search API keys..."
      />

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the API key &quot;{selectedKey?.name}
              &quot;. Applications using this key will lose access. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedKey && deleteMutation.mutate(selectedKey.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedKey?.name}</DialogTitle>
            <DialogDescription>API Key Details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Key Preview</Label>
              <code className="block rounded bg-muted px-3 py-2 text-sm">
                {selectedKey?.start}...
              </code>
            </div>
            <div>
              <Label>Status</Label>
              <p className="text-sm">
                {selectedKey?.enabled ? "Active" : "Disabled"}
              </p>
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="mt-2 space-y-2">
                {selectedKey &&
                  Object.entries(selectedKey.permissions).map(
                    ([resource, actions]) => (
                      <div key={resource} className="rounded border p-3">
                        <h4 className="mb-1 font-semibold capitalize">
                          {resource}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {(actions as string[]).map((action) => (
                            <Badge key={action} variant="secondary">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  )}
              </div>
            </div>
            <div>
              <Label>Created</Label>
              <p className="text-sm">
                {selectedKey &&
                  new Date(selectedKey.createdAt).toLocaleString()}
              </p>
            </div>
            {selectedKey?.expiresAt && (
              <div>
                <Label>Expires</Label>
                <p className="text-sm">
                  {new Date(selectedKey.expiresAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
