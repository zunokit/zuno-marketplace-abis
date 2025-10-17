/**
 * Seed System Types
 * Professional seed system with proper typing and extensibility
 */

export interface SeedConfig {
  /** Environment to seed */
  environment: "development" | "staging" | "production";

  /** Whether to clear existing data before seeding */
  clearExisting: boolean;

  /** Whether to skip certain seeders */
  skipSeeders: string[];

  /** Batch size for bulk operations */
  batchSize: number;

  /** Whether to use transactions */
  useTransactions: boolean;

  /** Logging level */
  logLevel: "silent" | "minimal" | "verbose";
}

export interface SeedResult {
  /** Seeder name */
  seeder: string;

  /** Number of records created */
  created: number;

  /** Number of records skipped */
  skipped: number;

  /** Number of records updated */
  updated: number;

  /** Execution time in milliseconds */
  duration: number;

  /** Whether seeding was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

export interface SeedContext {
  /** Database connection */
  db: any;

  /** Configuration */
  config: SeedConfig;

  /** Results from previous seeders */
  results: SeedResult[];

  /** Shared data between seeders */
  shared: Record<string, any>;

  /** Logger instance */
  logger?: any;
}

export interface Seeder {
  /** Unique seeder name */
  name: string;

  /** Dependencies (other seeders that must run first) */
  dependencies: string[];

  /** Whether this seeder can run in parallel */
  parallel: boolean;

  /** Execute the seeder */
  execute(context: SeedContext): Promise<SeedResult>;
}

export interface SeedDataProvider<T = any> {
  /** Get all data for seeding */
  getAll(): Promise<T[]>;

  /** Get data by criteria */
  getBy(criteria: Partial<T>): Promise<T[]>;

  /** Validate data before seeding */
  validate(data: T): Promise<boolean>;

  /** Transform data if needed */
  transform?(data: T): Promise<T>;
}

export interface SeedFactory<T = any> {
  /** Create a single instance */
  create(overrides?: Partial<T>): T;

  /** Create multiple instances */
  createMany(count: number, overrides?: Partial<T>): T[];

  /** Create with specific state */
  state(state: string): SeedFactory<T>;
}
