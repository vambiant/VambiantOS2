import { test, expect } from '@playwright/test';

test.describe('Contracts & Invoices', () => {
  test.beforeEach(async ({ page }) => {
    // Login with admin credentials
    await page.goto('/login');
    await page.fill('#email', 'admin@vambiant.de');
    await page.fill('#password', 'Test1234!');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await page.waitForURL(/dashboard/);
  });

  test('contracts list page loads with heading', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForURL('/contracts');
    await expect(
      page.getByRole('heading', { name: /verträge/i }),
    ).toBeVisible();
    await expect(
      page.getByText('Verträge mit Auftragnehmern verwalten'),
    ).toBeVisible();
  });

  test('contracts page has "Neuer Vertrag" button', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForURL('/contracts');
    const newContractLink = page.getByRole('link', { name: /neuer vertrag/i });
    await expect(newContractLink).toBeVisible();
    await expect(newContractLink).toHaveAttribute('href', '/contracts/new');
  });

  test('contracts page shows summary cards', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForURL('/contracts');
    await expect(page.getByText('Verträge gesamt')).toBeVisible();
    await expect(page.getByText('Aktive Verträge')).toBeVisible();
    await expect(page.getByText('Vertragssumme (aktiv)')).toBeVisible();
    await expect(page.getByText('Gesamtvolumen')).toBeVisible();
  });

  test('contracts page has search input and status filter', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForURL('/contracts');
    await expect(
      page.getByPlaceholder('Verträge suchen...'),
    ).toBeVisible();
    // Status filter select should be present
    await expect(page.getByText('Alle Status')).toBeVisible();
  });

  test('contracts table headers are visible', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForURL('/contracts');
    // Table headers
    await expect(page.getByRole('columnheader', { name: 'Nr' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Projekt' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Titel' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Auftragnehmer' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });

  test('invoices list page loads with heading', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForURL('/invoices');
    await expect(
      page.getByRole('heading', { name: /rechnungen/i }),
    ).toBeVisible();
    await expect(
      page.getByText('Ausgangsrechnungen erstellen und verwalten'),
    ).toBeVisible();
  });

  test('invoices page has "Neue Rechnung" button', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForURL('/invoices');
    const newInvoiceLink = page.getByRole('link', { name: /neue rechnung/i });
    await expect(newInvoiceLink).toBeVisible();
    await expect(newInvoiceLink).toHaveAttribute('href', '/invoices/new');
  });

  test('invoices page shows summary cards', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForURL('/invoices');
    await expect(page.getByText('Rechnungen gesamt')).toBeVisible();
    await expect(page.getByText('Offene Forderungen')).toBeVisible();
  });

  test('invoices page has search and status filter', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForURL('/invoices');
    await expect(
      page.getByPlaceholder('Rechnungen suchen...'),
    ).toBeVisible();
    await expect(page.getByText('Alle Status')).toBeVisible();
  });
});
