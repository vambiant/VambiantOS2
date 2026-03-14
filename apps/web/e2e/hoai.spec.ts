import { test, expect } from '@playwright/test';

test.describe('HOAI Honorarangebote', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto('/login');
    await page.fill('#email', 'admin@vambiant.de');
    await page.fill('#password', 'Test1234!');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await page.waitForURL(/dashboard/);
  });

  test('HOAI page loads and shows heading', async ({ page }) => {
    await page.goto('/hoai');
    await page.waitForURL('/hoai');
    await expect(
      page.getByRole('heading', { name: /hoai honorarangebote/i }),
    ).toBeVisible();
    await expect(
      page.getByText('Honorarberechnungen und Angebote nach der HOAI verwalten'),
    ).toBeVisible();
  });

  test('"Neues Angebot" button exists and links to /hoai/new', async ({ page }) => {
    await page.goto('/hoai');
    await page.waitForURL('/hoai');
    const newOfferLink = page.getByRole('link', { name: /neues angebot/i });
    await expect(newOfferLink).toBeVisible();
    await expect(newOfferLink).toHaveAttribute('href', '/hoai/new');
  });

  test('summary cards are visible', async ({ page }) => {
    await page.goto('/hoai');
    await page.waitForURL('/hoai');
    await expect(page.getByText('Angebote gesamt')).toBeVisible({
      timeout: 10000,
    });
    // "Angenommen" also appears as a hidden SelectItem in the status filter,
    // so use .first() to target the visible summary card label
    await expect(page.getByText('Angenommen').first()).toBeVisible();
    await expect(page.getByText('Honorarsumme (angenommen)')).toBeVisible();
    await expect(page.getByText('Offene Angebote')).toBeVisible();
  });

  test('search input is present', async ({ page }) => {
    await page.goto('/hoai');
    await page.waitForURL('/hoai');
    await expect(
      page.getByPlaceholder('Angebote suchen...'),
    ).toBeVisible();
  });
});
