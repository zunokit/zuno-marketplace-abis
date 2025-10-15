import {
  AbiEntity,
  AbiVersionEntity,
  AbiNotFoundError,
} from "@/core/domain/abi/abi.entity";
import { AbiRepository } from "@/core/domain/abi/abi.repository";
import { CacheService, CacheKeys } from "@/infrastructure/cache/cache.adapter";

export interface GetAbiVersionsUseCaseInput {
  abiId: string;
  userId?: string; // Optional for access control
}

export interface GetAbiVersionsUseCaseOutput {
  abi: AbiEntity;
  versions: AbiVersionEntity[];
  currentVersion: AbiVersionEntity | null;
}

export class GetAbiVersionsUseCase {
  constructor(
    private abiRepository: AbiRepository,
    private cacheService: CacheService
  ) {}

  async execute(input: GetAbiVersionsUseCaseInput): Promise<GetAbiVersionsUseCaseOutput> {
    // 1. Find the ABI
    const abi = await this.abiRepository.findById(input.abiId);
    if (!abi) {
      throw new AbiNotFoundError(input.abiId);
    }

    // 2. Check if ABI is accessible (not deleted for non-owners)
    if (abi.isDeleted && abi.userId !== input.userId) {
      throw new AbiNotFoundError(input.abiId);
    }

    // 3. Try to get versions from cache
    const cacheKey = CacheKeys.abiVersions(input.abiId);
    let versions = await this.cacheService.getSearch<AbiVersionEntity[]>(cacheKey);

    if (!versions) {
      // 4. Get versions from database
      versions = await this.abiRepository.findVersions(input.abiId);

      // 5. Cache the versions
      await this.cacheService.cacheSearch(cacheKey, versions);
    }

    // 6. Get current version (latest)
    const currentVersion = await this.abiRepository.getLatestVersion(input.abiId);

    // 7. Sort versions by version number (newest first)
    const sortedVersions = versions.sort((a, b) => b.versionNumber - a.versionNumber);

    return {
      abi,
      versions: sortedVersions,
      currentVersion,
    };
  }
}

export interface GetAbiVersionUseCaseInput {
  abiId: string;
  versionNumber: number;
  userId?: string;
}

export interface GetAbiVersionUseCaseOutput {
  abi: AbiEntity;
  version: AbiVersionEntity;
}

export class GetAbiVersionUseCase {
  constructor(
    private abiRepository: AbiRepository,
    private cacheService: CacheService
  ) {}

  async execute(input: GetAbiVersionUseCaseInput): Promise<GetAbiVersionUseCaseOutput> {
    // 1. Find the ABI
    const abi = await this.abiRepository.findById(input.abiId);
    if (!abi) {
      throw new AbiNotFoundError(input.abiId);
    }

    // 2. Check if ABI is accessible
    if (abi.isDeleted && abi.userId !== input.userId) {
      throw new AbiNotFoundError(input.abiId);
    }

    // 3. Find the specific version
    const version = await this.abiRepository.findVersionByNumber(input.abiId, input.versionNumber);
    if (!version) {
      throw new AbiNotFoundError(`Version ${input.versionNumber} not found for ABI ${input.abiId}`);
    }

    return {
      abi,
      version,
    };
  }
}

export interface CompareAbiVersionsUseCaseInput {
  abiId: string;
  fromVersion: number;
  toVersion: number;
  userId?: string;
}

export interface VersionDifference {
  type: "added" | "removed" | "modified";
  category: "function" | "event" | "error" | "constructor" | "fallback" | "receive";
  name?: string;
  details: string;
}

export interface CompareAbiVersionsUseCaseOutput {
  abi: AbiEntity;
  fromVersion: AbiVersionEntity;
  toVersion: AbiVersionEntity;
  differences: VersionDifference[];
  isBreaking: boolean;
}

export class CompareAbiVersionsUseCase {
  constructor(
    private abiRepository: AbiRepository,
    private cacheService: CacheService
  ) {}

  async execute(input: CompareAbiVersionsUseCaseInput): Promise<CompareAbiVersionsUseCaseOutput> {
    // 1. Find the ABI
    const abi = await this.abiRepository.findById(input.abiId);
    if (!abi) {
      throw new AbiNotFoundError(input.abiId);
    }

    // 2. Check accessibility
    if (abi.isDeleted && abi.userId !== input.userId) {
      throw new AbiNotFoundError(input.abiId);
    }

    // 3. Get both versions
    const fromVersion = await this.abiRepository.findVersionByNumber(input.abiId, input.fromVersion);
    if (!fromVersion) {
      throw new AbiNotFoundError(`Version ${input.fromVersion} not found`);
    }

    const toVersion = await this.abiRepository.findVersionByNumber(input.abiId, input.toVersion);
    if (!toVersion) {
      throw new AbiNotFoundError(`Version ${input.toVersion} not found`);
    }

    // 4. Compare the ABIs
    const differences = this.compareAbis(fromVersion.abi, toVersion.abi);

    // 5. Determine if changes are breaking
    const isBreaking = this.hasBreakingChanges(differences);

    return {
      abi,
      fromVersion,
      toVersion,
      differences,
      isBreaking,
    };
  }

  private compareAbis(fromAbi: any[], toAbi: any[]): VersionDifference[] {
    const differences: VersionDifference[] = [];

    // Create maps for easier comparison
    const fromMap = new Map<string, any>();
    const toMap = new Map<string, any>();

    // Populate from map
    fromAbi.forEach(item => {
      const key = this.getItemKey(item);
      fromMap.set(key, item);
    });

    // Populate to map and find additions/modifications
    toAbi.forEach(item => {
      const key = this.getItemKey(item);
      toMap.set(key, item);

      if (!fromMap.has(key)) {
        differences.push({
          type: "added",
          category: item.type,
          name: item.name,
          details: `Added ${item.type}${item.name ? ` '${item.name}'` : ""}`,
        });
      } else {
        const fromItem = fromMap.get(key);
        if (JSON.stringify(fromItem) !== JSON.stringify(item)) {
          differences.push({
            type: "modified",
            category: item.type,
            name: item.name,
            details: `Modified ${item.type}${item.name ? ` '${item.name}'` : ""}`,
          });
        }
      }
    });

    // Find removals
    fromMap.forEach((item, key) => {
      if (!toMap.has(key)) {
        differences.push({
          type: "removed",
          category: item.type,
          name: item.name,
          details: `Removed ${item.type}${item.name ? ` '${item.name}'` : ""}`,
        });
      }
    });

    return differences;
  }

  private getItemKey(item: any): string {
    if (item.type === "function") {
      const inputs = item.inputs?.map((input: any) => input.type).join(",") || "";
      return `${item.type}:${item.name}(${inputs})`;
    }

    if (item.type === "event") {
      const inputs = item.inputs?.map((input: any) => input.type).join(",") || "";
      return `${item.type}:${item.name}(${inputs})`;
    }

    if (item.type === "error") {
      const inputs = item.inputs?.map((input: any) => input.type).join(",") || "";
      return `${item.type}:${item.name}(${inputs})`;
    }

    return `${item.type}:${item.name || "unnamed"}`;
  }

  private hasBreakingChanges(differences: VersionDifference[]): boolean {
    // Define what constitutes breaking changes
    return differences.some(diff => {
      // Removing any public function is breaking
      if (diff.type === "removed" && diff.category === "function") {
        return true;
      }

      // Removing events is breaking for listeners
      if (diff.type === "removed" && diff.category === "event") {
        return true;
      }

      // Modifying function signatures is breaking
      if (diff.type === "modified" && diff.category === "function") {
        return true;
      }

      // Modifying event signatures is breaking
      if (diff.type === "modified" && diff.category === "event") {
        return true;
      }

      return false;
    });
  }
}