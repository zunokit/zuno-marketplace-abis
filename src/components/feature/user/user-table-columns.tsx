import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  Eye,
  UserCog,
  Ban,
  ShieldCheck,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  emailVerified: boolean;
  createdAt: string;
}

interface CreateColumnsProps {
  onView: (user: User) => void;
  onChangeRole: (user: User) => void;
  onBan: (user: User) => void;
  onUnban: (user: User) => void;
}

export function createUserColumns({
  onView,
  onChangeRole,
  onBan,
  onUnban,
}: CreateColumnsProps): ColumnDef<User>[] {
  return [
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => row.original.name || "-",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge
          variant={row.original.role === "admin" ? "default" : "secondary"}
        >
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: "banned",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.banned ? "destructive" : "outline"}>
          {row.original.banned ? "Banned" : "Active"}
        </Badge>
      ),
    },
    {
      accessorKey: "emailVerified",
      header: "Verified",
      cell: ({ row }) => (
        <Badge variant={row.original.emailVerified ? "default" : "secondary"}>
          {row.original.emailVerified ? "Yes" : "No"}
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
            onClick={() => onChangeRole(row.original)}
          >
            <UserCog className="h-4 w-4" />
          </Button>
          {row.original.banned ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnban(row.original)}
            >
              <ShieldCheck className="h-4 w-4 text-green-600" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onBan(row.original)}
            >
              <Ban className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];
}
