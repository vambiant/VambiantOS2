import { test, expect } from '@playwright/test';

const VALID_EMAIL = 'admin@vambiant.de';
const VALID_PASSWORD = 'Test1234!';
const INVALID_EMAIL = 'wrong@example.com';
const INVALID_PASSWORD = 'WrongPassword123!';

test.describe('Authentication', () => {
  test.describe('Login Page Rendering', () => {
    test('should show login page with all expected elements', async ({
      page,
    }) => {
      await page.goto('/login');

      // Heading
      await expect(
        page.getByRole('heading', { name: /anmelden/i }),
      ).toBeVisible();

      // Subtitle
      await expect(
        page.getByText('Melden Sie sich mit Ihrem Konto an'),
      ).toBeVisible();

      // Email field
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#email')).toHaveAttribute('type', 'email');
      await expect(page.locator('#email')).toHaveAttribute(
        'placeholder',
        'name@unternehmen.de',
      );

      // Password field
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#password')).toHaveAttribute(
        'type',
        'password',
      );

      // Remember me checkbox
      await expect(page.locator('#rememberMe')).toBeVisible();

      // Submit button
      await expect(
        page.getByRole('button', { name: 'Anmelden', exact: true }),
      ).toBeVisible();

      // Forgot password link
      await expect(
        page.getByRole('link', { name: /passwort vergessen/i }),
      ).toBeVisible();

      // Microsoft OAuth button
      await expect(
        page.getByRole('button', { name: /microsoft/i }),
      ).toBeVisible();

      // Register link
      await expect(
        page.getByRole('link', { name: /registrieren/i }),
      ).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('#password');
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click the eye toggle button next to the password input
      await passwordInput.locator('..').getByRole('button').click();

      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Toggle back
      await passwordInput.locator('..').getByRole('button').click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Registration Page Rendering', () => {
    test('should show registration page with all expected elements', async ({
      page,
    }) => {
      await page.goto('/register');

      // Heading
      await expect(
        page.getByRole('heading', { name: /konto erstellen/i }),
      ).toBeVisible();

      // Subtitle
      await expect(
        page.getByText('Erstellen Sie Ihr VambiantOS-Konto'),
      ).toBeVisible();

      // Name fields
      await expect(page.locator('#firstName')).toBeVisible();
      await expect(page.locator('#lastName')).toBeVisible();

      // Email field
      await expect(page.locator('#email')).toBeVisible();

      // Password field
      await expect(page.locator('#password')).toBeVisible();

      // Confirm password field
      await expect(page.locator('#confirmPassword')).toBeVisible();

      // Terms checkbox
      await expect(page.locator('#acceptTerms')).toBeVisible();
      await expect(page.getByText(/nutzungsbedingungen/i)).toBeVisible();
      await expect(page.getByText(/datenschutzerklärung/i)).toBeVisible();

      // Submit button
      await expect(
        page.getByRole('button', { name: /registrieren/i }),
      ).toBeVisible();

      // Login link
      await expect(
        page.getByRole('link', { name: /anmelden/i }),
      ).toBeVisible();
    });

    test('should show password strength indicator when typing', async ({
      page,
    }) => {
      await page.goto('/register');

      const passwordInput = page.locator('#password');
      await passwordInput.fill('Abc12345');

      // Password strength indicator should appear
      await expect(page.getByText(/passwortstärke/i)).toBeVisible();
    });

    test('should show validation errors for empty required fields', async ({
      page,
    }) => {
      await page.goto('/register');

      // Click submit without filling anything
      await page.getByRole('button', { name: /registrieren/i }).click();

      // Should show validation errors
      await expect(page.getByText(/vorname ist erforderlich/i)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/nachname ist erforderlich/i)).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Navigation Between Auth Pages', () => {
    test('should navigate from login to register', async ({ page }) => {
      await page.goto('/login');
      await expect(
        page.getByRole('link', { name: /registrieren/i }),
      ).toBeVisible({ timeout: 30000 });
      await page.getByRole('link', { name: /registrieren/i }).click();
      await page.waitForURL('**/register', { timeout: 30000 });
      await expect(
        page.getByRole('heading', { name: /konto erstellen/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('should navigate from register to login', async ({ page }) => {
      await page.goto('/register');
      await expect(
        page.getByRole('link', { name: /anmelden/i }),
      ).toBeVisible({ timeout: 30000 });
      await page.getByRole('link', { name: /anmelden/i }).click();
      await page.waitForURL('**/login', { timeout: 30000 });
      await expect(
        page.getByRole('heading', { name: /anmelden/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('should navigate from login to forgot password', async ({ page }) => {
      await page.goto('/login');
      await expect(
        page.getByRole('link', { name: /passwort vergessen/i }),
      ).toBeVisible({ timeout: 30000 });
      await page.getByRole('link', { name: /passwort vergessen/i }).click();
      await page.waitForURL('**/forgot-password', { timeout: 30000 });
      await expect(
        page.getByRole('heading', { name: /passwort zurücksetzen/i }),
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Other Auth Pages', () => {
    test('should show 2FA verification page', async ({ page }) => {
      await page.goto('/verify-2fa');
      await expect(
        page.getByRole('heading', { name: /zwei-faktor/i }),
      ).toBeVisible();
    });

    test('should show forgot password page', async ({ page }) => {
      await page.goto('/forgot-password');
      await expect(
        page.getByRole('heading', { name: /passwort zurücksetzen/i }),
      ).toBeVisible();
    });
  });

  test.describe('Login With Valid Credentials', () => {
    test('should login successfully and redirect to dashboard', async ({
      page,
    }) => {
      await page.goto('/login');

      await page.locator('#email').fill(VALID_EMAIL);
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      await page.waitForURL('**/dashboard', { timeout: 30000 });
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should show welcome greeting with user name on dashboard', async ({
      page,
    }) => {
      await page.goto('/login');

      await page.locator('#email').fill(VALID_EMAIL);
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      await page.waitForURL('**/dashboard', { timeout: 30000 });

      // Dashboard shows "Willkommen zurück, Max"
      await expect(
        page.getByRole('heading', { name: /willkommen.*max/i }),
      ).toBeVisible({ timeout: 15000 });
    });

    test('should set session cookie after login', async ({ page }) => {
      await page.goto('/login');

      await page.locator('#email').fill(VALID_EMAIL);
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      await page.waitForURL('**/dashboard', { timeout: 30000 });

      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find((c) =>
        c.name.includes('vambiant-session'),
      );
      expect(sessionCookie).toBeDefined();
    });

    test('should show user name "Max Müller" in header after login', async ({
      page,
    }) => {
      await page.goto('/login');

      await page.locator('#email').fill(VALID_EMAIL);
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      await page.waitForURL('**/dashboard', { timeout: 30000 });

      // The header user menu should show "Max Müller"
      await expect(page.getByText('Max Müller')).toBeVisible({
        timeout: 10000,
      });
    });

    test('should show sidebar navigation after login', async ({ page }) => {
      await page.goto('/login');

      await page.locator('#email').fill(VALID_EMAIL);
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      await page.waitForURL('**/dashboard', { timeout: 30000 });

      // Sidebar should show VambiantOS branding
      await expect(page.getByText('VambiantOS')).toBeVisible({
        timeout: 10000,
      });

      // Sidebar should show key navigation items
      await expect(
        page.locator('aside').getByRole('link', { name: /projekte/i }),
      ).toBeVisible();
      await expect(
        page.locator('aside').getByRole('link', { name: /crm/i }),
      ).toBeVisible();
    });

    test('should show dashboard stats cards after login', async ({ page }) => {
      await page.goto('/login');

      await page.locator('#email').fill(VALID_EMAIL);
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      await page.waitForURL('**/dashboard', { timeout: 30000 });

      // Stats cards should be visible
      await expect(page.getByText('Aktive Projekte')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText('Offene Aufgaben')).toBeVisible();
      await expect(page.getByText('Ausstehende Rechnungen')).toBeVisible();
    });
  });

  test.describe('Login With Invalid Credentials', () => {
    test('should show error with wrong email', async ({ page }) => {
      await page.goto('/login');

      await page.locator('#email').fill(INVALID_EMAIL);
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      // Error banner should appear
      await expect(
        page.locator('[class*="destructive"]').first(),
      ).toBeVisible({ timeout: 15000 });

      // Should remain on login page
      await expect(page).toHaveURL(/login/);
    });

    test('should show error with wrong password', async ({ page }) => {
      await page.goto('/login');

      await page.locator('#email').fill(VALID_EMAIL);
      await page.locator('#password').fill(INVALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      // Error banner should appear
      await expect(
        page.locator('[class*="destructive"]').first(),
      ).toBeVisible({ timeout: 15000 });

      // Should remain on login page
      await expect(page).toHaveURL(/login/);
    });

    test('should show validation error for empty email', async ({ page }) => {
      await page.goto('/login');

      // Only fill password, leave email empty
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      // Should show email validation error
      await expect(page.getByText(/gültige e-mail/i)).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show validation error for empty password', async ({
      page,
    }) => {
      await page.goto('/login');

      // Only fill email, leave password empty
      await page.locator('#email').fill(VALID_EMAIL);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      // Should show password validation error
      await expect(page.getByText(/passwort ein/i)).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show validation error for invalid email format', async ({
      page,
    }) => {
      await page.goto('/login');

      // Disable browser-native form validation so the Zod schema can fire
      await page.locator('form').evaluate((form) => form.setAttribute('novalidate', ''));
      await page.locator('#email').fill('not-an-email');
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

      await expect(page.getByText(/gültige e-mail/i)).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Logout', () => {
    test('should logout and redirect to login page', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.locator('#email').fill(VALID_EMAIL);
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
      await page.waitForURL('**/dashboard', { timeout: 30000 });

      // Open user menu by clicking the user name/avatar button
      await page.getByText('Max Müller').click();

      // Click "Abmelden" (logout) in the dropdown
      await page.getByRole('button', { name: /abmelden/i }).click();

      // Should redirect to login page
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(
        page.getByRole('heading', { name: /anmelden/i }),
      ).toBeVisible();
    });

    test('should not be able to access dashboard after logout', async ({
      page,
    }) => {
      // Login
      await page.goto('/login');
      await page.locator('#email').fill(VALID_EMAIL);
      await page.locator('#password').fill(VALID_PASSWORD);
      await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
      await page.waitForURL('**/dashboard', { timeout: 30000 });

      // Logout
      await page.getByText('Max Müller').click();
      await page.getByRole('button', { name: /abmelden/i }).click();
      await page.waitForURL('**/login', { timeout: 15000 });

      // Try to access dashboard directly - should redirect back to login
      await page.goto('/dashboard');
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Protected Routes', () => {
    test('root redirects to login when not authenticated', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page).toHaveURL(/login/);
    });

    test('/dashboard redirects to login when not authenticated', async ({
      page,
    }) => {
      await page.goto('/dashboard');
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page).toHaveURL(/login/);
    });

    test('/projects redirects to login when not authenticated', async ({
      page,
    }) => {
      await page.goto('/projects');
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page).toHaveURL(/login/);
    });

    test('/settings/general redirects to login when not authenticated', async ({
      page,
    }) => {
      await page.goto('/settings/general');
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page).toHaveURL(/login/);
    });

    test('/crm redirects to login when not authenticated', async ({
      page,
    }) => {
      await page.goto('/crm');
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page).toHaveURL(/login/);
    });

    test('/invoices redirects to login when not authenticated', async ({
      page,
    }) => {
      await page.goto('/invoices');
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page).toHaveURL(/login/);
    });
  });
});
