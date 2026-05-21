import { getCurrentUrl } from "@/shared/lib/utils/url";

const URL_ENVS = [
  "VERCEL_URL",
  "NEXT_PUBLIC_VERCEL_URL",
  "NEXT_PUBLIC_APP_URL",
];

describe("getCurrentUrl", () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of URL_ENVS) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of URL_ENVS) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  it("falls back to http://localhost:3000 when no env vars are set", () => {
    expect(getCurrentUrl()).toBe("http://localhost:3000");
  });

  it("prefers VERCEL_URL and prefixes https:// when scheme is missing", () => {
    process.env.VERCEL_URL = "zuno-pr-42.vercel.app";
    expect(getCurrentUrl()).toBe("https://zuno-pr-42.vercel.app");
  });

  it("returns VERCEL_URL as-is when it already has a scheme", () => {
    process.env.VERCEL_URL = "https://zuno.example.com";
    expect(getCurrentUrl()).toBe("https://zuno.example.com");
  });

  it("falls back to NEXT_PUBLIC_VERCEL_URL when VERCEL_URL is unset", () => {
    process.env.NEXT_PUBLIC_VERCEL_URL = "zuno-preview.vercel.app";
    expect(getCurrentUrl()).toBe("https://zuno-preview.vercel.app");
  });

  it("ignores blank VERCEL_URL and falls back to NEXT_PUBLIC_APP_URL", () => {
    process.env.VERCEL_URL = "   ";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.zuno.dev";
    expect(getCurrentUrl()).toBe("https://app.zuno.dev");
  });

  it("returns NEXT_PUBLIC_APP_URL when only it is set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.zuno.dev";
    expect(getCurrentUrl()).toBe("https://app.zuno.dev");
  });
});
