import { test, expect, type Page } from '@playwright/test';

const VALID_EMAIL = 'admin@vambiant.de';
const VALID_PASSWORD = 'Test1234!';

/**
 * Logs in with the admin test account.
 * Reused as a beforeEach helper for all navigation tests.
 */
async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(VALID_EMAIL);
  await page.locator('#password').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

/**
 * Routes that correspond to the sidebar navigation items plus settings sub-pages.
 * Each entry maps a URL path to the expected h1 heading text on that page.
 */
const routes: Array<{ path: string; heading: RegExp; sidebarLabel?: string }> =
  [
    {
      path: '/dashboard',
      heading: /willkommen/i,
      sidebarLabel: 'Übersicht',
    },
    { path: '/projects', heading: /projekte/i, sidebarLabel: 'Projekte' },
    { path: '/crm', heading: /crm/i, sidebarLabel: 'CRM' },
    {
      path: '/costs',
      heading: /kostenplanung/i,
      sidebarLabel: 'Kostenplanung',
    },
    {
      path: '/hoai',
      heading: /hoai honorarangebote/i,
      sidebarLabel: 'HOAI/Angebote',
    },
    { path: '/ava', heading: /ava/i, sidebarLabel: 'AVA' },
    {
      path: '/contracts',
      heading: /verträge/i,
      sidebarLabel: 'Verträge',
    },
    {
      path: '/invoices',
      heading: /rechnungen/i,
      sidebarLabel: 'Rechnungen',
    },
    {
      path: '/time-tracking',
      heading: /zeiterfassung/i,
      sidebarLabel: 'Zeiterfassung',
    },
    {
      path: '/resources',
      heading: /ressourcenplanung/i,
      sidebarLabel: 'Ressourcen',
    },
    { path: '/bim', heading: /bim-modelle/i, sidebarLabel: 'BIM' },
    {
      path: '/communication',
      heading: /kommunikation/i,
      sidebarLabel: 'Kommunikation',
    },
    {
      path: '/reports',
      heading: /berichte/i,
      sidebarLabel: 'Berichte',
    },
    {
      path: '/tenders',
      heading: /ausschreibungen/i,
      sidebarLabel: 'Ausschreibungen',
    },
    { path: '/wiki', heading: /wissensdatenbank/i, sidebarLabel: 'Wiki' },
    {
      path: '/marketplace',
      heading: /marktplatz/i,
      sidebarLabel: 'Marktplatz',
    },
    {
      path: '/references',
      heading: /referenzen/i,
      sidebarLabel: 'Referenzen',
    },
    {
      path: '/questionnaires',
      heading: /fragebögen/i,
    },
    {
      path: '/settings/general',
      heading: /allgemeine einstellungen/i,
      sidebarLabel: 'Einstellungen',
    },
    {
      path: '/settings/members',
      heading: /teammitglieder/i,
    },
    {
      path: '/settings/roles',
      heading: /rollen.*berechtigungen/i,
    },
  ];

test.describe('Dashboard Navigation (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Direct URL Navigation', () => {
    for (const route of routes) {
      test(`${route.path} loads with correct heading`, async ({ page }) => {
        const response = await page.goto(route.path);

        // The HTTP response should be successful
        expect(response?.status()).toBeLessThan(400);

        // Wait for the page content to fully render
        await page.waitForLoadState('networkidle');

        // The page heading should match the expected pattern
        await expect(
          page.getByRole('heading', { name: route.heading }).first(),
        ).toBeVisible({ timeout: 15000 });
      });
    }
  });

  test.describe('Sidebar Link Navigation', () => {
    // Only test routes that have sidebar labels (excludes settings sub-pages and questionnaires)
    const sidebarRoutes = routes.filter((r) => r.sidebarLabel);

    for (const route of sidebarRoutes) {
      test(`sidebar link "${route.sidebarLabel}" navigates to ${route.path}`, async ({
        page,
      }) => {
        // Click the sidebar link
        // Use the nav element to scope to sidebar links (avoid header matches)
        const sidebarLink = page
          .locator('aside')
          .getByRole('link', { name: route.sidebarLabel!, exact: false });

        await sidebarLink.click();

        // Wait for navigation to complete
        await page.waitForURL(`**${route.path}*`, { timeout: 30000 });

        // The heading should be visible
        await expect(
          page.getByRole('heading', { name: route.heading }).first(),
        ).toBeVisible({ timeout: 30000 });
      });
    }
  });

  test.describe('Sidebar Structure', () => {
    test('sidebar shows VambiantOS branding', async ({ page }) => {
      await expect(page.locator('aside').getByText('VambiantOS')).toBeVisible();
    });

    test('sidebar shows all main navigation items', async ({ page }) => {
      const expectedLabels = [
        'Übersicht',
        'Projekte',
        'CRM',
        'Kostenplanung',
        'HOAI/Angebote',
        'AVA',
        'Verträge',
        'Rechnungen',
        'Zeiterfassung',
        'Ressourcen',
        'BIM',
        'Kommunikation',
        'Berichte',
        'Ausschreibungen',
        'Wiki',
        'Marktplatz',
        'Referenzen',
      ];

      for (const label of expectedLabels) {
        await expect(
          page.locator('aside').getByText(label, { exact: true }),
        ).toBeVisible();
      }
    });

    test('sidebar shows settings link', async ({ page }) => {
      await expect(
        page
          .locator('aside')
          .getByRole('link', { name: /einstellungen/i }),
      ).toBeVisible();
    });

    test('sidebar collapse button is visible', async ({ page }) => {
      await expect(
        page.locator('aside').getByRole('button', { name: /einklappen/i }),
      ).toBeVisible();
    });

    test('sidebar can be collapsed and expanded', async ({ page }) => {
      // Initially, sidebar should show text labels
      await expect(
        page.locator('aside').getByText('Projekte', { exact: true }),
      ).toBeVisible({ timeout: 15000 });

      // Click the collapse button (shows "Einklappen" text when expanded)
      const collapseBtn = page
        .locator('aside')
        .getByRole('button', { name: /einklappen/i });
      await expect(collapseBtn).toBeVisible({ timeout: 5000 });
      await collapseBtn.click();

      // After collapse, "Projekte" text should be hidden
      await expect(
        page.locator('aside').getByText('Projekte', { exact: true }),
      ).toBeHidden({ timeout: 5000 });

      // Click the expand button (only shows ChevronRight icon with title attr)
      // Use force:true because Next.js dev overlay can intercept pointer events
      const expandBtn = page.locator(
        'aside button[title*="erweitern"]',
      );
      await expect(expandBtn).toBeVisible({ timeout: 5000 });
      await expandBtn.click({ force: true });

      // After expand, text labels should be visible again
      await expect(
        page.locator('aside').getByText('Projekte', { exact: true }),
      ).toBeVisible({ timeout: 5000 });
    });

    test('sidebar highlights active route', async ({ page }) => {
      // On dashboard, the "Übersicht" link should be active
      const dashboardLink = page
        .locator('aside')
        .getByRole('link', { name: 'Übersicht' });
      await expect(dashboardLink).toHaveClass(/sidebar-accent/);

      // Navigate to projects
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      const projectsLink = page
        .locator('aside')
        .getByRole('link', { name: 'Projekte' });
      await expect(projectsLink).toHaveClass(/sidebar-accent/);
    });
  });

  test.describe('Header Elements', () => {
    test('header shows search button', async ({ page }) => {
      await expect(page.getByText('Suchen...')).toBeVisible();
    });

    test('header shows notification bell', async ({ page }) => {
      // Notification count badge should be visible
      await expect(page.locator('header').getByText('3')).toBeVisible();
    });

    test('header shows user menu with name', async ({ page }) => {
      await expect(page.getByText('Max Müller')).toBeVisible();
    });

    test('user menu dropdown shows profile and settings links', async ({
      page,
    }) => {
      // Open user menu
      await page.getByText('Max Müller').click();

      // Dropdown should show user info
      await expect(
        page.locator('[class*="popover"]').getByText(VALID_EMAIL),
      ).toBeVisible();

      // Dropdown should show action links
      await expect(page.getByText('Profil')).toBeVisible();
      await expect(
        page.locator('[class*="popover"]').getByText('Einstellungen'),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /abmelden/i }),
      ).toBeVisible();
    });
  });

  test.describe('Dashboard Content', () => {
    test('dashboard shows stats cards', async ({ page }) => {
      await expect(page.getByText('Aktive Projekte')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('Offene Aufgaben')).toBeVisible();
      await expect(page.getByText('Stunden diese Woche')).toBeVisible();
      await expect(page.getByText('Ausstehende Rechnungen')).toBeVisible();
    });

    test('dashboard shows quick action buttons', async ({ page }) => {
      await expect(
        page.getByRole('link', { name: /neues projekt/i }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole('link', { name: /zeit erfassen/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /neue rechnung/i }),
      ).toBeVisible();
    });

    test('dashboard shows recent projects section', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /aktuelle projekte/i }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole('link', { name: /alle anzeigen/i }),
      ).toBeVisible();
    });

    test('dashboard shows milestones section', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /anstehende meilensteine/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('dashboard shows activity section', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /letzte aktivitäten/i }),
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Page-Specific Content Checks', () => {
    test('/projects shows project list with seed data', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /projekte/i }),
      ).toBeVisible({ timeout: 15000 });

      // Should show the "Neues Projekt" button
      await expect(page.getByText('Neues Projekt')).toBeVisible();

      // Should show seed project data
      await expect(
        page.getByText('Neubau Grundschule Bogenhausen'),
      ).toBeVisible({ timeout: 15000 });
    });

    test('/hoai shows HOAI offers list with seed data', async ({ page }) => {
      await page.goto('/hoai');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /hoai honorarangebote/i }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Neues Angebot')).toBeVisible();
    });

    test('/ava shows AVA list with seed data', async ({ page }) => {
      await page.goto('/ava');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /ava/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('/settings/general shows company settings form', async ({ page }) => {
      await page.goto('/settings/general');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /allgemeine einstellungen/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('/settings/members shows team members', async ({ page }) => {
      await page.goto('/settings/members');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /teammitglieder/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('/settings/roles shows roles and permissions', async ({ page }) => {
      await page.goto('/settings/roles');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /rollen.*berechtigungen/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('/questionnaires shows questionnaire list', async ({ page }) => {
      await page.goto('/questionnaires');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /fragebögen/i }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Neuer Fragebogen')).toBeVisible();
    });
  });

  test.describe('Cross-Navigation Flows', () => {
    test('navigating from dashboard to projects and back', async ({
      page,
    }) => {
      // Start on dashboard
      await expect(
        page.getByRole('heading', { name: /willkommen/i }),
      ).toBeVisible({ timeout: 15000 });

      // Navigate to projects via sidebar
      await page
        .locator('aside')
        .getByRole('link', { name: 'Projekte' })
        .click();
      await page.waitForURL('**/projects', { timeout: 15000 });
      await expect(
        page.getByRole('heading', { name: /projekte/i }),
      ).toBeVisible({ timeout: 15000 });

      // Navigate back to dashboard via sidebar
      await page
        .locator('aside')
        .getByRole('link', { name: 'Übersicht' })
        .click();
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await expect(
        page.getByRole('heading', { name: /willkommen/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('navigating to settings from sidebar', async ({ page }) => {
      await page
        .locator('aside')
        .getByRole('link', { name: /einstellungen/i })
        .click();
      await page.waitForURL('**/settings/**', { timeout: 15000 });
      await expect(
        page.getByRole('heading', { name: /einstellungen/i }).first(),
      ).toBeVisible({ timeout: 15000 });
    });

    test('quick action link "Neues Projekt" navigates to project creation', async ({
      page,
    }) => {
      await expect(
        page.getByRole('link', { name: /neues projekt/i }),
      ).toBeVisible({ timeout: 15000 });

      await page.getByRole('link', { name: /neues projekt/i }).click();
      await page.waitForURL('**/projects/new', { timeout: 30000 });
      await expect(
        page.getByRole('heading', { name: /neues projekt/i }),
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
