"use client";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Database, Zap, Globe } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useClipboard } from "@/hooks/use-clipboard";

export default function HomePage() {
  const [issuing, setIssuing] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const { copy, hasCopied } = useClipboard();

  async function handleGeneratePublicKey() {
    try {
      setIssuing(true);
      setIssuedKey(null);
      const res = await fetch("/api/keys/public", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to generate API key");
      }
      const data = await res.json();
      const key = data?.data?.key || data?.key;
      if (key) {
        setIssuedKey(key);
      }
    } finally {
      setIssuing(false);
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Zuno Marketplace
            <span className="block text-blue-600">ABIs</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Central registry for developers to store, manage, and share Smart
            Contract ABIs across multiple blockchain networks. Secure,
            versioned, and IPFS-backed.
          </p>

          <div className="flex flex-col gap-4 items-center justify-center">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleGeneratePublicKey}
              disabled={issuing}
            >
              {issuing ? "Generating..." : "Get Public API Key"}
            </Button>
            {issuedKey && (
              <div className="w-full max-w-2xl">
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 rounded bg-gray-100 text-sm text-gray-900 break-all">
                    {issuedKey}
                  </code>
                  <Button
                    variant="outline"
                    onClick={() => copy(issuedKey)}
                    className="shrink-0"
                  >
                    {hasCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Use this key via header: <code>X-API-Key: &lt;key&gt;</code>
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">Multi-chain</Badge>
            <Badge variant="secondary">Version Control</Badge>
            <Badge variant="secondary">IPFS Storage</Badge>
            <Badge variant="secondary">API Access</Badge>
          </div>
        </div>
      </section>
    </div>
  );
}
