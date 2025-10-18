import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import type { AbiListItemDto } from "@/shared/dto/abi.dto";

interface AbiFormDialogProps {
  abi?: AbiListItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; abi?: string }) => void;
  isPending?: boolean;
}

export function AbiFormDialog({
  abi,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: AbiFormDialogProps) {
  const isEdit = !!abi;
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    abi: "",
  });

  useEffect(() => {
    if (abi && open) {
      setFormData({
        name: abi.name,
        description: abi.description || "",
        abi: "",
      });
    } else if (!open) {
      setFormData({ name: "", description: "", abi: "" });
    }
  }, [abi, open]);

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isEdit ? "" : "max-w-2xl"}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit ABI" : "Create New ABI"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update ABI information"
              : "Add a new application binary interface to the system"}
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
              placeholder="e.g., ERC20"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of the ABI"
            />
          </div>
          {!isEdit && (
            <div>
              <Label htmlFor="abi">ABI JSON</Label>
              <Textarea
                id="abi"
                value={formData.abi}
                onChange={(e) =>
                  setFormData({ ...formData, abi: e.target.value })
                }
                placeholder='[{"type":"function","name":"transfer",...}]'
                className="font-mono text-sm"
                rows={10}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                ? "Save Changes"
                : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
