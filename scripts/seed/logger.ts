/**
 * Seed Logger
 * Professional logging system for seed operations
 */

import { SeedConfig } from "./types";

export class SeedLogger {
  private config: SeedConfig;
  private startTime: number;

  constructor(config: SeedConfig) {
    this.config = config;
    this.startTime = Date.now();
  }

  private shouldLog(level: "info" | "warn" | "error"): boolean {
    if (this.config.logLevel === "silent") return false;
    if (this.config.logLevel === "minimal" && level !== "error") return false;
    return true;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const duration = Date.now() - this.startTime;

    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (context) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }

    if (this.config.logLevel === "verbose") {
      formatted += ` | Duration: ${duration}ms`;
    }

    return formatted;
  }

  info(message: string, context?: any): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("INFO", message, context));
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("WARN", message, context));
    }
  }

  error(message: string, context?: any): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("ERROR", message, context));
    }
  }

  success(message: string, context?: any): void {
    if (this.shouldLog("info")) {
      console.log(`✅ ${this.formatMessage("SUCCESS", message, context)}`);
    }
  }

  progress(current: number, total: number, message: string): void {
    if (this.config.logLevel === "verbose") {
      const percentage = Math.round((current / total) * 100);
      const bar =
        "█".repeat(Math.floor(percentage / 5)) +
        "░".repeat(20 - Math.floor(percentage / 5));
      console.log(
        `\r[${bar}] ${percentage}% - ${message} (${current}/${total})`
      );
    }
  }

  section(title: string): void {
    if (this.shouldLog("info")) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`🌱 ${title.toUpperCase()}`);
      console.log(`${"=".repeat(60)}`);
    }
  }

  summary(results: any[]): void {
    if (!this.shouldLog("info")) return;

    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 SEED SUMMARY");
    console.log(`${"=".repeat(60)}`);

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const successCount = results.filter((r) => r.success).length;

    console.log(`✅ Successful seeders: ${successCount}/${results.length}`);
    console.log(`📝 Total created: ${totalCreated}`);
    console.log(`⏭️  Total skipped: ${totalSkipped}`);
    console.log(`🔄 Total updated: ${totalUpdated}`);
    console.log(`⏱️  Total duration: ${totalDuration}ms`);

    if (successCount < results.length) {
      console.log(`\n❌ Failed seeders:`);
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`   - ${r.seeder}: ${r.error}`);
        });
    }

    console.log(`${"=".repeat(60)}\n`);
  }
}
