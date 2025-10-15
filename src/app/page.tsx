import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, Shield, Database, Zap, Globe } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
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
            Central registry for developers to store, manage, and share Smart Contract ABIs
            across multiple blockchain networks. Secure, versioned, and IPFS-backed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/abis">
              <Button size="lg" className="w-full sm:w-auto">
                <Search className="mr-2 h-5 w-5" />
                Browse ABIs
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Upload className="mr-2 h-5 w-5" />
                Upload ABI
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">Multi-chain</Badge>
            <Badge variant="secondary">Version Control</Badge>
            <Badge variant="secondary">IPFS Storage</Badge>
            <Badge variant="secondary">API Access</Badge>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Zuno ABI Marketplace?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built for developers, by developers. Our platform provides everything you need
              to manage smart contract ABIs efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Globe className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>Multi-chain Support</CardTitle>
                <CardDescription>
                  Support for Ethereum, Polygon, BSC, Arbitrum, and more.
                  One ABI can be used across multiple networks.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Database className="h-10 w-10 text-green-600 mb-4" />
                <CardTitle>Version Control</CardTitle>
                <CardDescription>
                  Full version history with semantic versioning. Track changes,
                  compare versions, and maintain backward compatibility.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-purple-600 mb-4" />
                <CardTitle>IPFS Backup</CardTitle>
                <CardDescription>
                  All ABIs are automatically backed up to IPFS for permanent,
                  decentralized storage and content addressing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-orange-600 mb-4" />
                <CardTitle>API Access</CardTitle>
                <CardDescription>
                  RESTful API with authentication, rate limiting, and versioning.
                  Perfect for CI/CD integration and automated workflows.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-red-600 mb-4" />
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  Role-based access control, API key management, and comprehensive
                  audit logging for enterprise compliance.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Database className="h-10 w-10 text-indigo-600 mb-4" />
                <CardTitle>Standards Validation</CardTitle>
                <CardDescription>
                  Built-in validation for ERC20, ERC721, ERC1155, and other
                  standard interfaces. Ensure compliance automatically.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who trust Zuno ABI Marketplace
            for their smart contract development workflow.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Sign Up Free
              </Button>
            </Link>

            <Link href="/api/auth/reference">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-600">
                View API Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
