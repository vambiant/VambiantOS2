import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { users, companies, companyUser, companyInvitations, roles } from '@vambiant/db';
import { createTRPCRouter, companyProcedure, protectedProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const addressSchema = z.object({
  street: z.string().max(255).optional(),
  streetNumber: z.string().max(20).optional(),
  zip: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  bundesland: z.string().max(100).optional(),
});

const contactInfoSchema = z.object({
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  email: z.string().email('Ungueltige E-Mail-Adresse').optional().or(z.literal('')),
  website: z.string().url('Ungueltige URL').optional().or(z.literal('')),
});

const createCompanySchema = z.object({
  name: z.string().min(1, 'Firmenname ist erforderlich').max(255),
  legalForm: z.string().max(50).optional(),
  domain: z.string().max(255).optional().or(z.literal('')),
  taxId: z.string().max(50).optional(),
  vatId: z.string().max(50).optional(),
  address: addressSchema.optional(),
  contact: contactInfoSchema.optional(),
  logoPath: z.string().max(500).optional(),
});

const updateCompanySchema = createCompanySchema.partial().extend({
  billingConfig: z
    .object({
      defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
      defaultVatRate: z.number().min(0).max(100).optional(),
      currency: z.string().length(3).optional(),
      bankName: z.string().max(255).optional(),
      iban: z.string().max(34).optional(),
      bic: z.string().max(11).optional(),
    })
    .optional(),
  offerNumberPattern: z.string().max(100).optional(),
  settings: z
    .object({
      locale: z.string().max(10).optional(),
      timezone: z.string().max(50).optional(),
      dateFormat: z.string().max(20).optional(),
      fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
    })
    .optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Ungueltige E-Mail-Adresse'),
  roleId: z.number().int().positive().optional(),
});

const updateMemberRoleSchema = z.object({
  userId: z.number().int().positive(),
  roleId: z.number().int().positive(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const switchCompanySchema = z.object({
  companyId: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateToken(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const companiesRouter = createTRPCRouter({
  /**
   * List all companies the current user is a member of.
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const results = await ctx.db
        .select({
          id: companies.id,
          name: companies.name,
          legalForm: companies.legalForm,
          logoPath: companies.logoPath,
          joinedAt: companyUser.joinedAt,
          roleId: companyUser.roleId,
        })
        .from(companyUser)
        .innerJoin(companies, eq(companyUser.companyId, companies.id))
        .where(
          and(
            eq(companyUser.userId, ctx.session.user.id),
            sql`${companies.deletedAt} IS NULL`,
          ),
        );

      // Fetch role names for each result
      const roleIds = results.map((r) => r.roleId).filter((id): id is number => id !== null);
      let roleMap: Record<number, { name: string; slug: string }> = {};
      if (roleIds.length > 0) {
        const roleRecords = await ctx.db
          .select({ id: roles.id, name: roles.name, slug: roles.slug })
          .from(roles)
          .where(sql`${roles.id} IN (${sql.join(roleIds.map(id => sql`${id}`), sql`, `)})`);
        for (const r of roleRecords) {
          roleMap[r.id] = { name: r.name, slug: r.slug };
        }
      }

      return results.map((r) => ({
        id: r.id,
        name: r.name,
        legalForm: r.legalForm,
        logoPath: r.logoPath,
        role: r.roleId ? (roleMap[r.roleId]?.slug ?? null) : null,
        joinedAt: r.joinedAt,
      }));
    }),

  /**
   * Get a single company by ID (must be a member).
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      // Verify user is a member of this company
      const [membership] = await ctx.db
        .select({ id: companyUser.id })
        .from(companyUser)
        .where(
          and(
            eq(companyUser.companyId, input.id),
            eq(companyUser.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Kein Zugriff auf dieses Unternehmen',
        });
      }

      const [company] = await ctx.db
        .select()
        .from(companies)
        .where(and(eq(companies.id, input.id), sql`${companies.deletedAt} IS NULL`))
        .limit(1);

      if (!company) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Unternehmen nicht gefunden',
        });
      }

      return company;
    }),

  /**
   * Create a new company and assign the creator as admin.
   */
  create: protectedProcedure
    .input(createCompanySchema)
    .mutation(async ({ ctx, input }) => {
      const companyUlid = ulid();

      // Create company record
      const [newCompany] = await ctx.db
        .insert(companies)
        .values({
          ulid: companyUlid,
          name: input.name,
          legalForm: input.legalForm,
          domain: input.domain || null,
          taxId: input.taxId,
          vatId: input.vatId,
          address: input.address,
          contact: input.contact,
          logoPath: input.logoPath,
        })
        .returning();

      if (!newCompany) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unternehmen konnte nicht erstellt werden',
        });
      }

      // Create admin role for company
      const [adminRole] = await ctx.db
        .insert(roles)
        .values({
          companyId: newCompany.id,
          name: 'Administrator',
          slug: 'admin',
          permissions: ['*'],
          isSystem: true,
        })
        .returning();

      // Create member role
      await ctx.db
        .insert(roles)
        .values({
          companyId: newCompany.id,
          name: 'Mitglied',
          slug: 'member',
          permissions: ['read'],
          isSystem: true,
        });

      // Create companyUser pivot with admin role
      await ctx.db.insert(companyUser).values({
        companyId: newCompany.id,
        userId: ctx.session.user.id,
        roleId: adminRole!.id,
      });

      // Set as user's currentCompanyId
      await ctx.db
        .update(users)
        .set({ currentCompanyId: newCompany.id, updatedAt: new Date() })
        .where(eq(users.id, ctx.session.user.id));

      return newCompany;
    }),

  /**
   * Update company details and settings.
   */
  update: companyProcedure
    .input(updateCompanySchema)
    .mutation(async ({ ctx, input }) => {
      const { billingConfig, settings, offerNumberPattern, ...rest } = input;

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      if (billingConfig !== undefined) updateData.billingConfig = billingConfig;
      if (settings !== undefined) updateData.settings = settings;
      if (offerNumberPattern !== undefined) updateData.offerNumberPattern = offerNumberPattern;

      const [updated] = await ctx.db
        .update(companies)
        .set(updateData)
        .where(eq(companies.id, ctx.companyId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Unternehmen nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Invite a user to the company by email.
   */
  inviteMember: companyProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user already a member
      const existingUser = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        const existingMembership = await ctx.db
          .select({ id: companyUser.id })
          .from(companyUser)
          .where(
            and(
              eq(companyUser.companyId, ctx.companyId),
              eq(companyUser.userId, existingUser[0]!.id),
            ),
          )
          .limit(1);

        if (existingMembership.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Benutzer ist bereits Mitglied',
          });
        }
      }

      // Check if invitation already pending
      const existingInvite = await ctx.db
        .select({ id: companyInvitations.id })
        .from(companyInvitations)
        .where(
          and(
            eq(companyInvitations.companyId, ctx.companyId),
            eq(companyInvitations.email, input.email.toLowerCase()),
            sql`${companyInvitations.acceptedAt} IS NULL`,
            sql`${companyInvitations.expiresAt} > NOW()`,
          ),
        )
        .limit(1);

      if (existingInvite.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Einladung bereits gesendet',
        });
      }

      // Generate invitation token
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      // Create companyInvitations record
      const [invitation] = await ctx.db
        .insert(companyInvitations)
        .values({
          companyId: ctx.companyId,
          email: input.email.toLowerCase(),
          roleId: input.roleId ?? null,
          token,
          invitedBy: ctx.session.user.id,
          expiresAt,
        })
        .returning();

      return invitation!;
    }),

  /**
   * Remove a member from the company.
   */
  removeMember: companyProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent removing yourself
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Sie koennen sich nicht selbst entfernen',
        });
      }

      // Delete companyUser pivot record
      const deleted = await ctx.db
        .delete(companyUser)
        .where(
          and(
            eq(companyUser.companyId, ctx.companyId),
            eq(companyUser.userId, input.userId),
          ),
        )
        .returning({ id: companyUser.id });

      if (deleted.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mitglied nicht gefunden',
        });
      }

      // Clear user's currentCompanyId if it matches
      await ctx.db
        .update(users)
        .set({ currentCompanyId: null, updatedAt: new Date() })
        .where(
          and(
            eq(users.id, input.userId),
            eq(users.currentCompanyId, ctx.companyId),
          ),
        );

      return { success: true };
    }),

  /**
   * Update a member's role within the company.
   */
  updateMemberRole: companyProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify target user is a member
      const [membership] = await ctx.db
        .select({ id: companyUser.id })
        .from(companyUser)
        .where(
          and(
            eq(companyUser.companyId, ctx.companyId),
            eq(companyUser.userId, input.userId),
          ),
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mitglied nicht gefunden',
        });
      }

      // Verify role belongs to company
      const [role] = await ctx.db
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(eq(roles.id, input.roleId), eq(roles.companyId, ctx.companyId)),
        )
        .limit(1);

      if (!role) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Rolle nicht gefunden',
        });
      }

      await ctx.db
        .update(companyUser)
        .set({ roleId: input.roleId })
        .where(
          and(
            eq(companyUser.companyId, ctx.companyId),
            eq(companyUser.userId, input.userId),
          ),
        );

      return { success: true };
    }),

  /**
   * List all members of the current company.
   */
  getMembers: companyProcedure
    .query(async ({ ctx }) => {
      const results = await ctx.db
        .select({
          id: companyUser.id,
          userId: companyUser.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          roleId: companyUser.roleId,
          joinedAt: companyUser.joinedAt,
        })
        .from(companyUser)
        .innerJoin(users, eq(companyUser.userId, users.id))
        .where(eq(companyUser.companyId, ctx.companyId));

      // Fetch roles
      const roleIds = results.map((r) => r.roleId).filter((id): id is number => id !== null);
      let roleMap: Record<number, { id: number; name: string; slug: string }> = {};
      if (roleIds.length > 0) {
        const roleRecords = await ctx.db
          .select({ id: roles.id, name: roles.name, slug: roles.slug })
          .from(roles)
          .where(sql`${roles.id} IN (${sql.join(roleIds.map(id => sql`${id}`), sql`, `)})`);
        for (const r of roleRecords) {
          roleMap[r.id] = r;
        }
      }

      return results.map((r) => ({
        id: r.id,
        userId: r.userId,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        role: r.roleId ? (roleMap[r.roleId] ?? null) : null,
        joinedAt: r.joinedAt,
      }));
    }),

  /**
   * Switch the current user's active company.
   */
  switchCompany: protectedProcedure
    .input(switchCompanySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user is a member of the target company
      const [membership] = await ctx.db
        .select({ id: companyUser.id })
        .from(companyUser)
        .where(
          and(
            eq(companyUser.companyId, input.companyId),
            eq(companyUser.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sie sind kein Mitglied dieses Unternehmens',
        });
      }

      // Update users.currentCompanyId
      await ctx.db
        .update(users)
        .set({ currentCompanyId: input.companyId, updatedAt: new Date() })
        .where(eq(users.id, ctx.session.user.id));

      // Return the new company info
      const [company] = await ctx.db
        .select({ id: companies.id, name: companies.name, ulid: companies.ulid })
        .from(companies)
        .where(eq(companies.id, input.companyId))
        .limit(1);

      return company!;
    }),
});
