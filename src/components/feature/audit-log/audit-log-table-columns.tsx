import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import type { AuditLogEntity } from "@/core/domain/audit-log/audit-log.entity";

interface CreateColumnsProps {
  onView: (log: AuditLogEntity) => void;
}

export function createAuditLogColumns({
  onView,
}: CreateColumnsProps): ColumnDef<AuditLogEntity>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{new Date(row.original.createdAt).toLocaleDateString()}</div>
          <div className="text-muted-foreground text-xs">
            {new Date(row.original.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.method}
        </Badge>
      ),
    },
    {
      accessorKey: "path",
      header: "Path",
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-sm truncate block max-w-[200px] cursor-help">
                {row.original.path}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md">
              <p className="font-mono text-xs break-all">{row.original.path}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.action}</Badge>
      ),
    },
    {
      accessorKey: "statusCode",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.statusCode;
        const variant =
          status >= 500
            ? "destructive"
            : status >= 400
            ? "default"
            : "secondary";

        return (
          <Badge variant={variant} className="font-mono">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {row.original.duration ? `${row.original.duration}ms` : "-"}
        </div>
      ),
    },
    {
      accessorKey: "userId",
      header: "User",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.userId ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-mono text-xs cursor-help">
                    {row.original.userId.slice(0, 8)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-mono text-xs">{row.original.userId}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : row.original.apiKeyId ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs cursor-help">
                    API Key
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-mono text-xs">{row.original.apiKeyId}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(row.original)}
        >
          View
        </Button>
      ),
    },
  ];
}
