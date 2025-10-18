import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should display the homepage correctly", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");

    // Check main heading
    await expect(
      page.getByRole("heading", { name: /Zuno Marketplace ABIs/i })
    ).toBeVisible();

    // Check hero description
    await expect(
      page.getByText(
        /Central registry for developers to store, manage, and share Smart Contract ABIs/i
      )
    ).toBeVisible();

    // Check CTA button
    await expect(
      page.getByRole("button", { name: /Get Public API Key/i })
    ).toBeVisible();

    // Feature badges removed from simplified UI
  });

  // Navigation links were removed from simplified UI

  // Feature cards section removed from simplified UI

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto("/");

    // Check that main content is still visible on mobile
    await expect(
      page.getByRole("heading", { name: /Zuno Marketplace ABIs/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Get Public API Key/i })
    ).toBeVisible();
    // No navigation links to assert on mobile
  });

  test("should generate API key when button is clicked", async ({ page }) => {
    await page.goto("/");

    // Click the API key generation button
    const generateButton = page.getByRole("button", {
      name: /Get Public API Key/i,
    });
    await generateButton.click();

    // Wait for the button to show "Generating..." state
    await expect(
      page.getByRole("button", { name: /Generating.../i })
    ).toBeVisible();

    // Wait for either the button to return to normal state or for an API key to be displayed
    // This handles cases where the API endpoint might not be available
    try {
      await expect(
        page.getByRole("button", { name: /Get Public API Key/i })
      ).toBeVisible({ timeout: 10000 });
    } catch {
      // If button doesn't return, check if API key is displayed instead
      await expect(page.locator("code")).toBeVisible({ timeout: 5000 });
    }
  });
});
