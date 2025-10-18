"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

// Client-side form schema - user inputs chainId (number), we'll convert to networkId
const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  chainId: z
    .number()
    .int("Chain ID must be an integer")
    .positive("Chain ID must be positive"),
  abiId: z.string().min(1, "ABI ID is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface ContractFormDialogProps {
  onCreate: (data: {
    name: string;
    address: string;
    chainId: number;
    abiId: string;
  }) => void;
  isCreating: boolean;
}

export function ContractFormDialog({
  onCreate,
  isCreating,
}: ContractFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      chainId: 1,
      abiId: "",
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
    }
  };

  const onSubmit = (values: FormValues) => {
    onCreate(values);
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Contract
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Contract</DialogTitle>
          <DialogDescription>Register a new smart contract</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., USDT Token" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Must be a valid Ethereum address (0x + 40 hex characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chainId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chain ID</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 1 for Ethereum"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Network chain ID (e.g., 1 = Ethereum, 56 = BSC, 137 = Polygon)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="abiId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ABI ID</FormLabel>
                  <FormControl>
                    <Input placeholder="ABI identifier" {...field} />
                  </FormControl>
                  <FormDescription>
                    The ABI to associate with this contract
                  </FormDescription>
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
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
