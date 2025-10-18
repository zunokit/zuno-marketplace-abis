"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Copy, Download, Edit, Trash2 } from "lucide-react";
import { useState } from "react";

interface AbiCardProps {
  abi: {
    id: string;
    name: string;
    description?: string;
    contractName?: string;
    version: string;
    standard?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    abiHash: string;
    ipfsHash?: string;
  };
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCopy?: (hash: string) => void;
  showActions?: boolean;
}

export function AbiCard({
  abi,
  onView,
  onEdit,
  onDelete,
  onCopy,
  showActions = true,
}: AbiCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(abi.abiHash);
    } else {
      await navigator.clipboard.writeText(abi.abiHash);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{abi.name}</CardTitle>
            {abi.contractName && (
              <CardDescription className="text-sm text-muted-foreground">
                Contract: {abi.contractName}
              </CardDescription>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            v{abi.version}
          </Badge>
        </div>

        {abi.description && (
          <CardDescription className="line-clamp-2">
            {abi.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Standard & Tags */}
          <div className="flex flex-wrap gap-2">
            {abi.standard && (
              <Badge variant="outline" className="text-xs">
                {abi.standard}
              </Badge>
            )}
            {abi.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Hash */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">ABI Hash</div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                {abi.abiHash}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0"
                aria-label="Copy ABI hash"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            {copied && (
              <div className="text-xs text-green-600">Copied to clipboard!</div>
            )}
          </div>

          {/* IPFS Link */}
          {abi.ipfsHash && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">IPFS</div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {abi.ipfsHash}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `https://ipfs.io/ipfs/${abi.ipfsHash}`,
                      "_blank"
                    )
                  }
                  className="h-6 w-6 p-0"
                  aria-label="Download from IPFS"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="text-xs text-muted-foreground">
            Created: {formatDate(abi.createdAt)}
            {abi.updatedAt !== abi.createdAt && (
              <> • Updated: {formatDate(abi.updatedAt)}</>
            )}
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView?.(abi.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>

          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(abi.id)}
              aria-label="Edit ABI"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}

          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(abi.id)}
              className="text-destructive hover:text-destructive"
              aria-label="Delete ABI"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
