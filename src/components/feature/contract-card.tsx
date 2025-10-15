"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ExternalLink, Shield, ShieldCheck, Copy } from "lucide-react";
import { useState } from "react";

interface ContractCardProps {
  contract: {
    id: string;
    address: string;
    name?: string;
    type?: string;
    networkId: string;
    networkName: string;
    networkSlug: string;
    explorerUrl?: string;
    isVerified: boolean;
    verificationSource?: string;
    metadata?: {
      symbol?: string;
      totalSupply?: string;
      decimals?: number;
      isProxy?: boolean;
    };
    deployedAt?: string;
    deployer?: string;
    createdAt: string;
  };
  onView?: (id: string) => void;
  onViewAbi?: (id: string) => void;
  showActions?: boolean;
}

export function ContractCard({
  contract,
  onView,
  onViewAbi,
  showActions = true
}: ContractCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(contract.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatSupply = (supply?: string) => {
    if (!supply) return null;
    const num = parseFloat(supply);
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "token": return "bg-green-100 text-green-800";
      case "nft": return "bg-purple-100 text-purple-800";
      case "defi": return "bg-blue-100 text-blue-800";
      case "dao": return "bg-orange-100 text-orange-800";
      case "bridge": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {contract.name || "Unnamed Contract"}
              {contract.isVerified ? (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              ) : (
                <Shield className="h-4 w-4 text-gray-400" />
              )}
            </CardTitle>

            <CardDescription className="flex items-center gap-2">
              <code
                className="text-sm bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80"
                onClick={handleCopyAddress}
                title="Click to copy address"
              >
                {formatAddress(contract.address)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAddress}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
              {copied && (
                <span className="text-xs text-green-600">Copied!</span>
              )}
            </CardDescription>
          </div>

          <div className="text-right space-y-1">
            <Badge
              variant="secondary"
              className="text-xs"
            >
              {contract.networkName}
            </Badge>
            {contract.type && (
              <Badge
                variant="secondary"
                className={`text-xs ${getTypeColor(contract.type)}`}
              >
                {contract.type.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Verification Status */}
          <div className="flex items-center gap-2">
            {contract.isVerified ? (
              <>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
                {contract.verificationSource && (
                  <span className="text-xs text-muted-foreground">
                    via {contract.verificationSource}
                  </span>
                )}
              </>
            ) : (
              <Badge variant="outline" className="text-gray-500 border-gray-300">
                <Shield className="h-3 w-3 mr-1" />
                Unverified
              </Badge>
            )}
          </div>

          {/* Metadata */}
          {contract.metadata && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {contract.metadata.symbol && (
                <div>
                  <span className="text-muted-foreground">Symbol:</span>
                  <span className="ml-1 font-mono">{contract.metadata.symbol}</span>
                </div>
              )}

              {contract.metadata.decimals !== undefined && (
                <div>
                  <span className="text-muted-foreground">Decimals:</span>
                  <span className="ml-1 font-mono">{contract.metadata.decimals}</span>
                </div>
              )}

              {contract.metadata.totalSupply && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Total Supply:</span>
                  <span className="ml-1 font-mono">
                    {formatSupply(contract.metadata.totalSupply)}
                  </span>
                </div>
              )}

              {contract.metadata.isProxy && (
                <div className="col-span-2">
                  <Badge variant="outline" className="text-xs">
                    Proxy Contract
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Deployer */}
          {contract.deployer && (
            <div className="text-sm">
              <span className="text-muted-foreground">Deployer:</span>
              <code className="ml-1 text-xs bg-muted px-2 py-1 rounded">
                {formatAddress(contract.deployer)}
              </code>
            </div>
          )}

          {/* Dates */}
          <div className="text-xs text-muted-foreground">
            {contract.deployedAt && (
              <>Deployed: {formatDate(contract.deployedAt)} • </>
            )}
            Registered: {formatDate(contract.createdAt)}
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView?.(contract.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>

          {onViewAbi && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewAbi(contract.id)}
            >
              View ABI
            </Button>
          )}

          {contract.explorerUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(
                `${contract.explorerUrl}/address/${contract.address}`,
                '_blank'
              )}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}