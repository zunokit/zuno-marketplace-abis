import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createAuditLogColumns } from "@/components/feature/audit-log/audit-log-table-columns";
import type { AuditLogEntity } from "@/core/domain/audit-log/audit-log.entity";
import { flexRender } from "@tanstack/react-table";

// Mock audit log data
const mockAuditLog: AuditLogEntity = {
  id: "log_v1_123456",
  method: "GET",
  path: "/api/contracts",
  action: "list_contracts",
  statusCode: 200,
  duration: 125,
  userId: "user_v1_abc123",
  apiKeyId: null,
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  resourceType: null,
  resourceId: null,
  metadata: { responseSize: 1024 },
  createdAt: new Date("2024-01-15T10:30:00Z"),
};

const mockAuditLogWithApiKey: AuditLogEntity = {
  ...mockAuditLog,
  id: "log_v1_789012",
  userId: null,
  apiKeyId: "key_v1_xyz789",
};

const mockAuditLogError: AuditLogEntity = {
  ...mockAuditLog,
  id: "log_v1_error",
  statusCode: 500,
  duration: null,
};

describe("createAuditLogColumns", () => {
  const mockOnView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates correct number of columns", () => {
    const columns = createAuditLogColumns({ onView: mockOnView });
    expect(columns).toHaveLength(8); // timestamp, method, path, action, status, duration, user, actions
  });

  it("creates columns with correct accessorKeys", () => {
    const columns = createAuditLogColumns({ onView: mockOnView });

    expect(columns[0]).toHaveProperty("accessorKey", "createdAt");
    expect(columns[1]).toHaveProperty("accessorKey", "method");
    expect(columns[2]).toHaveProperty("accessorKey", "path");
    expect(columns[3]).toHaveProperty("accessorKey", "action");
    expect(columns[4]).toHaveProperty("accessorKey", "statusCode");
    expect(columns[5]).toHaveProperty("accessorKey", "duration");
    expect(columns[6]).toHaveProperty("accessorKey", "userId");
  });

  describe("Timestamp column", () => {
    it("renders date and time correctly", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const timestampColumn = columns[0];

      if (!timestampColumn.cell) {
        fail("Timestamp column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLog },
      } as any;

      const { container } = render(
        <>{flexRender(timestampColumn.cell, cellContext)}</>
      );

      // Check that date is displayed (format varies by locale)
      expect(container).toHaveTextContent(/1\/15\/2024|15\/1\/2024|2024\/1\/15/);
      // Check that time is displayed (format varies by locale and timezone)
      expect(container.textContent).toMatch(/\d{1,2}:\d{2}/); // HH:MM format
    });
  });

  describe("Method column", () => {
    it("renders method badge", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const methodColumn = columns[1];

      if (!methodColumn.cell) {
        fail("Method column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLog },
      } as any;

      const { container } = render(
        <>{flexRender(methodColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("GET");
    });
  });

  describe("Path column", () => {
    it("renders path with tooltip for long paths", () => {
      const longPathLog = {
        ...mockAuditLog,
        path: "/api/contracts/0x1234567890123456789012345678901234567890/versions",
      };

      const columns = createAuditLogColumns({ onView: mockOnView });
      const pathColumn = columns[2];

      if (!pathColumn.cell) {
        fail("Path column should have a cell renderer");
      }

      const cellContext = {
        row: { original: longPathLog },
      } as any;

      const { container } = render(
        <>{flexRender(pathColumn.cell, cellContext)}</>
      );

      expect(container.textContent).toContain("/api/contracts/");
    });
  });

  describe("Status code column", () => {
    it("renders success status code with correct variant", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const statusColumn = columns[4];

      if (!statusColumn.cell) {
        fail("Status column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLog },
      } as any;

      const { container } = render(
        <>{flexRender(statusColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("200");
    });

    it("renders error status code with destructive variant", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const statusColumn = columns[4];

      if (!statusColumn.cell) {
        fail("Status column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLogError },
      } as any;

      const { container } = render(
        <>{flexRender(statusColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("500");
    });

    it("renders 4xx status codes correctly", () => {
      const notFoundLog = { ...mockAuditLog, statusCode: 404 };
      const columns = createAuditLogColumns({ onView: mockOnView });
      const statusColumn = columns[4];

      if (!statusColumn.cell) {
        fail("Status column should have a cell renderer");
      }

      const cellContext = {
        row: { original: notFoundLog },
      } as any;

      const { container } = render(
        <>{flexRender(statusColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("404");
    });
  });

  describe("Duration column", () => {
    it("renders duration in milliseconds", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const durationColumn = columns[5];

      if (!durationColumn.cell) {
        fail("Duration column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLog },
      } as any;

      const { container } = render(
        <>{flexRender(durationColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("125ms");
    });

    it("renders dash when duration is null", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const durationColumn = columns[5];

      if (!durationColumn.cell) {
        fail("Duration column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLogError },
      } as any;

      const { container } = render(
        <>{flexRender(durationColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("-");
    });
  });

  describe("User column", () => {
    it("renders truncated user ID with tooltip", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const userColumn = columns[6];

      if (!userColumn.cell) {
        fail("User column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLog },
      } as any;

      const { container } = render(
        <>{flexRender(userColumn.cell, cellContext)}</>
      );

      expect(container.textContent).toContain("user_v1_");
    });

    it("renders API Key badge when userId is null", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const userColumn = columns[6];

      if (!userColumn.cell) {
        fail("User column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLogWithApiKey },
      } as any;

      const { container } = render(
        <>{flexRender(userColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("API Key");
    });

    it("renders dash when both userId and apiKeyId are null", () => {
      const anonymousLog = {
        ...mockAuditLog,
        userId: null,
        apiKeyId: null,
      };

      const columns = createAuditLogColumns({ onView: mockOnView });
      const userColumn = columns[6];

      if (!userColumn.cell) {
        fail("User column should have a cell renderer");
      }

      const cellContext = {
        row: { original: anonymousLog },
      } as any;

      const { container } = render(
        <>{flexRender(userColumn.cell, cellContext)}</>
      );

      expect(container).toHaveTextContent("-");
    });
  });

  describe("Actions column", () => {
    it("renders View button", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const actionsColumn = columns[7];

      if (!actionsColumn.cell) {
        fail("Actions column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLog },
      } as any;

      render(<>{flexRender(actionsColumn.cell, cellContext)}</>);

      expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
    });

    it("calls onView handler when View button is clicked", () => {
      const columns = createAuditLogColumns({ onView: mockOnView });
      const actionsColumn = columns[7];

      if (!actionsColumn.cell) {
        fail("Actions column should have a cell renderer");
      }

      const cellContext = {
        row: { original: mockAuditLog },
      } as any;

      render(<>{flexRender(actionsColumn.cell, cellContext)}</>);

      const viewButton = screen.getByRole("button", { name: /view/i });
      viewButton.click();

      expect(mockOnView).toHaveBeenCalledWith(mockAuditLog);
    });
  });

  it("has correct column headers", () => {
    const columns = createAuditLogColumns({ onView: mockOnView });

    expect(columns[0].header).toBe("Timestamp");
    expect(columns[1].header).toBe("Method");
    expect(columns[2].header).toBe("Path");
    expect(columns[3].header).toBe("Action");
    expect(columns[4].header).toBe("Status");
    expect(columns[5].header).toBe("Duration");
    expect(columns[6].header).toBe("User");
    expect(columns[7].header).toBe("Actions");
  });

  it("handles missing metadata gracefully", () => {
    const logWithoutMetadata = {
      ...mockAuditLog,
      metadata: null,
    };

    const columns = createAuditLogColumns({ onView: mockOnView });

    // Should not throw error when rendering any column
    columns.forEach((column, index) => {
      if (column.cell) {
        const cellContext = {
          row: { original: logWithoutMetadata },
        } as any;

        expect(() => {
          render(<>{flexRender(column.cell, cellContext)}</>);
        }).not.toThrow();
      }
    });
  });
});
