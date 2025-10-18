import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAbiDetails } from "@/hooks/use-abis";
import type { AbiListItemDto } from "@/shared/dto/abi.dto";

interface AbiViewDialogProps {
  abi: AbiListItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AbiViewDialog({ abi, open, onOpenChange }: AbiViewDialogProps) {
  const { data: abiDetails, isLoading } = useAbiDetails(
    open ? abi?.id || null : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{abi?.name}</DialogTitle>
          <DialogDescription>ABI Details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Description</Label>
              <p className="text-sm text-muted-foreground">
                {abiDetails?.description ||
                  abi?.description ||
                  "No description"}
              </p>
            </div>
            <div>
              <Label>Contract Name</Label>
              <p className="text-sm">
                {abiDetails?.contractName || abi?.contractName || "-"}
              </p>
            </div>
            <div>
              <Label>Standard</Label>
              <p className="text-sm">
                {abiDetails?.standard || abi?.standard || "-"}
              </p>
            </div>
            <div>
              <Label>Version</Label>
              <p className="text-sm">{abiDetails?.version || abi?.version}</p>
            </div>
            <div>
              <Label>ABI Hash</Label>
              <p
                className="text-xs font-mono truncate"
                title={abiDetails?.abiHash || abi?.abiHash}
              >
                {abiDetails?.abiHash || abi?.abiHash}
              </p>
            </div>
            <div>
              <Label>IPFS Hash</Label>
              <p
                className="text-xs font-mono truncate"
                title={abiDetails?.ipfsHash || "-"}
              >
                {abiDetails?.ipfsHash || "-"}
              </p>
            </div>
          </div>

          {abiDetails?.tags && abiDetails.tags.length > 0 && (
            <div>
              <Label>Tags</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {abiDetails.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Created</Label>
              <p className="text-sm">
                {abi && new Date(abi.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Last Updated</Label>
              <p className="text-sm">
                {abi && new Date(abi.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <Label>ABI JSON</Label>
            {isLoading ? (
              <div className="mt-2 flex items-center justify-center p-8 border border-dashed rounded-md">
                <p className="text-sm text-muted-foreground">
                  Loading ABI data...
                </p>
              </div>
            ) : abiDetails?.abi ? (
              <pre className="mt-2 rounded-md bg-muted p-4 text-xs overflow-x-auto max-h-96">
                {JSON.stringify(abiDetails.abi, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
