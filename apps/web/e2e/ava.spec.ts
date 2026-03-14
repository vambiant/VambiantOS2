import { test, expect } from '@playwright/test';

test.describe('AVA System', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto('/login');
    await page.fill('#email', 'admin@vambiant.de');
    await page.fill('#password', 'Test1234!');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await page.waitForURL(/dashboard/, { timeout: 30000 });
  });

  test('AVA page loads and shows heading', async ({ page }) => {
    await page.goto('/ava');
    await page.waitForURL('/ava');
    await expect(
      page.getByRole('heading', { name: /^ava$/i }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText('Ausschreibung, Vergabe und Abrechnung verwalten'),
    ).toBeVisible();
  });

  test('page shows correct heading and description', async ({ page }) => {
    await page.goto('/ava');
    await page.waitForURL('/ava');
    // The h1 should say "AVA"
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toContainText('AVA');
  });

  test('"Neue Ausschreibung" button exists', async ({ page }) => {
    await page.goto('/ava');
    await page.waitForURL('/ava');
    const newLink = page.getByRole('link', { name: /neue ausschreibung/i });
    await expect(newLink).toBeVisible({ timeout: 15000 });
    await expect(newLink).toHaveAttribute('href', '/ava/new');
  });

  test('AVA page shows table structure or empty state', async ({ page }) => {
    await page.goto('/ava');
    await page.waitForURL('/ava');
    // The AVA page now loads real tRPC data - with no seed data it shows empty state
    // or the table header. Verify the page rendered by checking summary cards.
    await expect(page.getByText('Ausschreibungen gesamt')).toBeVisible({ timeout: 15000 });
  });

  test('status filter dropdown is visible', async ({ page }) => {
    await page.goto('/ava');
    await page.waitForURL('/ava');
    // Status filter is now a Select dropdown, not buttons
    await expect(page.getByText('Alle Status')).toBeVisible({ timeout: 15000 });
    // Open the select to verify status options exist
    await page.getByText('Alle Status').click();
    await expect(page.getByRole('option', { name: 'Entwurf' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Veroeffentlicht' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Vergeben' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Ausgefuehrt' })).toBeVisible();
  });

  test('search input is visible and functional', async ({ page }) => {
    await page.goto('/ava');
    await page.waitForURL('/ava');
    const searchInput = page.getByPlaceholder('Ausschreibungen suchen...');
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    // Verify the search input accepts text (no seed data to filter)
    await searchInput.fill('Test');
    await expect(searchInput).toHaveValue('Test');
  });
});
