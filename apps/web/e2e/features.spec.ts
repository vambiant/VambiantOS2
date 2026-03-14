import { test, expect } from '@playwright/test';

test.describe('Feature Pages Load Correctly', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto('/login');
    await page.fill('#email', 'admin@vambiant.de');
    await page.fill('#password', 'Test1234!');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await page.waitForURL(/dashboard/, { timeout: 30000 });
  });

  test('/wiki page loads with heading', async ({ page }) => {
    await page.goto('/wiki');
    await page.waitForURL('/wiki');
    await expect(
      page.getByRole('heading', { name: /wissensdatenbank/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('/bim page loads with heading', async ({ page }) => {
    await page.goto('/bim');
    await page.waitForURL('/bim');
    await expect(
      page.getByRole('heading', { name: /bim-modelle/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('/reports page loads with heading', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForURL('/reports');
    await expect(
      page.getByRole('heading', { name: /berichte/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('/communication page loads with heading', async ({ page }) => {
    await page.goto('/communication');
    await page.waitForURL('/communication');
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.getByRole('heading', { name: /kommunikation/i }),
    ).toBeVisible({ timeout: 30000 });
  });

  test('/tenders page loads with heading', async ({ page }) => {
    await page.goto('/tenders');
    await page.waitForURL('/tenders');
    await expect(
      page.getByRole('heading', { name: /ausschreibungen/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('/resources page loads with heading', async ({ page }) => {
    await page.goto('/resources');
    await page.waitForURL('/resources');
    await expect(
      page.getByRole('heading', { name: /ressourcenplanung/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('/marketplace page loads with heading', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForURL('/marketplace');
    await expect(
      page.getByRole('heading', { name: /marktplatz/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('/references page loads with heading', async ({ page }) => {
    await page.goto('/references');
    await page.waitForURL('/references');
    await expect(
      page.getByRole('heading', { name: /referenzen/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('/questionnaires page loads with heading', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.waitForURL('/questionnaires');
    await expect(
      page.getByRole('heading', { name: /fragebögen/i }),
    ).toBeVisible({ timeout: 15000 });
  });
});
