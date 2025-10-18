"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Ban,
  ShieldCheck,
  Eye,
  ArrowUpDown,
  UserCog,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ColumnDef } from "@tanstack/react-table";
import { authClient } from "@/infrastructure/auth/auth.client";

interface User {
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

export default function UsersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBanOpen, setIsBanOpen] = useState(false);
  const [isUnbanOpen, setIsUnbanOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "user",
  });
  const [banData, setBanData] = useState({
    reason: "",
    expiresInDays: "",
  });
  const [newRole, setNewRole] = useState("user");

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await authClient.$fetch("/admin/list-users");
      if (!res.data) throw new Error("Failed to fetch users");
      return (res.data as any).users || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await authClient.$fetch("/admin/create-user", {
        method: "POST",
        body: data,
      });
      if (!res.data) throw new Error("Failed to create user");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  const banMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      reason: string;
      expiresIn?: number;
    }) => {
      const res = await authClient.$fetch("/admin/ban-user", {
        method: "POST",
        body: {
          userId: data.userId,
          banReason: data.reason,
          ...(data.expiresIn && { banExpiresIn: data.expiresIn }),
        },
      });
      if (!res.data) throw new Error("Failed to ban user");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User banned successfully");
      setIsBanOpen(false);
      setSelectedUser(null);
      setBanData({ reason: "", expiresInDays: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to ban user");
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await authClient.$fetch("/admin/unban-user", {
        method: "POST",
        body: { userId },
      });
      if (!res.data) throw new Error("Failed to unban user");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User unbanned successfully");
      setIsUnbanOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unban user");
    },
  });

  const setRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const res = await authClient.$fetch("/admin/set-role", {
        method: "POST",
        body: data,
      });
      if (!res.data) throw new Error("Failed to change role");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role changed successfully");
      setIsRoleOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change role");
    },
  });

  const resetForm = () => {
    setFormData({ email: "", name: "", password: "", role: "user" });
  };

  const handleBan = (user: User) => {
    setSelectedUser(user);
    setIsBanOpen(true);
  };

  const handleUnban = (user: User) => {
    setSelectedUser(user);
    setIsUnbanOpen(true);
  };

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsRoleOpen(true);
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  const columns: ColumnDef<User>[] = [
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
            onClick={() => handleView(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleChangeRole(row.original)}
          >
            <UserCog className="h-4 w-4" />
          </Button>
          {row.original.banned ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUnban(row.original)}
            >
              <ShieldCheck className="h-4 w-4 text-green-600" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBan(row.original)}
            >
              <Ban className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground">Manage users and permissions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Secure password"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
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
        data={users}
        searchKey="email"
        searchPlaceholder="Search users..."
      />

      {/* Ban Dialog */}
      <Dialog open={isBanOpen} onOpenChange={setIsBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban user &quot;{selectedUser?.email}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Ban Reason</Label>
              <Textarea
                id="reason"
                value={banData.reason}
                onChange={(e) =>
                  setBanData({ ...banData, reason: e.target.value })
                }
                placeholder="Reason for ban..."
              />
            </div>
            <div>
              <Label htmlFor="expires">
                Expires In (Days) - Leave empty for permanent
              </Label>
              <Input
                id="expires"
                type="number"
                value={banData.expiresInDays}
                onChange={(e) =>
                  setBanData({ ...banData, expiresInDays: e.target.value })
                }
                placeholder="e.g., 7"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBanOpen(false);
                  setBanData({ reason: "", expiresInDays: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  selectedUser &&
                  banMutation.mutate({
                    userId: selectedUser.id,
                    reason: banData.reason,
                    expiresIn: banData.expiresInDays
                      ? parseInt(banData.expiresInDays) * 24 * 60 * 60
                      : undefined,
                  })
                }
                disabled={banMutation.isPending}
              >
                {banMutation.isPending ? "Banning..." : "Ban User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unban Alert */}
      <AlertDialog open={isUnbanOpen} onOpenChange={setIsUnbanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unban &quot;{selectedUser?.email}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedUser && unbanMutation.mutate(selectedUser.id)
              }
            >
              {unbanMutation.isPending ? "Unbanning..." : "Unban"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <Dialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change role for &quot;{selectedUser?.email}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newRole">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRoleOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedUser &&
                  setRoleMutation.mutate({
                    userId: selectedUser.id,
                    role: newRole,
                  })
                }
                disabled={setRoleMutation.isPending}
              >
                {setRoleMutation.isPending ? "Changing..." : "Change Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <p className="text-sm">{selectedUser?.name || "Not set"}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm">{selectedUser?.email}</p>
            </div>
            <div>
              <Label>Role</Label>
              <p className="text-sm capitalize">{selectedUser?.role}</p>
            </div>
            <div>
              <Label>Email Verified</Label>
              <p className="text-sm">
                {selectedUser?.emailVerified ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <Label>Status</Label>
              <p className="text-sm">
                {selectedUser?.banned ? "Banned" : "Active"}
              </p>
            </div>
            {selectedUser?.banned && (
              <>
                <div>
                  <Label>Ban Reason</Label>
                  <p className="text-sm">
                    {selectedUser.banReason || "No reason provided"}
                  </p>
                </div>
                {selectedUser.banExpires && (
                  <div>
                    <Label>Ban Expires</Label>
                    <p className="text-sm">
                      {new Date(selectedUser.banExpires).toLocaleString()}
                    </p>
                  </div>
                )}
              </>
            )}
            <div>
              <Label>Created</Label>
              <p className="text-sm">
                {selectedUser &&
                  new Date(selectedUser.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
