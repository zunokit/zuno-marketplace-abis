"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/feature/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye, ArrowUpDown } from "lucide-react";
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
import type { ColumnDef } from "@tanstack/react-table";

interface Network {
  id: string;
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl?: string;
  symbol: string;
  status: string;
  createdAt: string;
}

export default function NetworksPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [formData, setFormData] = useState({
    chainId: "",
    name: "",
    rpcUrl: "",
    explorerUrl: "",
    symbol: "",
  });

  const queryClient = useQueryClient();

  const {
    data: networks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-networks"],
    queryFn: async () => {
      const res = await fetch("/api/networks", {
        credentials: "include", // Important: include cookies for session auth
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Networks API Error:", errorData);
        throw new Error(errorData.error?.message || "Failed to fetch networks");
      }
      const data = await res.json();
      console.log("Networks API Response:", data);
      return data.data || [];
    },
  });

  // Show error toast
  if (error) {
    toast.error(error.message);
  }

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          chainId: parseInt(data.chainId),
        }),
      });
      if (!res.ok) throw new Error("Failed to create network");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-networks"] });
      toast.success("Network created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create network");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      symbol: string;
      rpcUrl: string;
      explorerUrl: string;
      chainId: number;
    }) => {
      const res = await fetch(`/api/networks/${data.chainId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update network");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-networks"] });
      toast.success("Network updated successfully");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update network");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (chainId: number) => {
      const res = await fetch(`/api/networks/${chainId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete network");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-networks"] });
      toast.success("Network deleted successfully");
      setIsDeleteOpen(false);
      setSelectedNetwork(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete network");
    },
  });

  const resetForm = () => {
    setFormData({
      chainId: "",
      name: "",
      rpcUrl: "",
      explorerUrl: "",
      symbol: "",
    });
    setSelectedNetwork(null);
  };

  const handleEdit = (network: Network) => {
    setSelectedNetwork(network);
    setFormData({
      chainId: network.chainId.toString(),
      name: network.name,
      rpcUrl: network.rpcUrl,
      explorerUrl: network.explorerUrl || "",
      symbol: network.symbol,
    });
    setIsEditOpen(true);
  };

  const handleDelete = (network: Network) => {
    setSelectedNetwork(network);
    setIsDeleteOpen(true);
  };

  const handleView = (network: Network) => {
    setSelectedNetwork(network);
    setIsViewOpen(true);
  };

  const columns: ColumnDef<Network>[] = [
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
      accessorKey: "chainId",
      header: "Chain ID",
    },
    {
      accessorKey: "symbol",
      header: "Symbol",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "active" ? "default" : "secondary"}
        >
          {row.original.status}
        </Badge>
      ),
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
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
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
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading networks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Networks Management</h1>
          <p className="text-muted-foreground">Manage blockchain networks</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Network
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Network</DialogTitle>
              <DialogDescription>
                Register a new blockchain network
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Network Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Ethereum Mainnet"
                />
              </div>
              <div>
                <Label htmlFor="chainId">Chain ID</Label>
                <Input
                  id="chainId"
                  type="number"
                  value={formData.chainId}
                  onChange={(e) =>
                    setFormData({ ...formData, chainId: e.target.value })
                  }
                  placeholder="e.g., 1"
                />
              </div>
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                  placeholder="e.g., ETH"
                />
              </div>
              <div>
                <Label htmlFor="rpcUrl">RPC URL</Label>
                <Input
                  id="rpcUrl"
                  value={formData.rpcUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, rpcUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="explorerUrl">Explorer URL (Optional)</Label>
                <Input
                  id="explorerUrl"
                  value={formData.explorerUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, explorerUrl: e.target.value })
                  }
                  placeholder="https://etherscan.io"
                />
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
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={networks}
        searchKey="name"
        searchPlaceholder="Search networks..."
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Network</DialogTitle>
            <DialogDescription>Update network information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Network Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-symbol">Symbol</Label>
              <Input
                id="edit-symbol"
                value={formData.symbol}
                onChange={(e) =>
                  setFormData({ ...formData, symbol: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-rpcUrl">RPC URL</Label>
              <Input
                id="edit-rpcUrl"
                value={formData.rpcUrl}
                onChange={(e) =>
                  setFormData({ ...formData, rpcUrl: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-explorerUrl">Explorer URL</Label>
              <Input
                id="edit-explorerUrl"
                value={formData.explorerUrl}
                onChange={(e) =>
                  setFormData({ ...formData, explorerUrl: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedNetwork &&
                  updateMutation.mutate({
                    ...formData,
                    chainId: selectedNetwork.chainId,
                  })
                }
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the network &quot;
              {selectedNetwork?.name}
              &quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedNetwork &&
                deleteMutation.mutate(selectedNetwork.chainId)
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNetwork?.name}</DialogTitle>
            <DialogDescription>Network Details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Chain ID</Label>
              <p className="text-sm">{selectedNetwork?.chainId}</p>
            </div>
            <div>
              <Label>Symbol</Label>
              <p className="text-sm">{selectedNetwork?.symbol}</p>
            </div>
            <div>
              <Label>RPC URL</Label>
              <p className="text-sm break-all">{selectedNetwork?.rpcUrl}</p>
            </div>
            {selectedNetwork?.explorerUrl && (
              <div>
                <Label>Explorer URL</Label>
                <p className="text-sm break-all">
                  {selectedNetwork.explorerUrl}
                </p>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <p className="text-sm">{selectedNetwork?.status}</p>
            </div>
            <div>
              <Label>Created</Label>
              <p className="text-sm">
                {selectedNetwork &&
                  new Date(selectedNetwork.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
