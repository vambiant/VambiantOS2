import { test, expect } from '@playwright/test';

test.describe('Time Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto('/login');
    await page.fill('#email', 'admin@vambiant.de');
    await page.fill('#password', 'Test1234!');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await page.waitForURL(/dashboard/);
  });

  test('time tracking page loads with heading', async ({ page }) => {
    await page.goto('/time-tracking');
    await page.waitForURL('/time-tracking');
    await expect(
      page.getByRole('heading', { name: /zeiterfassung/i }),
    ).toBeVisible();
    await expect(
      page.getByText('Stunden erfassen und verwalten'),
    ).toBeVisible();
  });

  test('view toggle buttons are visible (Woche, Monat, Liste)', async ({ page }) => {
    await page.goto('/time-tracking');
    await page.waitForURL('/time-tracking');
    await expect(page.getByRole('button', { name: 'Woche', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Monat', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Liste', exact: true })).toBeVisible();
  });

  test('"Eintrag hinzufügen" and "Woche einreichen" buttons exist', async ({ page }) => {
    await page.goto('/time-tracking');
    await page.waitForURL('/time-tracking');
    await expect(
      page.getByRole('button', { name: /eintrag hinzufügen/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /woche einreichen/i }),
    ).toBeVisible();
  });

  test('list view is shown by default and has table headers', async ({ page }) => {
    await page.goto('/time-tracking');
    await page.waitForURL('/time-tracking');
    // Default view is "liste" per the code (useState<ViewMode>('liste'))
    // The list view shows either a table with headers (when entries exist)
    // or an empty state message (when no entries). Wait for loading to finish.
    // Check for list view container content - either table headers or empty state
    const listContainer = page.locator('.rounded-xl.border.bg-card.shadow-sm');
    await expect(listContainer).toBeVisible();
    // Wait for loading to complete (skeletons disappear)
    await expect(page.getByText('Wird geladen...')).toBeHidden({ timeout: 10000 }).catch(() => {});
    // Either we see the table headers or the empty state
    const hasEntries = await page.locator('th:has-text("Datum")').isVisible().catch(() => false);
    if (hasEntries) {
      await expect(page.locator('th', { hasText: 'Datum' })).toBeVisible();
      await expect(page.locator('th', { hasText: 'Projekt' })).toBeVisible();
      await expect(page.locator('th', { hasText: 'Stunden' })).toBeVisible();
    } else {
      await expect(page.getByText('Keine Zeiteinträge vorhanden')).toBeVisible();
    }
  });

  test('switching to week view shows week navigation', async ({ page }) => {
    await page.goto('/time-tracking');
    await page.waitForURL('/time-tracking');
    // Click "Woche" to switch to week view (exact match to avoid "Woche einreichen")
    await page.getByRole('button', { name: 'Woche', exact: true }).click();
    // Week view should display week navigation with KW number
    await expect(page.getByText(/KW \d+/)).toBeVisible();
    // Day columns should be visible in the table header (use columnheader role with regex to match "Mo\n09.03." etc.)
    await expect(page.getByRole('columnheader', { name: /^Mo/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /^Di/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /^Fr/ })).toBeVisible();
    // Summe row should be visible (use .first() since "Summe" appears in both a th and a td)
    await expect(page.getByText('Summe').first()).toBeVisible();
  });

  test('switching to month view shows calendar grid', async ({ page }) => {
    await page.goto('/time-tracking');
    await page.waitForURL('/time-tracking');
    // Click "Monat" to switch to month view
    await page.getByRole('button', { name: 'Monat', exact: true }).click();
    // Month view should display day abbreviations (exact match to avoid "Monat" matching "Mo")
    await expect(page.getByText('Mo', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Di', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Mi', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Do', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Fr', { exact: true }).first()).toBeVisible();
  });

  test('templates section shows "Vorlagen:" label', async ({ page }) => {
    await page.goto('/time-tracking');
    await page.waitForURL('/time-tracking');
    await expect(page.getByText('Vorlagen:')).toBeVisible();
  });

  test('clicking "Eintrag hinzufügen" shows add entry form', async ({ page }) => {
    await page.goto('/time-tracking');
    await page.waitForURL('/time-tracking');
    await page.getByRole('button', { name: /eintrag hinzufügen/i }).click();
    // The add entry form should appear with a heading
    await expect(page.locator('h3', { hasText: 'Eintrag hinzufügen' })).toBeVisible();
    // Form labels should be visible (use label locators to avoid matching table headers / options)
    await expect(page.locator('label', { hasText: 'Projekt' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Stunden' })).toBeVisible();
    await expect(page.getByText('Abrechenbar')).toBeVisible();
  });
});
