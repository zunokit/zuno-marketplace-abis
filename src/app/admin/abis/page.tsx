"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import {
  useAbis,
  useCreateAbi,
  useUpdateAbi,
  useDeleteAbi,
} from "@/hooks/use-abis";
import { createAbiColumns } from "@/components/feature/abi/abi-table-columns";
import { AbiViewDialog } from "@/components/feature/abi/abi-view-dialog";
import { AbiFormDialog } from "@/components/feature/abi/abi-form-dialog";
import { AbiDeleteDialog } from "@/components/feature/abi/abi-delete-dialog";
import { AbiListItemDto } from "@/shared/dto/abi.dto";

export default function ABIsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedABI, setSelectedABI] = useState<AbiListItemDto | null>(null);

  const { data: abiData, isLoading, isFetching } = useAbis(page, limit);
  const createMutation = useCreateAbi();
  const updateMutation = useUpdateAbi();
  const deleteMutation = useDeleteAbi();

  const abis = abiData?.data || [];
  const pagination = abiData?.pagination;

  const handleView = (abi: AbiListItemDto) => {
    setSelectedABI(abi);
    setIsViewOpen(true);
  };

  const handleEdit = (abi: AbiListItemDto) => {
    setSelectedABI(abi);
    setIsEditOpen(true);
  };

  const handleDelete = (abi: AbiListItemDto) => {
    setSelectedABI(abi);
    setIsDeleteOpen(true);
  };

  const handleCreate = (data: {
    name: string;
    description: string;
    abi?: string;
  }) => {
    if (!data.abi) return;
    try {
      const parsedAbi = JSON.parse(data.abi) as Record<string, unknown>[];
      createMutation.mutate(
        {
          name: data.name,
          description: data.description,
          abi: parsedAbi,
          tags: []
        },
        { onSuccess: () => setIsCreateOpen(false) }
      );
    } catch (error) {
      console.error("Invalid ABI JSON:", error);
    }
  };

  const handleUpdate = (data: { name: string; description: string }) => {
    if (!selectedABI) return;
    updateMutation.mutate(
      { id: selectedABI.id, name: data.name, description: data.description },
      { onSuccess: () => setIsEditOpen(false) }
    );
  };

  const handleConfirmDelete = () => {
    if (!selectedABI) return;
    deleteMutation.mutate(selectedABI.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedABI(null);
      },
    });
  };

  const columns = createAbiColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading ABIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ABIs Management</h1>
          <p className="text-muted-foreground">
            Manage application binary interfaces
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create ABI
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={abis}
        searchKey="name"
        searchPlaceholder="Search ABIs..."
        pagination={pagination}
        onPaginationChange={(newPage) => setPage(newPage)}
        isLoading={isFetching}
      />

      {/* Dialogs */}
      <AbiFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
      />

      <AbiFormDialog
        abi={selectedABI}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
      />

      <AbiViewDialog
        abi={selectedABI}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
      />

      <AbiDeleteDialog
        abi={selectedABI}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
