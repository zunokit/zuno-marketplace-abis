"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye, ArrowUpDown } from "lucide-react";
import { getNetworks, createNetwork, updateNetwork, deleteNetwork } from "./actions";
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
  slug: string;
  type: string;
  isTestnet: boolean;
  isActive: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export default function NetworksPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [formData, setFormData] = useState({
    chainId: "",
    name: "",
    slug: "",
    type: "mainnet",
    isTestnet: false,
    rpcUrl: "", // Single URL for form simplicity
    explorerUrl: "", // Single URL for form simplicity
    currencyName: "",
    currencySymbol: "",
    currencyDecimals: "18",
  });

  const queryClient = useQueryClient();

  const {
    data: networksData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["admin-networks", page, limit],
    queryFn: async () => {
      const result = await getNetworks({ page, limit });
      console.log("Networks Data:", result);
      return result;
    },
  });

  const networks = networksData?.data || [];
  const pagination = networksData?.pagination;

  // Show error toast
  if (error) {
    toast.error(error.message);
  }

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return createNetwork({
        chainId: parseInt(data.chainId),
        name: data.name,
        slug: data.slug,
        type: data.type,
        isTestnet: data.isTestnet,
        rpcUrls: [data.rpcUrl],
        explorerUrls: data.explorerUrl ? [data.explorerUrl] : [],
        nativeCurrency: {
          name: data.currencyName,
          symbol: data.currencySymbol,
          decimals: parseInt(data.currencyDecimals),
        },
      });
    },
    onSuccess: () => {
      // Invalidate all pages
      queryClient.invalidateQueries({ queryKey: ["admin-networks"] });
      toast.success("Network created successfully");
      setIsCreateOpen(false);
      resetForm();
      // Reset to page 1 to see the new item
      setPage(1);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create network");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const updateData: any = {
        name: data.name,
        slug: data.slug,
        type: data.type,
        isTestnet: data.isTestnet,
      };

      if (data.rpcUrl) {
        updateData.rpcUrls = [data.rpcUrl];
      }
      if (data.explorerUrl) {
        updateData.explorerUrls = [data.explorerUrl];
      }
      if (data.currencyName && data.currencySymbol) {
        updateData.nativeCurrency = {
          name: data.currencyName,
          symbol: data.currencySymbol,
          decimals: parseInt(data.currencyDecimals),
        };
      }

      return updateNetwork(id, updateData);
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
    mutationFn: async (id: string) => {
      return deleteNetwork({ id });
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
      slug: "",
      type: "mainnet",
      isTestnet: false,
      rpcUrl: "",
      explorerUrl: "",
      currencyName: "",
      currencySymbol: "",
      currencyDecimals: "18",
    });
    setSelectedNetwork(null);
  };

  const handleEdit = (network: Network) => {
    setSelectedNetwork(network);
    setFormData({
      chainId: network.chainId.toString(),
      name: network.name,
      slug: network.slug,
      type: network.type,
      isTestnet: network.isTestnet,
      rpcUrl: "", // Network list doesn't include RPC URLs
      explorerUrl: "",
      currencyName: network.nativeCurrency.name,
      currencySymbol: network.nativeCurrency.symbol,
      currencyDecimals: network.nativeCurrency.decimals.toString(),
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
      accessorKey: "nativeCurrency.symbol",
      header: "Symbol",
      cell: ({ row }) => row.original.nativeCurrency.symbol,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "default" : "secondary"}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "isTestnet",
      header: "Network",
      cell: ({ row }) => (
        <Badge variant={row.original.isTestnet ? "outline" : "secondary"}>
          {row.original.isTestnet ? "Testnet" : "Mainnet"}
        </Badge>
      ),
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
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Network Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ethereum Mainnet"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="ethereum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chainId">Chain ID *</Label>
                  <Input
                    id="chainId"
                    type="number"
                    value={formData.chainId}
                    onChange={(e) =>
                      setFormData({ ...formData, chainId: e.target.value })
                    }
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    placeholder="mainnet"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rpcUrl">RPC URL *</Label>
                <Input
                  id="rpcUrl"
                  value={formData.rpcUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, rpcUrl: e.target.value })
                  }
                  placeholder="https://eth.llamarpc.com"
                />
              </div>

              <div>
                <Label htmlFor="explorerUrl">Explorer URL</Label>
                <Input
                  id="explorerUrl"
                  value={formData.explorerUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, explorerUrl: e.target.value })
                  }
                  placeholder="https://etherscan.io"
                />
              </div>

              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-semibold">Native Currency</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currencyName">Name *</Label>
                    <Input
                      id="currencyName"
                      value={formData.currencyName}
                      onChange={(e) =>
                        setFormData({ ...formData, currencyName: e.target.value })
                      }
                      placeholder="Ether"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currencySymbol">Symbol *</Label>
                    <Input
                      id="currencySymbol"
                      value={formData.currencySymbol}
                      onChange={(e) =>
                        setFormData({ ...formData, currencySymbol: e.target.value })
                      }
                      placeholder="ETH"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="currencyDecimals">Decimals *</Label>
                  <Input
                    id="currencyDecimals"
                    type="number"
                    value={formData.currencyDecimals}
                    onChange={(e) =>
                      setFormData({ ...formData, currencyDecimals: e.target.value })
                    }
                    placeholder="18"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 border-t pt-3">
                <input
                  type="checkbox"
                  id="isTestnet"
                  checked={formData.isTestnet}
                  onChange={(e) =>
                    setFormData({ ...formData, isTestnet: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="isTestnet" className="cursor-pointer">
                  This is a testnet
                </Label>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
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
        pagination={pagination}
        onPaginationChange={(newPage) => setPage(newPage)}
        isLoading={isFetching}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Network</DialogTitle>
            <DialogDescription>Update network information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Network Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-slug">Slug *</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Chain ID</Label>
                <Input value={formData.chainId} disabled />
              </div>
              <div>
                <Label htmlFor="edit-type">Type *</Label>
                <Input
                  id="edit-type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-rpcUrl">RPC URL</Label>
              <Input
                id="edit-rpcUrl"
                value={formData.rpcUrl}
                onChange={(e) =>
                  setFormData({ ...formData, rpcUrl: e.target.value })
                }
                placeholder="Leave empty to keep current"
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
                placeholder="Leave empty to keep current"
              />
            </div>

            <div className="space-y-3 border-t pt-3">
              <Label className="text-sm font-semibold">Native Currency</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-currencyName">Name *</Label>
                  <Input
                    id="edit-currencyName"
                    value={formData.currencyName}
                    onChange={(e) =>
                      setFormData({ ...formData, currencyName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-currencySymbol">Symbol *</Label>
                  <Input
                    id="edit-currencySymbol"
                    value={formData.currencySymbol}
                    onChange={(e) =>
                      setFormData({ ...formData, currencySymbol: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-currencyDecimals">Decimals *</Label>
                <Input
                  id="edit-currencyDecimals"
                  type="number"
                  value={formData.currencyDecimals}
                  onChange={(e) =>
                    setFormData({ ...formData, currencyDecimals: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 border-t pt-3">
              <input
                type="checkbox"
                id="edit-isTestnet"
                checked={formData.isTestnet}
                onChange={(e) =>
                  setFormData({ ...formData, isTestnet: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="edit-isTestnet" className="cursor-pointer">
                This is a testnet
              </Label>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
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
                    id: selectedNetwork.id,
                    data: formData,
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
                deleteMutation.mutate(selectedNetwork.id)
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">ID</Label>
                <p className="text-sm font-mono">{selectedNetwork?.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Slug</Label>
                <p className="text-sm">{selectedNetwork?.slug}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Chain ID</Label>
                <p className="text-sm font-mono">{selectedNetwork?.chainId}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="text-sm">{selectedNetwork?.type}</p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Native Currency</Label>
              <div className="mt-1 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Name:</span> {selectedNetwork?.nativeCurrency.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Symbol:</span> {selectedNetwork?.nativeCurrency.symbol}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Decimals:</span> {selectedNetwork?.nativeCurrency.decimals}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Network Type</Label>
                <p className="text-sm">
                  {selectedNetwork?.isTestnet ? "Testnet" : "Mainnet"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="text-sm">
                  {selectedNetwork?.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
