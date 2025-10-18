"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/feature/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye, ArrowUpDown, Copy } from "lucide-react";
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

interface Contract {
  id: string;
  name: string;
  address: string;
  chainId: number;
  verified: boolean;
  createdAt: string;
}

export default function ContractsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    chainId: "",
  });

  const queryClient = useQueryClient();

  const {
    data: contracts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-contracts"],
    queryFn: async () => {
      const res = await fetch("/api/contracts", {
        credentials: "include", // Important: include cookies for session auth
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Contracts API Error:", errorData);
        throw new Error(
          errorData.error?.message || "Failed to fetch contracts"
        );
      }
      const data = await res.json();
      console.log("Contracts API Response:", data);
      return data.data || [];
    },
  });

  // Show error toast
  if (error) {
    toast.error(error.message);
  }

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          chainId: parseInt(data.chainId),
        }),
      });
      if (!res.ok) throw new Error("Failed to create contract");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contracts"] });
      toast.success("Contract created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create contract");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (address: string) => {
      const res = await fetch(`/api/contracts/${address}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete contract");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contracts"] });
      toast.success("Contract deleted successfully");
      setIsDeleteOpen(false);
      setSelectedContract(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete contract");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", address: "", chainId: "" });
    setSelectedContract(null);
  };

  const handleDelete = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDeleteOpen(true);
  };

  const handleView = (contract: Contract) => {
    setSelectedContract(contract);
    setIsViewOpen(true);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  };

  const columns: ColumnDef<Contract>[] = [
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
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 text-sm">
            {row.original.address.slice(0, 6)}...
            {row.original.address.slice(-4)}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyAddress(row.original.address)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "chainId",
      header: "Chain ID",
    },
    {
      accessorKey: "verified",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.verified ? "default" : "secondary"}>
          {row.original.verified ? "Verified" : "Unverified"}
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
          <h1 className="text-3xl font-bold">Contracts Management</h1>
          <p className="text-muted-foreground">Manage smart contracts</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Contract
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contract</DialogTitle>
              <DialogDescription>
                Register a new smart contract
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., USDT Token"
                />
              </div>
              <div>
                <Label htmlFor="address">Contract Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="0x..."
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
                  placeholder="e.g., 1 for Ethereum"
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
        data={contracts}
        searchKey="name"
        searchPlaceholder="Search contracts..."
      />

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contract &quot;
              {selectedContract?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedContract &&
                deleteMutation.mutate(selectedContract.address)
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
            <DialogTitle>{selectedContract?.name}</DialogTitle>
            <DialogDescription>Contract Details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Address</Label>
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-2 py-1 text-sm">
                  {selectedContract?.address}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    selectedContract && copyAddress(selectedContract.address)
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Chain ID</Label>
              <p className="text-sm">{selectedContract?.chainId}</p>
            </div>
            <div>
              <Label>Status</Label>
              <p className="text-sm">
                {selectedContract?.verified ? "Verified" : "Unverified"}
              </p>
            </div>
            <div>
              <Label>Created</Label>
              <p className="text-sm">
                {selectedContract &&
                  new Date(selectedContract.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
