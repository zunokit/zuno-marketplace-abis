"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Eye, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

// API Key View Model (imported from hook, already transformed)
import type { ApiKeyViewModel } from "@/hooks/use-api-keys";

export type ApiKey = ApiKeyViewModel;

interface ActionsProps {
  onView: (key: ApiKey) => void;
  onDelete: (key: ApiKey) => void;
}

export function createApiKeyColumns({
  onView,
  onDelete,
}: ActionsProps): ColumnDef<ApiKey>[] {
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
      accessorKey: "id",
      header: "Key ID",
      cell: ({ row }) => (
        <code className="rounded bg-muted px-2 py-1 text-sm font-mono text-xs">
          {row.original.id.slice(0, 8)}...
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
