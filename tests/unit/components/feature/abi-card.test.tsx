import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AbiCard } from "@/components/ui/abi-card";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

const mockAbi = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Test Token",
  description: "A test ERC20 token",
  contractName: "TestToken",
  version: "1.0.0",
  standard: "ERC20",
  tags: ["token", "erc20"],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  abiHash: "abc123def456789",
  ipfsHash: "QmTest123",
};

describe("AbiCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders ABI information correctly", () => {
    render(<AbiCard abi={mockAbi} />);

    expect(screen.getByText("Test Token")).toBeInTheDocument();
    expect(screen.getByText("Contract: TestToken")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("A test ERC20 token")).toBeInTheDocument();
    expect(screen.getByText("ERC20")).toBeInTheDocument();
    expect(screen.getByText("token")).toBeInTheDocument();
    expect(screen.getByText("erc20")).toBeInTheDocument();
  });

  it("displays ABI hash correctly", () => {
    render(<AbiCard abi={mockAbi} />);

    expect(screen.getByText("abc123def456789")).toBeInTheDocument();
    expect(screen.getByText("ABI Hash")).toBeInTheDocument();
  });

  it("shows IPFS hash when available", () => {
    render(<AbiCard abi={mockAbi} />);

    expect(screen.getByText("QmTest123")).toBeInTheDocument();
    expect(screen.getByText("IPFS")).toBeInTheDocument();
  });

  it("hides IPFS section when hash not available", () => {
    const abiWithoutIpfs = { ...mockAbi, ipfsHash: undefined };
    render(<AbiCard abi={abiWithoutIpfs} />);

    expect(screen.queryByText("IPFS")).not.toBeInTheDocument();
  });

  it("copies ABI hash to clipboard when copy button is clicked", async () => {
    const mockCopy = jest.fn();
    render(<AbiCard abi={mockAbi} onCopy={mockCopy} />);

    const copyButton = screen.getAllByRole("button")[0]; // First copy button (for hash)
    fireEvent.click(copyButton);

    expect(mockCopy).toHaveBeenCalledWith("abc123def456789");

    await waitFor(() => {
      expect(screen.getByText("Copied to clipboard!")).toBeInTheDocument();
    });
  });

  it("calls onView when View button is clicked", () => {
    const mockOnView = jest.fn();
    render(<AbiCard abi={mockAbi} onView={mockOnView} />);

    const viewButton = screen.getByRole("button", { name: /view/i });
    fireEvent.click(viewButton);

    expect(mockOnView).toHaveBeenCalledWith(mockAbi.id);
  });

  it("calls onEdit when Edit button is clicked", () => {
    const mockOnEdit = jest.fn();
    render(<AbiCard abi={mockAbi} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole("button", { name: /edit abi/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockAbi.id);
  });

  it("calls onDelete when Delete button is clicked", () => {
    const mockOnDelete = jest.fn();
    render(<AbiCard abi={mockAbi} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole("button", { name: /delete abi/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockAbi.id);
  });

  it("hides actions when showActions is false", () => {
    render(<AbiCard abi={mockAbi} showActions={false} />);

    expect(
      screen.queryByRole("button", { name: /view/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete/i })
    ).not.toBeInTheDocument();
  });

  it("shows only available action buttons", () => {
    const mockOnView = jest.fn();
    render(<AbiCard abi={mockAbi} onView={mockOnView} />);

    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete/i })
    ).not.toBeInTheDocument();
  });

  it("formats dates correctly", () => {
    render(<AbiCard abi={mockAbi} />);

    expect(screen.getByText(/Created: Jan 1, 2024/)).toBeInTheDocument();
  });

  it("shows updated date when different from created date", () => {
    const abiWithUpdate = {
      ...mockAbi,
      updatedAt: "2024-01-02T00:00:00Z",
    };
    render(<AbiCard abi={abiWithUpdate} />);

    expect(
      screen.getByText(/Created: Jan 1, 2024 • Updated: Jan 2, 2024/)
    ).toBeInTheDocument();
  });

  it("opens IPFS link in new window when download button is clicked", () => {
    const mockOpen = jest.fn();
    global.window.open = mockOpen;

    render(<AbiCard abi={mockAbi} />);

    const downloadButton = screen.getByRole("button", {
      name: /download from ipfs/i,
    });
    fireEvent.click(downloadButton);

    expect(mockOpen).toHaveBeenCalledWith(
      "https://ipfs.io/ipfs/QmTest123",
      "_blank"
    );
  });

  it("handles ABI without description", () => {
    const abiWithoutDescription = { ...mockAbi, description: undefined };
    render(<AbiCard abi={abiWithoutDescription} />);

    expect(screen.getByText("Test Token")).toBeInTheDocument();
    expect(screen.queryByText("A test ERC20 token")).not.toBeInTheDocument();
  });

  it("handles ABI without contract name", () => {
    const abiWithoutContractName = { ...mockAbi, contractName: undefined };
    render(<AbiCard abi={abiWithoutContractName} />);

    expect(screen.getByText("Test Token")).toBeInTheDocument();
    expect(screen.queryByText(/Contract:/)).not.toBeInTheDocument();
  });

  it("handles ABI without standard", () => {
    const abiWithoutStandard = { ...mockAbi, standard: undefined };
    render(<AbiCard abi={abiWithoutStandard} />);

    expect(screen.getByText("Test Token")).toBeInTheDocument();
    expect(screen.queryByText("ERC20")).not.toBeInTheDocument();
  });

  it("handles empty tags array", () => {
    const abiWithoutTags = { ...mockAbi, tags: [] };
    render(<AbiCard abi={abiWithoutTags} />);

    expect(screen.getByText("Test Token")).toBeInTheDocument();
    expect(screen.queryByText("token")).not.toBeInTheDocument();
    expect(screen.queryByText("erc20")).not.toBeInTheDocument();
  });
});
