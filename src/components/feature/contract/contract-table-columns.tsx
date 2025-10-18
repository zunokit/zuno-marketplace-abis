"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Eye, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

export interface Contract {
  id: string;
  name?: string;
  address: string;
  networkId: string;
  abiId: string;
  type?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ActionsProps {
  onView: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}

const copyAddress = (address: string) => {
  navigator.clipboard.writeText(address);
  toast.success("Address copied to clipboard");
};

export function createContractColumns({
  onView,
  onDelete,
}: ActionsProps): ColumnDef<Contract>[] {
  return [
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
      accessorKey: "networkId",
      header: "Network ID",
    },
    {
      accessorKey: "isVerified",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isVerified ? "default" : "secondary"}>
          {row.original.isVerified ? "Verified" : "Unverified"}
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
            onClick={() => onView(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];
}
