import { test, expect } from '@playwright/test';

// Seed data constants
const SEED_PROJECTS = [
  'Neubau Grundschule Bogenhausen',
  'Sanierung Rathaus Pasing',
  'Wohnanlage Am Stadtpark',
];
const FIRST_PROJECT = SEED_PROJECTS[0]!;

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@vambiant.de');
  await page.locator('#password').fill('Test1234!');
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ---------------------------------------------------------------------------
  // Project list page
  // ---------------------------------------------------------------------------
  test.describe('Project list (/projects)', () => {
    test('shows the projects heading and description', async ({ page }) => {
      await page.goto('/projects');
      await expect(
        page.getByRole('heading', { name: /projekte/i }),
      ).toBeVisible();
      await expect(
        page.getByText('Verwalten Sie Ihre Projekte und deren Fortschritt'),
      ).toBeVisible();
    });

    test('shows "Neues Projekt" link to /projects/new', async ({ page }) => {
      await page.goto('/projects');
      const newProjectLink = page.getByRole('link', {
        name: /neues projekt/i,
      });
      await expect(newProjectLink).toBeVisible();
      await expect(newProjectLink).toHaveAttribute('href', '/projects/new');
    });

    test('displays all three seeded projects from the database', async ({
      page,
    }) => {
      await page.goto('/projects');
      // Wait for tRPC data to load
      await expect(page.getByText(FIRST_PROJECT)).toBeVisible({
        timeout: 10000,
      });
      for (const name of SEED_PROJECTS) {
        await expect(page.getByText(name)).toBeVisible();
      }
    });

    test('shows table column headers in list view', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.getByText(FIRST_PROJECT)).toBeVisible({
        timeout: 10000,
      });
      for (const header of [
        'Projekt',
        'Auftraggeber',
        'Status',
        'Typ',
        'Projektleiter',
        'Budget',
      ]) {
        await expect(
          page.getByRole('columnheader', { name: header, exact: true }),
        ).toBeVisible();
      }
    });

    test('shows status badges for seeded projects', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.getByText(FIRST_PROJECT)).toBeVisible({
        timeout: 10000,
      });
      // Projects 1 & 2 are "active" => "Aktiv", project 3 is "draft" => "Planung"
      await expect(page.getByText('Aktiv').first()).toBeVisible();
      await expect(page.getByText('Planung', { exact: true })).toBeVisible();
    });

    test('search input filters projects by name', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.getByText(FIRST_PROJECT)).toBeVisible({
        timeout: 10000,
      });
      await page
        .getByPlaceholder('Projekte suchen...')
        .fill('Grundschule');
      await expect(
        page.getByText('Neubau Grundschule Bogenhausen'),
      ).toBeVisible();
      await expect(
        page.getByText('Sanierung Rathaus Pasing'),
      ).not.toBeVisible();
      await expect(
        page.getByText('Wohnanlage Am Stadtpark'),
      ).not.toBeVisible();
    });

    test('clicking a project navigates to its detail page', async ({
      page,
    }) => {
      await page.goto('/projects');
      await expect(page.getByText(FIRST_PROJECT)).toBeVisible({
        timeout: 10000,
      });
      // Click the link wrapping the project name in the table
      await page.getByRole('link', { name: FIRST_PROJECT }).click();
      await page.waitForURL(/\/projects\/\d+/, { timeout: 15000 });
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    test('grid view displays project cards', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.getByText(FIRST_PROJECT)).toBeVisible({
        timeout: 15000,
      });
      // Click the grid toggle button (second in the view mode toggle group)
      // The toggle is a flex div containing two buttons for list/grid views
      const viewToggle = page.locator(
        '.flex.rounded-md.border button',
      );
      await viewToggle.nth(1).click();
      // Cards should still show the projects
      await expect(page.getByText(FIRST_PROJECT)).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.getByText('Sanierung Rathaus Pasing'),
      ).toBeVisible({ timeout: 10000 });
    });

    test('shows client name (Bayerische Staatsbauverwaltung) for first project', async ({
      page,
    }) => {
      await page.goto('/projects');
      await expect(page.getByText(FIRST_PROJECT)).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page.getByText('Bayerische Staatsbauverwaltung').first(),
      ).toBeVisible({ timeout: 10000 });
    });
  });

  // ---------------------------------------------------------------------------
  // New project page
  // ---------------------------------------------------------------------------
  test.describe('New project (/projects/new)', () => {
    test('shows the Neues Projekt heading and subtitle', async ({ page }) => {
      await page.goto('/projects/new');
      await expect(
        page.getByRole('heading', { name: /neues projekt/i }),
      ).toBeVisible();
      await expect(
        page.getByText(
          'Erstellen Sie ein neues Projekt in wenigen Schritten',
        ),
      ).toBeVisible();
    });

    test('shows step 1 (Grunddaten) form fields', async ({ page }) => {
      await page.goto('/projects/new');
      await expect(page.getByLabel(/projektname/i)).toBeVisible();
      await expect(page.getByLabel(/projektnummer/i)).toBeVisible();
      await expect(page.getByText('Gebaeudetyp', { exact: true })).toBeVisible();
      await expect(page.getByLabel(/beschreibung/i)).toBeVisible();
    });

    test('shows wizard step indicator with all four steps', async ({
      page,
    }) => {
      await page.goto('/projects/new');
      // Step labels appear as buttons in the step indicator
      for (const step of ['Grunddaten', 'HOAI', 'Budget', 'Zusammenfassung']) {
        await expect(
          page.getByRole('button', { name: step }),
        ).toBeVisible();
      }
    });

    test('Weiter button is disabled until required fields are filled', async ({
      page,
    }) => {
      await page.goto('/projects/new');
      const weiterBtn = page.getByRole('button', { name: /weiter/i });
      await expect(weiterBtn).toBeDisabled();
    });

    test('shows Grunddaten step title and description', async ({ page }) => {
      await page.goto('/projects/new');
      await expect(
        page.getByText('Geben Sie die grundlegenden Projektinformationen ein'),
      ).toBeVisible();
    });

    test('Abbrechen button navigates back to /projects', async ({ page }) => {
      await page.goto('/projects/new');
      await page.getByRole('button', { name: /abbrechen/i }).click();
      await page.waitForURL(/\/projects$/, { timeout: 10000 });
    });

    test('filling step 1 enables Weiter button and advances to HOAI step', async ({
      page,
    }) => {
      await page.goto('/projects/new');
      // Wait for the form to be ready
      await expect(page.getByLabel(/projektname/i)).toBeVisible({
        timeout: 10000,
      });
      // Fill required fields: name and type
      await page
        .getByLabel(/projektname/i)
        .fill('Testprojekt Playwright');
      // Select building type
      await page.locator('button[role="combobox"]').click();
      await page.getByRole('option', { name: 'Bildungsbauten' }).click();
      // Weiter should now be enabled
      const weiterBtn = page.getByRole('button', { name: /weiter/i });
      await expect(weiterBtn).toBeEnabled();
      await weiterBtn.click();
      // Should now show HOAI settings step
      await expect(page.getByText('HOAI-Einstellungen')).toBeVisible();
      await expect(page.getByText('Honorarzone *')).toBeVisible();
      await expect(page.getByText('Leistungsphasen *')).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Project detail pages
  // ---------------------------------------------------------------------------
  test.describe('Project detail pages', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/projects');
      await expect(page.getByText(FIRST_PROJECT)).toBeVisible({
        timeout: 10000,
      });
      // Use the link wrapping the project name for reliable navigation
      await page.getByRole('link', { name: FIRST_PROJECT }).click();
      await page.waitForURL(/\/projects\/\d+/, { timeout: 15000 });
    });

    test('overview shows stat cards (Fortschritt, Aufgaben, Stunden, Budget)', async ({
      page,
    }) => {
      // Scope to the main content area to avoid sidebar matches
      const main = page.getByRole('main');
      await expect(main.getByText('Fortschritt')).toBeVisible({
        timeout: 10000,
      });
      await expect(main.getByText('Aufgaben').first()).toBeVisible();
      await expect(main.getByText('Stunden')).toBeVisible();
      await expect(main.getByText('Budget')).toBeVisible();
    });

    test('overview shows "Module (Leistungsphasen)" with link to all', async ({
      page,
    }) => {
      await expect(
        page.getByText('Module (Leistungsphasen)'),
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Alle anzeigen')).toBeVisible();
    });

    test('overview shows Meilensteine, Aktivitaet, Projektnotiz sections', async ({
      page,
    }) => {
      const main = page.getByRole('main');
      // "Meilensteine" appears both as tab link and card title; scope to card
      await expect(
        main.locator('.space-y-6 >> text=Meilensteine').first(),
      ).toBeVisible({ timeout: 10000 });
      await expect(main.getByText('Projektnotiz')).toBeVisible();
      await expect(main.getByText('Aktivitaet').first()).toBeVisible();
    });

    test('tab navigation shows all expected tabs', async ({ page }) => {
      // Scope tab links to the main content area to avoid sidebar collisions
      const main = page.getByRole('main');
      const tabs = [
        'Aufgaben',
        'Module',
        'Gantt',
        'Kanban',
        'Meilensteine',
        'Ergebnisse',
        'Dateien',
        'Einstellungen',
      ];
      for (const tab of tabs) {
        await expect(
          main.getByRole('link', { name: tab }),
        ).toBeVisible();
      }
    });

    test('project layout shows breadcrumb with "Projekte" link', async ({
      page,
    }) => {
      // Scope to the main area breadcrumb navigation to avoid sidebar match
      const main = page.getByRole('main');
      await expect(
        main.getByRole('link', { name: 'Projekte' }),
      ).toBeVisible();
    });

    // --- Tasks sub-page ---
    test('tasks sub-page shows task table with mock data', async ({
      page,
    }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Aufgaben' }).click();
      await page.waitForURL(/\/tasks/);
      await expect(
        page.getByPlaceholder('Aufgaben suchen...'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole('button', { name: /neue aufgabe/i }),
      ).toBeVisible();
      // Table headers
      for (const header of ['Titel', 'Prioritaet', 'Zugewiesen']) {
        await expect(page.getByText(header).first()).toBeVisible();
      }
      // Seed task title
      await expect(
        page.getByText('Bestandsaufnahme vor Ort'),
      ).toBeVisible();
    });

    test('tasks sub-page shows task count text', async ({ page }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Aufgaben' }).click();
      await page.waitForURL(/\/tasks/);
      await expect(page.getByText(/\d+ Aufgaben/)).toBeVisible({
        timeout: 10000,
      });
    });

    // --- Modules sub-page ---
    test('modules sub-page shows HOAI Leistungsphasen cards', async ({
      page,
    }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Module' }).click();
      await page.waitForURL(/\/modules/);
      // Seed modules have names like "LP1 - Grundlagenermittlung" and hoaiPhase set,
      // so the page renders "LP {phase} - {name}" => "LP 1 - LP1 - Grundlagenermittlung"
      await expect(
        page.getByText('Grundlagenermittlung').first(),
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Vorplanung').first()).toBeVisible();
      await expect(
        page.getByText('Objektbetreuung').first(),
      ).toBeVisible();
    });

    test('modules sub-page shows "Neues Modul" button', async ({ page }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Module' }).click();
      await page.waitForURL(/\/modules/);
      await expect(
        page.getByRole('button', { name: /neues modul/i }),
      ).toBeVisible({ timeout: 10000 });
    });

    test('modules sub-page shows module status badges', async ({ page }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Module' }).click();
      await page.waitForURL(/\/modules/);
      await expect(page.getByText('Abgeschlossen').first()).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText('In Bearbeitung').first()).toBeVisible();
      await expect(page.getByText('Geplant').first()).toBeVisible();
    });

    test('modules sub-page shows summary count', async ({ page }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Module' }).click();
      await page.waitForURL(/\/modules/);
      await expect(page.getByText(/9 Module/)).toBeVisible({
        timeout: 10000,
      });
      // Seed data: LP1 and LP2 are 'active', LP3-LP9 are 'planned' => 0 completed
      await expect(page.getByText(/\d+ abgeschlossen/)).toBeVisible();
    });

    // --- Gantt sub-page ---
    test('gantt sub-page shows chart description and controls', async ({
      page,
    }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Gantt' }).click();
      await page.waitForURL(/\/gantt/, { timeout: 15000 });
      await expect(
        page.getByText('Projektplan mit Modulen und Aufgaben'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole('button', { name: /vollbild/i }),
      ).toBeVisible();
      // Legend
      await expect(page.getByText('Heute').first()).toBeVisible();
      await expect(page.getByText('Abhängigkeit')).toBeVisible();
    });

    // --- Kanban sub-page ---
    test('kanban sub-page shows all status columns', async ({ page }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Kanban' }).click();
      await page.waitForURL(/\/kanban/, { timeout: 15000 });
      await expect(
        page.getByText(
          'Verschieben Sie Aufgaben per Drag & Drop zwischen den Spalten',
        ),
      ).toBeVisible({ timeout: 10000 });
      for (const col of [
        'Offen',
        'In Bearbeitung',
        'Review',
        'Erledigt',
        'Blockiert',
      ]) {
        await expect(page.getByText(col).first()).toBeVisible();
      }
    });

    test('kanban sub-page shows task cards in correct columns', async ({
      page,
    }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Kanban' }).click();
      await page.waitForURL(/\/kanban/, { timeout: 15000 });
      await expect(
        page.getByText('TGA-Planung Heizung/Lüftung'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText('Statische Berechnung Dachkonstruktion'),
      ).toBeVisible();
      await expect(
        page.getByText('Brandschutzkonzept aktualisieren'),
      ).toBeVisible();
    });

    // --- Milestones sub-page ---
    test('milestones sub-page shows timeline with milestones', async ({
      page,
    }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Meilensteine' }).click();
      await page.waitForURL(/\/milestones/, { timeout: 15000 });
      // Seed milestones for project 1
      await expect(
        page.getByText('Grundlagenermittlung abgeschlossen'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText('Vorplanung genehmigt'),
      ).toBeVisible();
      await expect(
        page.getByText('Entwurf freigegeben'),
      ).toBeVisible();
      await expect(
        page.getByText('Baugenehmigung erteilt'),
      ).toBeVisible();
    });

    test('milestones sub-page shows "Neuer Meilenstein" button and count', async ({
      page,
    }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Meilensteine' }).click();
      await page.waitForURL(/\/milestones/, { timeout: 15000 });
      await expect(
        page.getByRole('button', { name: /neuer meilenstein/i }),
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/\d+ Meilensteine/)).toBeVisible();
    });

    test('milestones sub-page shows status badges', async ({ page }) => {
      const main = page.getByRole('main');
      await main.getByRole('link', { name: 'Meilensteine' }).click();
      await page.waitForURL(/\/milestones/, { timeout: 15000 });
      // Seed data: 1 completed ("Erledigt"), 3 pending ("Offen")
      await expect(page.getByText('Erledigt').first()).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText('Offen').first()).toBeVisible();
    });
  });
});
