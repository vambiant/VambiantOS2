import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, changePasswordSchema } from '../auth';

describe('Auth Validators', () => {
  // =========================================================================
  // loginSchema
  // =========================================================================
  describe('loginSchema', () => {
    it('accepts valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'secureP4ss',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
        expect(result.data.password).toBe('secureP4ss');
        expect(result.data.rememberMe).toBe(false); // default
      }
    });

    it('accepts valid login with rememberMe true', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'secureP4ss',
        rememberMe: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBe(true);
      }
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'secureP4ss',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find((i) => i.path.includes('email'));
        expect(emailError).toBeDefined();
      }
    });

    it('rejects empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'secureP4ss',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password shorter than 8 characters', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pwError = result.error.issues.find((i) => i.path.includes('password'));
        expect(pwError).toBeDefined();
      }
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing email', () => {
      const result = loginSchema.safeParse({
        password: 'secureP4ss',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // registerSchema
  // =========================================================================
  describe('registerSchema', () => {
    const validRegister = {
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max@example.com',
      password: 'Secure1pass',
      confirmPassword: 'Secure1pass',
    };

    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse(validRegister);
      expect(result.success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        confirmPassword: 'DifferentPassword1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find((i) =>
          i.path.includes('confirmPassword'),
        );
        expect(confirmError).toBeDefined();
      }
    });

    it('rejects password without uppercase letter', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        password: 'nouppercase1',
        confirmPassword: 'nouppercase1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without a number', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        password: 'NoNumberHere',
        confirmPassword: 'NoNumberHere',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        password: 'Sh1',
        confirmPassword: 'Sh1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing firstName', () => {
      const { firstName, ...rest } = validRegister;
      const result = registerSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing lastName', () => {
      const { lastName, ...rest } = validRegister;
      const result = registerSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects empty firstName', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        firstName: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // changePasswordSchema
  // =========================================================================
  describe('changePasswordSchema', () => {
    const validChange = {
      currentPassword: 'OldPassword1',
      newPassword: 'NewPassword1',
      confirmPassword: 'NewPassword1',
    };

    it('accepts valid password change', () => {
      const result = changePasswordSchema.safeParse(validChange);
      expect(result.success).toBe(true);
    });

    it('rejects mismatched confirm password', () => {
      const result = changePasswordSchema.safeParse({
        ...validChange,
        confirmPassword: 'MismatchPassword1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find((i) =>
          i.path.includes('confirmPassword'),
        );
        expect(confirmError).toBeDefined();
      }
    });

    it('rejects new password without uppercase', () => {
      const result = changePasswordSchema.safeParse({
        ...validChange,
        newPassword: 'nouppercase1',
        confirmPassword: 'nouppercase1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects new password without number', () => {
      const result = changePasswordSchema.safeParse({
        ...validChange,
        newPassword: 'NoNumberHere',
        confirmPassword: 'NoNumberHere',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short new password', () => {
      const result = changePasswordSchema.safeParse({
        ...validChange,
        newPassword: 'Sh1',
        confirmPassword: 'Sh1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty current password', () => {
      const result = changePasswordSchema.safeParse({
        ...validChange,
        currentPassword: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
