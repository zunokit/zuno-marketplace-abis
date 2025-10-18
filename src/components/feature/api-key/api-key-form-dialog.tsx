"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import { CreateApiKeySchema } from "@/shared/lib/validation/admin.dto";

const PERMISSION_OPTIONS = [
  { resource: "abis", actions: ["read", "list", "create", "update", "delete"] },
  {
    resource: "contracts",
    actions: ["read", "list", "create", "update", "delete"],
  },
  {
    resource: "networks",
    actions: ["read", "list", "create", "update", "delete"],
  },
];

// Client-side form schema - pick only fields needed for form
const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  permissions: z.record(z.string(), z.array(z.string())).refine(
    (perms) => Object.keys(perms).length > 0,
    "At least one permission is required"
  ),
});

type FormValues = z.infer<typeof formSchema>;

interface ApiKeyFormDialogProps {
  onCreate: (data: { name: string; permissions: Record<string, string[]> }) => void;
  isCreating: boolean;
  newKey?: string | null;
  onClose: () => void;
}

export function ApiKeyFormDialog({
  onCreate,
  isCreating,
  newKey,
  onClose,
}: ApiKeyFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      permissions: {},
    },
  });

  // Show new key when it's available
  useEffect(() => {
    if (newKey) {
      setShowNewKey(true);
    }
  }, [newKey]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onClose();
      setShowNewKey(false);
      form.reset();
    }
  };

  const togglePermission = (resource: string, action: string) => {
    const currentPerms = form.getValues("permissions");
    const resourcePerms = currentPerms[resource] || [];

    if (resourcePerms.includes(action)) {
      // Remove permission
      const newPerms = resourcePerms.filter((a) => a !== action);
      if (newPerms.length === 0) {
        // Remove resource entirely if no permissions left
        const { [resource]: _, ...rest } = currentPerms;
        form.setValue("permissions", rest, { shouldValidate: true });
      } else {
        form.setValue(
          "permissions",
          { ...currentPerms, [resource]: newPerms },
          { shouldValidate: true }
        );
      }
    } else {
      // Add permission
      form.setValue(
        "permissions",
        { ...currentPerms, [resource]: [...resourcePerms, action] },
        { shouldValidate: true }
      );
    }
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      toast.success("API key copied to clipboard");
    }
  };

  const onSubmit = (values: FormValues) => {
    onCreate(values);
  };

  // Show new key after creation
  if (showNewKey && newKey) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>Save your API key securely</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <h4 className="mb-2 font-semibold text-yellow-700 dark:text-yellow-500">
                Important: Save Your API Key
              </h4>
              <p className="mb-4 text-sm text-muted-foreground">
                This is the only time you&apos;ll see this key. Copy it now and
                store it securely.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
                  {newKey}
                </code>
                <Button variant="outline" size="sm" onClick={copyKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key with custom permissions
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Production API Key"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <FormLabel>Permissions</FormLabel>
                  <div className="mt-2 space-y-4">
                    {PERMISSION_OPTIONS.map((option) => (
                      <div key={option.resource} className="rounded-lg border p-4">
                        <h4 className="mb-2 font-semibold capitalize">
                          {option.resource}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {option.actions.map((action) => (
                            <div
                              key={action}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`${option.resource}-${action}`}
                                checked={
                                  form
                                    .watch("permissions")
                                    [option.resource]?.includes(action) || false
                                }
                                onCheckedChange={() =>
                                  togglePermission(option.resource, action)
                                }
                              />
                              <label
                                htmlFor={`${option.resource}-${action}`}
                                className="text-sm font-medium capitalize leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {action}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Key"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
