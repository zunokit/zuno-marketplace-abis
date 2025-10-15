import { z } from "zod";
import { ApiWrapper, withPagination } from "@/shared/lib/api/api-handler";

// Validation schemas
const ListNetworksSchema = withPagination(z.object({
  type: z.enum(["mainnet", "testnet", "local"]).optional(),
  isActive: z.enum(["true", "false"]).optional(),
}));

// GET /api/v1/networks - List blockchain networks
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListNetworksSchema>, context) => {
    // TODO: Implement with actual repositories
    // Mock response for now
    return {
      data: [
        {
          id: "ethereum-mainnet",
          chainId: 1,
          name: "Ethereum Mainnet",
          slug: "ethereum",
          type: "mainnet",
          isTestnet: false,
          rpcUrls: ["https://eth.llamarpc.com"],
          explorerUrls: ["https://etherscan.io"],
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          isActive: true,
          icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        },
        {
          id: "polygon-mainnet",
          chainId: 137,
          name: "Polygon Mainnet",
          slug: "polygon",
          type: "mainnet",
          isTestnet: false,
          rpcUrls: ["https://polygon.llamarpc.com"],
          explorerUrls: ["https://polygonscan.com"],
          nativeCurrency: {
            name: "MATIC",
            symbol: "MATIC",
            decimals: 18,
          },
          isActive: true,
          icon: "https://cryptologos.cc/logos/polygon-matic-logo.png",
        },
        {
          id: "sepolia-testnet",
          chainId: 11155111,
          name: "Sepolia Testnet",
          slug: "sepolia",
          type: "testnet",
          isTestnet: true,
          rpcUrls: ["https://sepolia.infura.io/v3/"],
          explorerUrls: ["https://sepolia.etherscan.io"],
          nativeCurrency: {
            name: "Sepolia Ether",
            symbol: "ETH",
            decimals: 18,
          },
          isActive: true,
          icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        },
      ],
      pagination: {
        page: input.page,
        limit: input.limit,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  },
  {
    validation: {
      query: ListNetworksSchema,
    },
    auth: {
      required: false, // Public endpoint
    },
  }
);