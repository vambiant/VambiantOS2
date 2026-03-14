import { test, expect } from '@playwright/test';

test.describe('Settings Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto('/login');
    await page.fill('#email', 'admin@vambiant.de');
    await page.fill('#password', 'Test1234!');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await page.waitForURL(/dashboard/, { timeout: 30000 });
  });

  test('general settings page loads with heading', async ({ page }) => {
    await page.goto('/settings/general');
    await page.waitForURL('/settings/general');
    await expect(
      page.getByRole('heading', { name: /allgemeine einstellungen/i }),
    ).toBeVisible();
    await expect(
      page.getByText('Verwalten Sie die grundlegenden Informationen Ihres Unternehmens'),
    ).toBeVisible();
  });

  test('general settings page shows company info form fields', async ({ page }) => {
    await page.goto('/settings/general');
    await page.waitForURL('/settings/general');
    // The form should show labeled inputs
    await expect(page.getByText('Unternehmenslogo')).toBeVisible();
    await expect(page.getByText('Unternehmensdaten')).toBeVisible();
    await expect(page.getByLabel('Unternehmensname')).toBeVisible();
    await expect(page.getByLabel(/straße/i)).toBeVisible();
    await expect(page.getByLabel('PLZ')).toBeVisible();
    await expect(page.getByLabel('Stadt')).toBeVisible();
  });

  test('general settings page has save button', async ({ page }) => {
    await page.goto('/settings/general');
    await page.waitForURL('/settings/general');
    await expect(
      page.getByRole('button', { name: /speichern/i }),
    ).toBeVisible();
  });

  test('general settings page shows domain settings section', async ({ page }) => {
    await page.goto('/settings/general');
    await page.waitForURL('/settings/general');
    await expect(page.getByText('Domain-Einstellungen')).toBeVisible();
    await expect(page.getByLabel('Subdomain')).toBeVisible();
    await expect(page.getByText('.vambiant.app')).toBeVisible();
  });

  test('members settings page loads and shows heading', async ({ page }) => {
    await page.goto('/settings/members');
    await page.waitForURL('/settings/members');
    await expect(
      page.getByRole('heading', { name: /teammitglieder/i }),
    ).toBeVisible();
    await expect(
      page.getByText('Verwalten Sie die Mitglieder Ihres Unternehmens'),
    ).toBeVisible();
  });

  test('members settings page shows admin user', async ({ page }) => {
    await page.goto('/settings/members');
    await page.waitForURL('/settings/members');
    await page.waitForLoadState('networkidle');
    // The admin user email should be visible in the members list
    await expect(page.getByText('admin@vambiant.de')).toBeVisible({
      timeout: 10000,
    });
    // Admin role badge should be shown
    await expect(page.getByText('Administrator')).toBeVisible({
      timeout: 10000,
    });
  });

  test('members settings page has invite button', async ({ page }) => {
    await page.goto('/settings/members');
    await page.waitForURL('/settings/members');
    // Wait for the page to fully render (the heading appears first)
    await expect(
      page.getByRole('heading', { name: /teammitglieder/i }),
    ).toBeVisible({ timeout: 15000 });
    // The invite button contains text "Einladen" next to a Plus icon
    await expect(
      page.getByRole('button', { name: /einladen/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('members settings page has search input', async ({ page }) => {
    await page.goto('/settings/members');
    await page.waitForURL('/settings/members');
    await expect(
      page.getByPlaceholder('Mitglieder suchen...'),
    ).toBeVisible();
  });

  test('roles settings page loads with heading', async ({ page }) => {
    await page.goto('/settings/roles');
    await page.waitForURL('/settings/roles');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /rollen.*berechtigungen/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText('Zugriffsrechte für Ihr Team anzeigen'),
    ).toBeVisible({ timeout: 10000 });
  });
});
