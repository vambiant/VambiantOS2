import { test, expect } from '@playwright/test';

// Seed data: organizations
const SEED_CLIENT = 'Bayerische Staatsbauverwaltung';
const SEED_CONTRACTORS = [
  'Schmidt Bauunternehmen GmbH',
  'Weber Haustechnik AG',
];

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@vambiant.de');
  await page.locator('#password').fill('Test1234!');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

test.describe('CRM', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ---------------------------------------------------------------------------
  // CRM list page
  // ---------------------------------------------------------------------------
  test.describe('CRM list page (/crm)', () => {
    test('shows CRM heading and description', async ({ page }) => {
      await page.goto('/crm');
      await expect(
        page.getByRole('heading', { name: /crm/i }),
      ).toBeVisible();
      await expect(
        page.getByText('Kontakte und Geschäftsbeziehungen verwalten'),
      ).toBeVisible();
    });

    test('shows "Neuer Kontakt" link to /crm/new', async ({ page }) => {
      await page.goto('/crm');
      const newContactLink = page.getByRole('link', {
        name: /neuer kontakt/i,
      });
      await expect(newContactLink).toBeVisible();
      await expect(newContactLink).toHaveAttribute('href', '/crm/new');
    });

    test('shows search input for organizations', async ({ page }) => {
      await page.goto('/crm');
      await expect(
        page.getByPlaceholder('Organisationen suchen...'),
      ).toBeVisible();
    });

    test('shows status filter buttons (Alle, Aktiv, Interessent, Inaktiv)', async ({
      page,
    }) => {
      await page.goto('/crm');
      for (const label of ['Alle', 'Aktiv', 'Interessent', 'Inaktiv']) {
        await expect(
          page.getByRole('button', { name: label }).first(),
        ).toBeVisible();
      }
    });

    test('shows organization type tabs (Auftraggeber, Fachplaner, Ausfuehrende)', async ({
      page,
    }) => {
      await page.goto('/crm');
      await expect(
        page.getByRole('tab', { name: /auftraggeber/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('tab', { name: /fachplaner/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('tab', { name: /ausführende/i }),
      ).toBeVisible();
    });

    test('Auftraggeber tab shows seeded client organization', async ({
      page,
    }) => {
      await page.goto('/crm');
      // Auftraggeber tab is the default
      await expect(page.getByText(SEED_CLIENT)).toBeVisible({
        timeout: 10000,
      });
    });

    test('Ausfuehrende tab shows seeded contractor organizations', async ({
      page,
    }) => {
      await page.goto('/crm');
      // Click on Ausfuehrende tab
      await page.getByRole('tab', { name: /ausführende/i }).click();
      for (const name of SEED_CONTRACTORS) {
        await expect(page.getByText(name)).toBeVisible({
          timeout: 10000,
        });
      }
    });

    test('organization cards show type badges', async ({ page }) => {
      await page.goto('/crm');
      await expect(page.getByText(SEED_CLIENT)).toBeVisible({
        timeout: 10000,
      });
      // The client card should show "Auftraggeber" badge
      await expect(page.getByText('Auftraggeber').first()).toBeVisible();
    });

    test('organization cards show city from seed data', async ({ page }) => {
      await page.goto('/crm');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(SEED_CLIENT)).toBeVisible({
        timeout: 15000,
      });
      // Bayerische Staatsbauverwaltung is in München
      await expect(page.getByText('München').first()).toBeVisible();
    });

    test('clicking an organization navigates to detail page', async ({
      page,
    }) => {
      await page.goto('/crm');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(SEED_CLIENT)).toBeVisible({
        timeout: 15000,
      });
      await page.getByText(SEED_CLIENT).click();
      await page.waitForURL(/\/crm\/\d+/, { timeout: 15000 });
      // Detail page should show the organization name as heading
      await expect(
        page.getByRole('heading', {
          name: new RegExp(SEED_CLIENT),
        }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('shows view toggle buttons (grid and list)', async ({ page }) => {
      await page.goto('/crm');
      const viewToggle = page.locator(
        '.flex.rounded-md.border.shadow-sm button',
      );
      await expect(viewToggle).toHaveCount(2);
    });

    test('list view shows table with column headers', async ({ page }) => {
      await page.goto('/crm');
      // Switch to list view
      const viewToggle = page.locator(
        '.flex.rounded-md.border.shadow-sm button',
      );
      await viewToggle.nth(1).click();
      // Table headers should be visible
      for (const header of ['Name', 'Typ', 'Status', 'Kontakte', 'Stadt']) {
        await expect(
          page.locator('th', { hasText: header }),
        ).toBeVisible();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // CRM detail page
  // ---------------------------------------------------------------------------
  test.describe('CRM detail page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/crm');
      await expect(page.getByText(SEED_CLIENT)).toBeVisible({
        timeout: 15000,
      });
      await page.getByText(SEED_CLIENT).click();
      await page.waitForURL(/\/crm\/\d+/, { timeout: 15000 });
      // Wait for the detail page to fully render
      await page.waitForLoadState('networkidle');
    });

    test('shows organization name and type badge', async ({ page }) => {
      await expect(
        page.getByRole('heading', {
          name: new RegExp(SEED_CLIENT),
        }),
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Auftraggeber').first()).toBeVisible();
    });

    test('shows "Bearbeiten" button', async ({ page }) => {
      await expect(
        page.getByRole('button', { name: /bearbeiten/i }),
      ).toBeVisible({ timeout: 10000 });
    });

    test('shows info cards: Kontaktdaten, Finanzdaten, Notizen', async ({
      page,
    }) => {
      await expect(page.getByText('Kontaktdaten')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText('Finanzdaten', { exact: true })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText('Notizen', { exact: true }).first()).toBeVisible({
        timeout: 10000,
      });
    });

    test('shows tabs: Kontakte, Aktivitaten, Dokumente', async ({
      page,
    }) => {
      await expect(
        page.getByRole('tab', { name: /kontakte/i }),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole('tab', { name: /aktivitäten/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('tab', { name: /dokumente/i }),
      ).toBeVisible();
    });

    test('shows seeded contact for the client organization', async ({
      page,
    }) => {
      // Seed creates contact "Dr. Thomas Bauer" for the client org
      await expect(page.getByText('Thomas').first()).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText('Bauer').first()).toBeVisible();
    });

    test('shows contact position from seed data', async ({ page }) => {
      // Position: "Referatsleiter"
      await expect(page.getByText('Referatsleiter')).toBeVisible({
        timeout: 10000,
      });
    });

    test('shows "Hauptkontakt" badge for primary contact', async ({
      page,
    }) => {
      await expect(page.getByText('Hauptkontakt')).toBeVisible({
        timeout: 10000,
      });
    });

    test('Dokumente tab shows upload button', async ({ page }) => {
      await page.getByRole('tab', { name: /dokumente/i }).click();
      await expect(
        page.getByRole('button', { name: /dokument hochladen/i }),
      ).toBeVisible({ timeout: 10000 });
    });

    test('shows "Alle Kontakte verwalten" link', async ({ page }) => {
      await expect(
        page.getByRole('link', { name: /alle kontakte verwalten/i }),
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
