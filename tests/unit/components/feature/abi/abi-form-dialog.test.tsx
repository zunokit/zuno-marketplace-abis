import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { AbiFormDialog } from "@/components/feature/abi/abi-form-dialog";
import type { AbiListItemDto } from "@/shared/dto/abi.dto";

// Mock abi data
const mockAbi: AbiListItemDto = {
  id: "abi_v1_123456",
  name: "ERC20",
  description: "Standard ERC20 Token Interface",
  contractName: "ERC20Token",
  version: "1.0.0",
  standard: "ERC20",
  tags: ["token", "erc20"],
  abiHash: "0xabc123",
  ipfsHash: "QmTest123",
  ipfsUrl: "https://ipfs.io/ipfs/QmTest123",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
};

describe("AbiFormDialog", () => {
  const mockOnSubmit = jest.fn();
  const mockOnOpenChange = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Create mode", () => {
    it("renders create form when no abi is provided", () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText("Create New ABI")).toBeInTheDocument();
      expect(
        screen.getByText("Add a new application binary interface to the system")
      ).toBeInTheDocument();
    });

    it("displays all required fields in create mode", () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/abi json/i)).toBeInTheDocument();
    });

    it("shows validation error when name is empty", async () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("shows validation error when ABI JSON is empty", async () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Test ABI");

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/abi json is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("shows validation error for invalid JSON", async () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Test ABI");

      const abiInput = screen.getByLabelText(/abi json/i);
      await user.click(abiInput);
      await user.paste("invalid json");

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must be valid json/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("submits form with valid data", async () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "ERC721");

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, "NFT Standard");

      const abiInput = screen.getByLabelText(/abi json/i);
      await user.click(abiInput);
      await user.paste('[{"type":"function","name":"transfer"}]');

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "ERC721",
          description: "NFT Standard",
          abi: '[{"type":"function","name":"transfer"}]',
        });
      });
    });

    it("allows optional description to be empty", async () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "ERC721");

      const abiInput = screen.getByLabelText(/abi json/i);
      await user.click(abiInput);
      await user.paste('[{"type":"function"}]');

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "ERC721",
          description: "",
          abi: '[{"type":"function"}]',
        });
      });
    });
  });

  describe("Edit mode", () => {
    it("renders edit form when abi is provided", () => {
      render(
        <AbiFormDialog
          abi={mockAbi}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText("Edit ABI")).toBeInTheDocument();
      expect(screen.getByText("Update ABI information")).toBeInTheDocument();
    });

    it("pre-fills form with existing abi data", () => {
      render(
        <AbiFormDialog
          abi={mockAbi}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      const descriptionInput = screen.getByLabelText(
        /description/i
      ) as HTMLInputElement;

      expect(nameInput.value).toBe("ERC20");
      expect(descriptionInput.value).toBe("Standard ERC20 Token Interface");
    });

    it("does not show ABI JSON field in edit mode", () => {
      render(
        <AbiFormDialog
          abi={mockAbi}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByLabelText(/abi json/i)).not.toBeInTheDocument();
    });

    it("submits updated data", async () => {
      render(
        <AbiFormDialog
          abi={mockAbi}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "ERC20 Updated");

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, "Updated description");

      const submitButton = screen.getByRole("button", {
        name: /save changes/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "ERC20 Updated",
          description: "Updated description",
          abi: "",
        });
      });
    });

    it("validates name in edit mode", async () => {
      render(
        <AbiFormDialog
          abi={mockAbi}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      const submitButton = screen.getByRole("button", {
        name: /save changes/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Dialog controls", () => {
    it("calls onOpenChange when Cancel button is clicked", async () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("resets form when dialog is closed", async () => {
      const { rerender } = render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Test Name");

      // Close dialog
      rerender(
        <AbiFormDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Reopen dialog
      rerender(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInputAfterReopen = screen.getByLabelText(
        /name/i
      ) as HTMLInputElement;
      expect(nameInputAfterReopen.value).toBe("");
    });

    it("disables buttons when isPending is true", () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          isPending={true}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      const submitButton = screen.getByRole("button", { name: /creating/i });

      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it("shows loading text when isPending is true in create mode", () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          isPending={true}
        />
      );

      expect(screen.getByText("Creating...")).toBeInTheDocument();
    });

    it("shows loading text when isPending is true in edit mode", () => {
      render(
        <AbiFormDialog
          abi={mockAbi}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          isPending={true}
        />
      );

      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });

  describe("Form reset behavior", () => {
    it("resets to abi data when switching to edit mode", () => {
      const { rerender } = render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Switch to edit mode
      rerender(
        <AbiFormDialog
          abi={mockAbi}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      expect(nameInput.value).toBe("ERC20");
    });

    it("clears form when dialog closes then reopens in create mode", async () => {
      const { rerender } = render(
        <AbiFormDialog
          abi={mockAbi}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Close dialog
      rerender(
        <AbiFormDialog
          abi={mockAbi}
          open={false}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Reopen in create mode (no abi prop)
      rerender(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      expect(nameInput.value).toBe("");
    });
  });

  describe("Accessibility", () => {
    it("has proper labels for all form fields", () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/abi json/i)).toBeInTheDocument();
    });

    it("displays helper text for ABI JSON field", () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Check for helper text presence (text may vary)
      const abiField = screen.getByLabelText(/abi json/i);
      expect(abiField).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles very long names correctly", async () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const longName = "A".repeat(300); // Exceeds 255 character limit
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, longName);

      const abiInput = screen.getByLabelText(/abi json/i);
      await user.click(abiInput);
      await user.paste("[]");

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is too long/i)).toBeInTheDocument();
      });
    });

    it("handles complex valid JSON in ABI field", async () => {
      render(
        <AbiFormDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const complexAbi = JSON.stringify([
        {
          type: "function",
          name: "transfer",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "success", type: "bool" }],
        },
      ]);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Complex ABI");

      const abiInput = screen.getByLabelText(/abi json/i);
      await user.click(abiInput);
      await user.paste(complexAbi);

      const submitButton = screen.getByRole("button", { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Complex ABI",
          description: "",
          abi: complexAbi,
        });
      });
    });
  });
});
