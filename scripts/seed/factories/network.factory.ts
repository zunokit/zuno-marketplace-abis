/**
 * Network Factory
 * Professional factory for creating network data
 */

import { SeedFactory } from '../types';
import { IdGenerator, EntityPrefix } from '@/shared/lib/utils/id-generator';

export interface NetworkData {
  id: string;
  chainId: number;
  name: string;
  slug: string;
  type: 'mainnet' | 'testnet';
  isTestnet: boolean;
  rpcUrls: string[];
  explorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isActive: boolean;
  icon: string;
}

export class NetworkFactory implements SeedFactory<NetworkData> {
  private currentState: string = 'default';

  create(overrides: Partial<NetworkData> = {}): NetworkData {
    const baseData = this.getBaseData();
    return { ...baseData, ...overrides };
  }

  createMany(count: number, overrides: Partial<NetworkData> = {}): NetworkData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  state(state: string): NetworkFactory {
    this.currentState = state;
    return this;
  }

  private getBaseData(): NetworkData {
    switch (this.currentState) {
      case 'anvil':
        return this.getAnvilData();
      case 'ethereum':
        return this.getEthereumData();
      case 'polygon':
        return this.getPolygonData();
      case 'bsc':
        return this.getBSCData();
      case 'arbitrum':
        return this.getArbitrumData();
      case 'optimism':
        return this.getOptimismData();
      case 'base':
        return this.getBaseNetworkData();
      case 'testnet':
        return this.getTestnetData();
      default:
        return this.getDefaultData();
    }
  }

  private getEthereumData(): NetworkData {
    return {
      id: IdGenerator.generate({ prefix: EntityPrefix.NETWORK, apiVersion: 'v1' }),
      chainId: 1,
      name: 'Ethereum Mainnet',
      slug: 'ethereum',
      type: 'mainnet',
      isTestnet: false,
      rpcUrls: [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com',
        'https://eth-mainnet.g.alchemy.com/v2/demo'
      ],
      explorerUrls: [
        'https://etherscan.io',
        'https://eth.blockscout.com'
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      isActive: true,
      icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png'
    };
  }

  private getPolygonData(): NetworkData {
    return {
      id: IdGenerator.generate({ prefix: EntityPrefix.NETWORK, apiVersion: 'v1' }),
      chainId: 137,
      name: 'Polygon Mainnet',
      slug: 'polygon',
      type: 'mainnet',
      isTestnet: false,
      rpcUrls: [
        'https://polygon.llamarpc.com',
        'https://rpc.ankr.com/polygon',
        'https://polygon-rpc.com'
      ],
      explorerUrls: [
        'https://polygonscan.com',
        'https://polygon.blockscout.com'
      ],
      nativeCurrency: {
        name: 'Polygon',
        symbol: 'MATIC',
        decimals: 18
      },
      isActive: true,
      icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png'
    };
  }

  private getBSCData(): NetworkData {
    return {
      id: IdGenerator.generate({ prefix: EntityPrefix.NETWORK, apiVersion: 'v1' }),
      chainId: 56,
      name: 'BNB Smart Chain',
      slug: 'bsc',
      type: 'mainnet',
      isTestnet: false,
      rpcUrls: [
        'https://bsc.llamarpc.com',
        'https://rpc.ankr.com/bsc',
        'https://bsc-dataseed.binance.org'
      ],
      explorerUrls: [
        'https://bscscan.com',
        'https://bsc.blockscout.com'
      ],
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      },
      isActive: true,
      icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png'
    };
  }

  private getArbitrumData(): NetworkData {
    return {
      id: IdGenerator.generate({ prefix: EntityPrefix.NETWORK, apiVersion: 'v1' }),
      chainId: 42161,
      name: 'Arbitrum One',
      slug: 'arbitrum',
      type: 'mainnet',
      isTestnet: false,
      rpcUrls: [
        'https://arb1.arbitrum.io/rpc',
        'https://rpc.ankr.com/arbitrum',
        'https://arbitrum.publicnode.com'
      ],
      explorerUrls: [
        'https://arbiscan.io',
        'https://arbitrum.blockscout.com'
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      isActive: true,
      icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png'
    };
  }

  private getOptimismData(): NetworkData {
    return {
      id: IdGenerator.generate({ prefix: EntityPrefix.NETWORK, apiVersion: 'v1' }),
      chainId: 10,
      name: 'Optimism',
      slug: 'optimism',
      type: 'mainnet',
      isTestnet: false,
      rpcUrls: [
        'https://mainnet.optimism.io',
        'https://rpc.ankr.com/optimism',
        'https://optimism.publicnode.com'
      ],
      explorerUrls: [
        'https://optimistic.etherscan.io',
        'https://optimism.blockscout.com'
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      isActive: true,
      icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png'
    };
  }

  private getBaseNetworkData(): NetworkData {
    return {
      id: IdGenerator.generate({ prefix: EntityPrefix.NETWORK, apiVersion: 'v1' }),
      chainId: 8453,
      name: 'Base',
      slug: 'base',
      type: 'mainnet',
      isTestnet: false,
      rpcUrls: [
        'https://mainnet.base.org',
        'https://base.publicnode.com'
      ],
      explorerUrls: [
        'https://basescan.org',
        'https://base.blockscout.com'
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      isActive: true,
      icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png'
    };
  }

  private getAnvilData(): NetworkData {
    return {
      id: IdGenerator.generate({ prefix: EntityPrefix.NETWORK, apiVersion: 'v1' }),
      chainId: 31337,
      name: 'Anvil Local',
      slug: 'anvil',
      type: 'testnet',
      isTestnet: true,
      rpcUrls: [
        'http://127.0.0.1:8545',
        'http://localhost:8545'
      ],
      explorerUrls: [
        'http://localhost:8545' // No explorer for local network
      ],
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      isActive: true,
      icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png'
    };
  }

  private getTestnetData(): NetworkData {
    return {
      id: IdGenerator.generate({ prefix: EntityPrefix.NETWORK, apiVersion: 'v1' }),
      chainId: 11155111,
      name: 'Sepolia Testnet',
      slug: 'sepolia',
      type: 'testnet',
      isTestnet: true,
      rpcUrls: [
        'https://sepolia.infura.io/v3/demo',
        'https://rpc.sepolia.org'
      ],
      explorerUrls: [
        'https://sepolia.etherscan.io'
      ],
      nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'SEP',
        decimals: 18
      },
      isActive: true,
      icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png'
    };
  }

  private getDefaultData(): NetworkData {
    return {
      id: IdGenerator.generate({ prefix: EntityPrefix.NETWORK, apiVersion: 'v1' }),
      chainId: 1,
      name: 'Default Network',
      slug: 'default',
      type: 'mainnet',
      isTestnet: false,
      rpcUrls: ['https://default.rpc.com'],
      explorerUrls: ['https://default.explorer.com'],
      nativeCurrency: {
        name: 'Default Token',
        symbol: 'DEF',
        decimals: 18
      },
      isActive: true,
      icon: 'https://default.icon.com'
    };
  }
}
