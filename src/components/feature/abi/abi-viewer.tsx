"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, ExternalLink, Download } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface AbiFunction {
  name: string;
  type: "function" | "constructor" | "receive" | "fallback";
  inputs: Array<{
    name: string;
    type: string;
    indexed?: boolean;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
  }>;
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
}

interface AbiEvent {
  name: string;
  type: "event";
  inputs: Array<{
    name: string;
    type: string;
    indexed?: boolean;
  }>;
  anonymous?: boolean;
}

interface AbiViewerProps {
  abi: {
    id: string;
    name: string;
    description?: string;
    contractName?: string;
    version: string;
    standard?: string;
    tags: string[];
    abi: Array<AbiFunction | AbiEvent>;
    abiHash: string;
    ipfsHash?: string;
    ipfsUrl?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export function AbiViewer({ abi }: AbiViewerProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const functions = abi.abi.filter(item => item.type === "function") as AbiFunction[];
  const events = abi.abi.filter(item => item.type === "event") as AbiEvent[];
  const constructor = abi.abi.find(item => item.type === "constructor") as AbiFunction | undefined;
  const receive = abi.abi.find(item => item.type === "receive") as AbiFunction | undefined;
  const fallback = abi.abi.find(item => item.type === "fallback") as AbiFunction | undefined;

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatFunctionSignature = (func: AbiFunction) => {
    const inputs = func.inputs?.map(input => `${input.type} ${input.name}`).join(", ") || "";
    const outputs = func.outputs?.map(output => output.type).join(", ") || "";
    return `${func.name}(${inputs})${outputs ? ` returns (${outputs})` : ""}`;
  };

  const formatEventSignature = (event: AbiEvent) => {
    const inputs = event.inputs?.map(input =>
      `${input.type}${input.indexed ? " indexed" : ""} ${input.name}`
    ).join(", ") || "";
    return `${event.name}(${inputs})`;
  };

  const getStateMutabilityColor = (stateMutability?: string) => {
    switch (stateMutability) {
      case "pure": return "bg-blue-100 text-blue-800";
      case "view": return "bg-green-100 text-green-800";
      case "payable": return "bg-red-100 text-red-800";
      case "nonpayable": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{abi.name}</CardTitle>
              {abi.contractName && (
                <CardDescription>Contract: {abi.contractName}</CardDescription>
              )}
              {abi.description && (
                <CardDescription>{abi.description}</CardDescription>
              )}
            </div>
            <Badge variant="secondary">v{abi.version}</Badge>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {abi.standard && (
              <Badge variant="outline">{abi.standard}</Badge>
            )}
            {abi.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* ABI Hash */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ABI Hash</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {abi.abiHash}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(abi.abiHash, "hash")}
                >
                  <Copy className="h-4 w-4" />
                  {copied === "hash" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            {/* IPFS */}
            {abi.ipfsHash && (
              <div className="space-y-2">
                <label className="text-sm font-medium">IPFS</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                    {abi.ipfsHash}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(abi.ipfsUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Download JSON */}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([JSON.stringify(abi.abi, null, 2)], {
                  type: "application/json"
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${abi.name.replace(/\s+/g, '-').toLowerCase()}-abi.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download ABI JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ABI Details */}
      <Card>
        <CardHeader>
          <CardTitle>ABI Details</CardTitle>
          <CardDescription>
            Explore the functions, events, and other components of this ABI
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="functions" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="functions">
                Functions ({functions.length})
              </TabsTrigger>
              <TabsTrigger value="events">
                Events ({events.length})
              </TabsTrigger>
              <TabsTrigger value="special">
                Special
              </TabsTrigger>
              <TabsTrigger value="raw">
                Raw JSON
              </TabsTrigger>
            </TabsList>

            {/* Functions Tab */}
            <TabsContent value="functions" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {functions.map((func, index) => (
                    <Collapsible key={index}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-3 h-auto text-left"
                        >
                          <div className="space-y-1">
                            <div className="font-mono text-sm">{func.name}</div>
                            <div className="flex gap-2">
                              <Badge
                                variant="secondary"
                                className={getStateMutabilityColor(func.stateMutability)}
                              >
                                {func.stateMutability || "nonpayable"}
                              </Badge>
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3">
                        <div className="space-y-3 text-sm">
                          <div>
                            <code className="block p-2 bg-muted rounded">
                              {formatFunctionSignature(func)}
                            </code>
                          </div>

                          {func.inputs && func.inputs.length > 0 && (
                            <div>
                              <div className="font-medium mb-1">Inputs:</div>
                              {func.inputs.map((input, i) => (
                                <div key={i} className="ml-4 font-mono text-xs">
                                  {input.name}: {input.type}
                                </div>
                              ))}
                            </div>
                          )}

                          {func.outputs && func.outputs.length > 0 && (
                            <div>
                              <div className="font-medium mb-1">Outputs:</div>
                              {func.outputs.map((output, i) => (
                                <div key={i} className="ml-4 font-mono text-xs">
                                  {output.name || `output${i}`}: {output.type}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {events.map((event, index) => (
                    <Collapsible key={index}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-3 h-auto text-left"
                        >
                          <div className="space-y-1">
                            <div className="font-mono text-sm">{event.name}</div>
                            <div className="flex gap-2">
                              <Badge variant="outline">event</Badge>
                              {event.anonymous && (
                                <Badge variant="secondary">anonymous</Badge>
                              )}
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3">
                        <div className="space-y-3 text-sm">
                          <code className="block p-2 bg-muted rounded">
                            {formatEventSignature(event)}
                          </code>

                          {event.inputs && event.inputs.length > 0 && (
                            <div>
                              <div className="font-medium mb-1">Parameters:</div>
                              {event.inputs.map((input, i) => (
                                <div key={i} className="ml-4 font-mono text-xs">
                                  {input.name}: {input.type}
                                  {input.indexed && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      indexed
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Special Functions Tab */}
            <TabsContent value="special" className="mt-4">
              <div className="space-y-4">
                {constructor && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Constructor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="block p-2 bg-muted rounded text-sm">
                        {formatFunctionSignature(constructor)}
                      </code>
                    </CardContent>
                  </Card>
                )}

                {receive && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Receive Function</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={getStateMutabilityColor("payable")}>
                        receive() payable
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {fallback && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Fallback Function</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={getStateMutabilityColor(fallback.stateMutability)}>
                        fallback() {fallback.stateMutability}
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {!constructor && !receive && !fallback && (
                  <div className="text-center text-muted-foreground py-8">
                    No special functions found
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Raw JSON Tab */}
            <TabsContent value="raw" className="mt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Raw ABI JSON</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(JSON.stringify(abi.abi, null, 2), "json")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied === "json" ? "Copied!" : "Copy JSON"}
                  </Button>
                </div>
                <ScrollArea className="h-[400px]">
                  <pre className="p-4 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(abi.abi, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}