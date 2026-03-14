import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { ulid } from 'ulid';
import { users } from '@vambiant/db';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100),
  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100),
  email: z.string().email('Ungueltige E-Mail-Adresse'),
  password: z
    .string()
    .min(8, 'Mindestens 8 Zeichen')
    .regex(/[A-Z]/, 'Mindestens ein Grossbuchstabe')
    .regex(/[0-9]/, 'Mindestens eine Zahl'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwoerter stimmen nicht ueberein',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email('Ungueltige E-Mail-Adresse'),
  password: z.string().min(8, 'Mindestens 8 Zeichen'),
  rememberMe: z.boolean().optional().default(false),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  avatarPath: z.string().max(500).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
  newPassword: z
    .string()
    .min(8, 'Mindestens 8 Zeichen')
    .regex(/[A-Z]/, 'Mindestens ein Grossbuchstabe')
    .regex(/[0-9]/, 'Mindestens eine Zahl'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwoerter stimmen nicht ueberein',
  path: ['confirmPassword'],
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const authRouter = createTRPCRouter({
  /**
   * Register a new user account.
   */
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if email already exists
      const existing = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Create user record
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          ulid: ulid(),
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
        })
        .returning({
          id: users.id,
          ulid: users.ulid,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
        });

      return newUser!;
    }),

  /**
   * Log in with email and password.
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ ctx, input }) => {
      // Find user by email
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Ungueltige Anmeldedaten',
        });
      }

      if (user.deletedAt) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Konto deaktiviert',
        });
      }

      // Verify password hash
      if (!user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Ungueltige Anmeldedaten',
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Ungueltige Anmeldedaten',
        });
      }

      // Return user data (session creation handled by auth layer)
      return {
        id: user.id,
        ulid: user.ulid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        currentCompanyId: user.currentCompanyId,
      };
    }),

  /**
   * Log out and destroy the current session.
   */
  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Clear remember token
      await ctx.db
        .update(users)
        .set({ rememberToken: null, updatedAt: new Date() })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  /**
   * Get the currently authenticated user.
   */
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const [user] = await ctx.db
        .select({
          id: users.id,
          ulid: users.ulid,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          avatarPath: users.avatarPath,
          locale: users.locale,
          timezone: users.timezone,
          currentCompanyId: users.currentCompanyId,
          isSuperAdmin: users.isSuperAdmin,
          settings: users.settings,
          emailVerifiedAt: users.emailVerifiedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, ctx.session.user.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Benutzer nicht gefunden',
        });
      }

      return {
        ...user,
        companyId: ctx.session.companyId,
      };
    }),

  /**
   * Update the current user's profile.
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.session.user.id))
        .returning({
          id: users.id,
          ulid: users.ulid,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          avatarPath: users.avatarPath,
          locale: users.locale,
          timezone: users.timezone,
        });

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Benutzer nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Change the current user's password.
   */
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      // Get current user with password hash
      const [user] = await ctx.db
        .select({ id: users.id, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, ctx.session.user.id))
        .limit(1);

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Benutzer nicht gefunden',
        });
      }

      // Verify current password
      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aktuelles Passwort ist falsch',
        });
      }

      // Hash new password and update
      const newHash = await bcrypt.hash(input.newPassword, 12);
      await ctx.db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),
});
