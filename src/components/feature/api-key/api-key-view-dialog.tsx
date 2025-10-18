"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiKey } from "./api-key-table-columns";

interface ApiKeyViewDialogProps {
  apiKey: ApiKey | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyViewDialog({
  apiKey,
  isOpen,
  onClose,
}: ApiKeyViewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{apiKey?.name}</DialogTitle>
          <DialogDescription>API Key Details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Key ID</Label>
            <code className="block rounded bg-muted px-3 py-2 text-sm font-mono">
              {apiKey?.id}
            </code>
          </div>
          <div>
            <Label>Status</Label>
            <p className="text-sm">
              {apiKey?.enabled ? "Active" : "Disabled"}
            </p>
          </div>
          <div>
            <Label>Permissions</Label>
            <div className="mt-2 space-y-2">
              {apiKey && Object.entries(apiKey.permissions).map(
                ([resource, actions]) => (
                  <div key={resource} className="rounded border p-3">
                    <h4 className="mb-1 font-semibold capitalize">
                      {resource}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {actions.map((action) => (
                        <Badge key={action} variant="secondary">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              )}
              {apiKey && Object.keys(apiKey.permissions).length === 0 && (
                <p className="text-sm text-muted-foreground">No permissions assigned</p>
              )}
            </div>
          </div>
          <div>
            <Label>Created</Label>
            <p className="text-sm">
              {apiKey && new Date(apiKey.createdAt).toLocaleString()}
            </p>
          </div>
          {apiKey?.expiresAt && (
            <div>
              <Label>Expires</Label>
              <p className="text-sm">
                {new Date(apiKey.expiresAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
