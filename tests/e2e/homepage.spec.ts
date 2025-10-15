import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display the homepage correctly', async ({ page }) => {
    await page.goto('/');

    // Check main heading
    await expect(
      page.getByRole('heading', { name: /Zuno Marketplace ABIs/i })
    ).toBeVisible();

    // Check hero description
    await expect(
      page.getByText(
        /Central registry for developers to store, manage, and share Smart Contract ABIs/i
      )
    ).toBeVisible();

    // Check CTA buttons
    await expect(
      page.getByRole('link', { name: /Browse ABIs/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Upload ABI/i })).toBeVisible();

    // Check feature badges
    await expect(page.getByText('Multi-chain')).toBeVisible();
    await expect(page.getByText('Version Control')).toBeVisible();
    await expect(page.getByText('IPFS Storage')).toBeVisible();
    await expect(page.getByText('API Access')).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');

    // Test Browse ABIs link
    const browseLink = page.getByRole('link', { name: /Browse ABIs/i });
    await expect(browseLink).toHaveAttribute('href', '/abis');

    // Test Upload ABI link
    const uploadLink = page.getByRole('link', { name: /Upload ABI/i });
    await expect(uploadLink).toHaveAttribute('href', '/dashboard');

    // Test Sign Up link
    const signUpLink = page.getByRole('link', { name: /Sign Up Free/i });
    await expect(signUpLink).toHaveAttribute('href', '/auth/signin');

    // Test API Docs link
    const apiDocsLink = page.getByRole('link', { name: /View API Docs/i });
    await expect(apiDocsLink).toHaveAttribute('href', '/api/auth/reference');
  });

  test('should display feature cards', async ({ page }) => {
    await page.goto('/');

    // Check feature cards are present
    await expect(
      page.getByRole('heading', { name: /Multi-chain Support/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Version Control/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /IPFS Backup/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /API Access/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Enterprise Security/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Standards Validation/i })
    ).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');

    // Check that main content is still visible on mobile
    await expect(
      page.getByRole('heading', { name: /Zuno Marketplace ABIs/i })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Browse ABIs/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Upload ABI/i })).toBeVisible();
  });
});
