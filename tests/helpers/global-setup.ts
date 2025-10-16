import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  // Polyfill TransformStream for older Node.js versions
  if (typeof globalThis.TransformStream === "undefined") {
    try {
      const { TransformStream } = await import("stream/web");
      // Type assertion to avoid type conflicts
      (globalThis as any).TransformStream = TransformStream;
    } catch (error) {
      console.warn("TransformStream polyfill failed:", error);
      // Create a minimal polyfill with proper typing
      (globalThis as any).TransformStream = class TransformStream {
        constructor() {
          throw new Error("TransformStream not supported in this environment");
        }
      };
    }
  }
}

export default globalSetup;
