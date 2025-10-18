"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  useContracts,
  useCreateContract,
  useDeleteContract,
} from "@/hooks/use-contracts";
import {
  createContractColumns,
  type Contract,
} from "@/components/feature/contract/contract-table-columns";
import { ContractFormDialog } from "@/components/feature/contract/contract-form-dialog";
import { ContractViewDialog } from "@/components/feature/contract/contract-view-dialog";
import { ContractDeleteDialog } from "@/components/feature/contract/contract-delete-dialog";

export default function ContractsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null
  );
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Queries
  const {
    data: contractsData,
    isLoading,
    isFetching,
  } = useContracts(page, limit);
  const contracts = contractsData?.data || [];
  const pagination = contractsData?.pagination;

  // Mutations
  const createMutation = useCreateContract();
  const deleteMutation = useDeleteContract();

  // Handlers
  const handleView = (contract: Contract) => {
    setSelectedContract(contract);
    setIsViewOpen(true);
  };

  const handleDelete = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDeleteOpen(true);
  };

  const handleCreate = (data: {
    name: string;
    address: string;
    chainId: number;
    abiId: string;
  }) => {
    createMutation.mutate(data);
  };

  const handleDeleteConfirm = () => {
    if (selectedContract) {
      deleteMutation.mutate(selectedContract.id, {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setSelectedContract(null);
        },
      });
    }
  };

  // Columns
  const columns = createContractColumns({
    onView: handleView,
    onDelete: handleDelete,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading contracts...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contracts Management</h1>
          <p className="text-muted-foreground">Manage smart contracts</p>
        </div>
        <ContractFormDialog
          onCreate={handleCreate}
          isCreating={createMutation.isPending}
        />
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        searchKey="name"
        searchPlaceholder="Search contracts..."
        pagination={pagination}
        onPaginationChange={(newPage) => setPage(newPage)}
        isLoading={isFetching}
      />

      <ContractViewDialog
        contract={selectedContract}
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedContract(null);
        }}
      />

      <ContractDeleteDialog
        contract={selectedContract}
        isOpen={isDeleteOpen}
        isDeleting={deleteMutation.isPending}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedContract(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
