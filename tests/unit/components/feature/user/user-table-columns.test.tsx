import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  createUserColumns,
  type User,
} from "@/components/feature/user/user-table-columns";
import { flexRender } from "@tanstack/react-table";

// Mock user data
const mockUser: User = {
  id: "user_v1_123456",
  email: "test@example.com",
  name: "Test User",
  role: "user",
  banned: false,
  banReason: null,
  banExpires: null,
  emailVerified: true,
  createdAt: new Date("2024-01-15T10:30:00Z").toISOString(),
};

const mockAdminUser: User = {
  ...mockUser,
  id: "user_v1_admin",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
};

const mockBannedUser: User = {
  ...mockUser,
  id: "user_v1_banned",
  email: "banned@example.com",
  name: "Banned User",
  banned: true,
  banReason: "Violation of terms",
  banExpires: new Date("2024-12-31T23:59:59Z").toISOString(),
};

const mockUnverifiedUser: User = {
  ...mockUser,
  id: "user_v1_unverified",
  email: "unverified@example.com",
  name: null,
  emailVerified: false,
};

describe("createUserColumns", () => {
  const mockOnView = jest.fn();
  const mockOnChangeRole = jest.fn();
  const mockOnBan = jest.fn();
  const mockOnUnban = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates correct number of columns", () => {
    const columns = createUserColumns({
      onView: mockOnView,
      onChangeRole: mockOnChangeRole,
      onBan: mockOnBan,
      onUnban: mockOnUnban,
    });
    expect(columns).toHaveLength(7); // email, name, role, status, verified, created, actions
  });

  it("creates columns with correct accessorKeys", () => {
    const columns = createUserColumns({
      onView: mockOnView,
      onChangeRole: mockOnChangeRole,
      onBan: mockOnBan,
      onUnban: mockOnUnban,
    });

    expect(columns[0]).toHaveProperty("accessorKey", "email");
    expect(columns[1]).toHaveProperty("accessorKey", "name");
    expect(columns[2]).toHaveProperty("accessorKey", "role");
    expect(columns[3]).toHaveProperty("accessorKey", "banned");
    expect(columns[4]).toHaveProperty("accessorKey", "emailVerified");
    expect(columns[5]).toHaveProperty("accessorKey", "createdAt");
  });

  describe("Email column", () => {
    it("renders email with sortable header", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const emailColumn = columns[0];

      const headerContext = {
        column: {
          toggleSorting: jest.fn(),
          getIsSorted: jest.fn(() => false),
        },
      } as any;

      const { container } = render(
        <>{flexRender(emailColumn.header, headerContext)}</>
      );

      expect(container).toHaveTextContent("Email");
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("Name column", () => {
    it("renders name when available", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const nameColumn = columns[1];

      if (!nameColumn.cell) {
        fail("Name column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUser },
      } as any;

      const { container } = render(
        <>{flexRender(nameColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("Test User");
    });

    it("renders dash when name is null", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const nameColumn = columns[1];

      if (!nameColumn.cell) {
        fail("Name column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUnverifiedUser },
      } as any;

      const { container } = render(
        <>{flexRender(nameColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("-");
    });
  });

  describe("Role column", () => {
    it("renders user role badge", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const roleColumn = columns[2];

      if (!roleColumn.cell) {
        fail("Role column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUser },
      } as any;

      const { container } = render(
        <>{flexRender(roleColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("user");
    });

    it("renders admin role badge", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const roleColumn = columns[2];

      if (!roleColumn.cell) {
        fail("Role column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAdminUser },
      } as any;

      const { container } = render(
        <>{flexRender(roleColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("admin");
    });
  });

  describe("Status column", () => {
    it("renders Active status for non-banned users", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const statusColumn = columns[3];

      if (!statusColumn.cell) {
        fail("Status column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUser },
      } as any;

      const { container } = render(
        <>{flexRender(statusColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("Active");
    });

    it("renders Banned status for banned users", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const statusColumn = columns[3];

      if (!statusColumn.cell) {
        fail("Status column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockBannedUser },
      } as any;

      const { container } = render(
        <>{flexRender(statusColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("Banned");
    });
  });

  describe("Email Verified column", () => {
    it("renders Yes for verified users", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const verifiedColumn = columns[4];

      if (!verifiedColumn.cell) {
        fail("Verified column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUser },
      } as any;

      const { container } = render(
        <>{flexRender(verifiedColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("Yes");
    });

    it("renders No for unverified users", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const verifiedColumn = columns[4];

      if (!verifiedColumn.cell) {
        fail("Verified column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUnverifiedUser },
      } as any;

      const { container } = render(
        <>{flexRender(verifiedColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("No");
    });
  });

  describe("Created At column", () => {
    it("renders formatted date", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const createdColumn = columns[5];

      if (!createdColumn.cell) {
        fail("Created column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUser },
      } as any;

      const { container } = render(
        <>{flexRender(createdColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("1/15/2024");
    });

    it("has sortable header", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const createdColumn = columns[5];

      const headerContext = {
        column: {
          toggleSorting: jest.fn(),
          getIsSorted: jest.fn(() => false),
        },
      } as any;

      const { container } = render(
        <>{flexRender(createdColumn.header, headerContext)}</>
      );

      expect(container).toHaveTextContent("Created");
    });
  });

  describe("Actions column", () => {
    it("renders all action buttons for non-banned user", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const actionsColumn = columns[6];

      if (!actionsColumn.cell) {
        fail("Actions column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUser },
      } as any;

      render(<>{flexRender(actionsColumn.cell, cellContext)}</>);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3); // View, Change Role, Ban
    });

    it("renders unban button for banned user", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const actionsColumn = columns[6];

      if (!actionsColumn.cell) {
        fail("Actions column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockBannedUser },
      } as any;

      render(<>{flexRender(actionsColumn.cell, cellContext)}</>);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3); // View, Change Role, Unban
    });

    it("calls onView when View button is clicked", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const actionsColumn = columns[6];

      if (!actionsColumn.cell) {
        fail("Actions column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUser },
      } as any;

      render(<>{flexRender(actionsColumn.cell, cellContext)}</>);

      const buttons = screen.getAllByRole("button");
      buttons[0].click(); // View button is first

      expect(mockOnView).toHaveBeenCalledWith(mockUser);
    });

    it("calls onChangeRole when Role button is clicked", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const actionsColumn = columns[6];

      if (!actionsColumn.cell) {
        fail("Actions column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUser },
      } as any;

      render(<>{flexRender(actionsColumn.cell, cellContext)}</>);

      const buttons = screen.getAllByRole("button");
      buttons[1].click(); // Role button is second

      expect(mockOnChangeRole).toHaveBeenCalledWith(mockUser);
    });

    it("calls onBan when Ban button is clicked", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const actionsColumn = columns[6];

      if (!actionsColumn.cell) {
        fail("Actions column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockUser },
      } as any;

      render(<>{flexRender(actionsColumn.cell, cellContext)}</>);

      const buttons = screen.getAllByRole("button");
      buttons[2].click(); // Ban button is third

      expect(mockOnBan).toHaveBeenCalledWith(mockUser);
    });

    it("calls onUnban when Unban button is clicked", () => {
      const columns = createUserColumns({
        onView: mockOnView,
        onChangeRole: mockOnChangeRole,
        onBan: mockOnBan,
        onUnban: mockOnUnban,
      });
      const actionsColumn = columns[6];

      if (!actionsColumn.cell) {
        fail("Actions column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockBannedUser },
      } as any;

      render(<>{flexRender(actionsColumn.cell, cellContext)}</>);

      const buttons = screen.getAllByRole("button");
      buttons[2].click(); // Unban button is third

      expect(mockOnUnban).toHaveBeenCalledWith(mockBannedUser);
    });
  });

  it("has correct column headers", () => {
    const columns = createUserColumns({
      onView: mockOnView,
      onChangeRole: mockOnChangeRole,
      onBan: mockOnBan,
      onUnban: mockOnUnban,
    });

    // Email and Created have custom headers (buttons), check others
    expect(columns[1].header).toBe("Name");
    expect(columns[2].header).toBe("Role");
    expect(columns[3].header).toBe("Status");
    expect(columns[4].header).toBe("Verified");
    expect(columns[6].header).toBe("Actions");
  });
});
