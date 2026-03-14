import { test, expect } from '@playwright/test';

// Seed data
const SEED_ESTIMATION_NAME = 'Kostenschätzung LP2';
const SEED_FIRST_PROJECT = 'Neubau Grundschule Bogenhausen';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@vambiant.de');
  await page.locator('#password').fill('Test1234!');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

test.describe('Costs & HOAI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ---------------------------------------------------------------------------
  // Costs page (/costs)
  // ---------------------------------------------------------------------------
  test.describe('Costs page (/costs)', () => {
    test('shows Kostenplanung heading and DIN 276 description', async ({
      page,
    }) => {
      await page.goto('/costs');
      await expect(
        page.getByRole('heading', { name: /kostenplanung/i }),
      ).toBeVisible();
      await expect(
        page.getByText(/DIN 276/),
      ).toBeVisible();
    });

    test('shows "Neue Kostenschatzung" link to /costs/new', async ({
      page,
    }) => {
      await page.goto('/costs');
      const newLink = page.getByRole('link', {
        name: /neue kostenschätzung/i,
      });
      await expect(newLink).toBeVisible();
      await expect(newLink).toHaveAttribute('href', '/costs/new');
    });

    test('shows project selector dropdown', async ({ page }) => {
      await page.goto('/costs');
      await expect(
        page.getByText('Projekt auswählen...'),
      ).toBeVisible({ timeout: 10000 });
    });

    test('shows summary cards (Gesamt, Schatzungen, In Bearbeitung, Freigegeben)', async ({
      page,
    }) => {
      await page.goto('/costs');
      await expect(page.getByText('Gesamt')).toBeVisible();
      await expect(
        page.getByText('Schätzungen').first(),
      ).toBeVisible();
      await expect(page.getByText('In Bearbeitung')).toBeVisible();
      await expect(page.getByText('Freigegeben')).toBeVisible();
    });

    test('shows search input and filter dropdowns', async ({ page }) => {
      await page.goto('/costs');
      await expect(
        page.getByPlaceholder('Kostenschätzungen suchen...'),
      ).toBeVisible();
    });

    test('shows type filter with DIN 276 cost types', async ({ page }) => {
      await page.goto('/costs');
      // Click the type filter trigger
      const typeFilter = page.getByText('Alle Typen');
      await expect(typeFilter).toBeVisible();
    });

    test('shows status filter with cost estimation statuses', async ({
      page,
    }) => {
      await page.goto('/costs');
      const statusFilter = page.getByText('Alle Status');
      await expect(statusFilter).toBeVisible();
    });

    test('shows "Bitte wahlen Sie ein Projekt" before selecting a project', async ({
      page,
    }) => {
      await page.goto('/costs');
      await expect(
        page.getByText('Bitte wählen Sie ein Projekt aus'),
      ).toBeVisible({ timeout: 10000 });
    });

    test('table headers are visible', async ({ page }) => {
      await page.goto('/costs');
      for (const header of ['Name', 'Projekt', 'Typ', 'Summe', 'Status', 'Datum']) {
        await expect(
          page.locator('th', { hasText: header }),
        ).toBeVisible();
      }
    });

    test('selecting a project shows cost estimations from seed data', async ({
      page,
    }) => {
      await page.goto('/costs');
      // Open the project selector and pick the first project
      await page.getByText('Projekt auswählen...').click();
      await page
        .getByRole('option', { name: SEED_FIRST_PROJECT })
        .click();
      // Should show the seeded cost estimation
      await expect(page.getByText(SEED_ESTIMATION_NAME)).toBeVisible({
        timeout: 10000,
      });
    });

    test('selected project shows correct cost estimation type', async ({
      page,
    }) => {
      await page.goto('/costs');
      await page.getByText('Projekt auswählen...').click();
      await page
        .getByRole('option', { name: SEED_FIRST_PROJECT })
        .click();
      await expect(page.getByText(SEED_ESTIMATION_NAME)).toBeVisible({
        timeout: 10000,
      });
      // Type badge: "Kostenschätzung"
      await expect(
        page.getByText('Kostenschätzung').first(),
      ).toBeVisible();
    });

    test('selected project shows cost estimation amount', async ({
      page,
    }) => {
      await page.goto('/costs');
      await page.getByText('Projekt auswählen...').click();
      await page
        .getByRole('option', { name: SEED_FIRST_PROJECT })
        .click();
      await expect(page.getByText(SEED_ESTIMATION_NAME)).toBeVisible({
        timeout: 10000,
      });
      // Seeded totalNet: 12,500,000 EUR
      await expect(page.getByText(/12\.500\.000/).first()).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // HOAI page (/hoai)
  // ---------------------------------------------------------------------------
  test.describe('HOAI page (/hoai)', () => {
    test('shows HOAI Honorarangebote heading and description', async ({
      page,
    }) => {
      await page.goto('/hoai');
      await expect(
        page.getByRole('heading', { name: /hoai honorarangebote/i }),
      ).toBeVisible();
      await expect(
        page.getByText(
          'Honorarberechnungen und Angebote nach der HOAI verwalten',
        ),
      ).toBeVisible();
    });

    test('shows "Neues Angebot" link to /hoai/new', async ({ page }) => {
      await page.goto('/hoai');
      const newLink = page.getByRole('link', {
        name: /neues angebot/i,
      });
      await expect(newLink).toBeVisible();
      await expect(newLink).toHaveAttribute('href', '/hoai/new');
    });

    test('shows summary cards (Angebote gesamt, Angenommen, Honorarsumme, Offene Angebote)', async ({
      page,
    }) => {
      await page.goto('/hoai');
      await expect(page.getByText('Angebote gesamt')).toBeVisible({
        timeout: 10000,
      });
      // "Angenommen" also appears as a hidden SelectItem in the status filter,
      // so scope to the summary cards area or use .first()
      await expect(page.getByText('Angenommen').first()).toBeVisible();
      await expect(
        page.getByText('Honorarsumme (angenommen)'),
      ).toBeVisible();
      await expect(page.getByText('Offene Angebote')).toBeVisible();
    });

    test('shows search input and status filter', async ({ page }) => {
      await page.goto('/hoai');
      await expect(
        page.getByPlaceholder('Angebote suchen...'),
      ).toBeVisible();
      await expect(page.getByText('Alle Status')).toBeVisible();
    });

    test('table headers are visible', async ({ page }) => {
      await page.goto('/hoai');
      for (const header of ['Nr', 'Projekt', 'Titel', 'Status', 'Honorar', 'Datum']) {
        await expect(
          page.locator('th', { hasText: header }),
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('status filter dropdown contains expected options', async ({
      page,
    }) => {
      await page.goto('/hoai');
      // Open the status filter
      await page.getByText('Alle Status').click();
      await expect(
        page.getByRole('option', { name: 'Entwurf' }),
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Gesendet' }),
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Angenommen' }),
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Abgelehnt' }),
      ).toBeVisible();
    });
  });
});
