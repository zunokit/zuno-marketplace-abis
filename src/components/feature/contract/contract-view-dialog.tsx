"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { Contract } from "./contract-table-columns";

interface ContractViewDialogProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
}

const copyAddress = (address: string) => {
  navigator.clipboard.writeText(address);
  toast.success("Address copied to clipboard");
};

export function ContractViewDialog({
  contract,
  isOpen,
  onClose,
}: ContractViewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contract?.name}</DialogTitle>
          <DialogDescription>Contract Details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Address</Label>
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-sm">
                {contract?.address}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => contract && copyAddress(contract.address)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Network ID</Label>
            <p className="text-sm">{contract?.networkId}</p>
          </div>
          <div>
            <Label>Status</Label>
            <p className="text-sm">
              {contract?.isVerified ? "Verified" : "Unverified"}
            </p>
          </div>
          <div>
            <Label>Created</Label>
            <p className="text-sm">
              {contract && new Date(contract.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
