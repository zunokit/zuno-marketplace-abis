"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AbiListItemDto } from "@/shared/dto/abi.dto";

// Form schema for validation
const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  description: z.string().optional(),
  abi: z.string().optional(),
});

const createFormSchema = formSchema.extend({
  abi: z
    .string()
    .min(1, "ABI JSON is required")
    .refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Must be valid JSON" }
    ),
});

type FormValues = z.infer<typeof formSchema>;
type CreateFormValues = z.infer<typeof createFormSchema>;

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

  const form = useForm<FormValues | CreateFormValues>({
    resolver: zodResolver(isEdit ? formSchema : createFormSchema),
    defaultValues: {
      name: "",
      description: "",
      abi: "",
    },
  });

  // Reset form when dialog opens/closes or when abi changes
  useEffect(() => {
    if (abi && open) {
      form.reset({
        name: abi.name,
        description: abi.description || "",
        abi: "",
      });
    } else if (!open) {
      form.reset({
        name: "",
        description: "",
        abi: "",
      });
    }
  }, [abi, open, form]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  const handleSubmit = (values: FormValues | CreateFormValues) => {
    onSubmit({
      name: values.name,
      description: values.description || "",
      abi: values.abi,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={isEdit ? "" : "max-w-2xl"}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit ABI" : "Create New ABI"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update ABI information"
              : "Add a new application binary interface to the system"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ERC20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of the ABI"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="abi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ABI JSON</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='[{"type":"function","name":"transfer",...}]'
                        className="font-mono text-sm"
                        rows={10}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Paste the complete ABI JSON array
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                  ? "Save Changes"
                  : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
