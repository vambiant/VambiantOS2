import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, like, desc, asc, sql, count, isNull } from 'drizzle-orm';
import { organizations, contacts, crmActivities, users } from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const organizationTypeEnum = z.enum(['client', 'contractor', 'partner']);

const addressSchema = z.object({
  street: z.string().max(255).optional(),
  streetNumber: z.string().max(20).optional(),
  zip: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
});

const contactInfoSchema = z.object({
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
});

const orgFilterSchema = z
  .object({
    type: organizationTypeEnum.optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
    search: z.string().max(200).optional(),
    responsibleUserId: z.number().int().positive().optional(),
  })
  .merge(paginationSchema);

const createOrgSchema = z.object({
  type: organizationTypeEnum,
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  legalForm: z.string().max(50).optional(),
  taxId: z.string().max(50).optional(),
  vatId: z.string().max(50).optional(),
  address: addressSchema.optional(),
  contact: contactInfoSchema.optional(),
  classification: z
    .object({
      industry: z.string().max(100).optional(),
      size: z.string().max(50).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      segment: z.string().max(100).optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  financial: z
    .object({
      creditRating: z.string().max(50).optional(),
      paymentTerms: z.number().int().min(0).max(365).optional(),
      defaultCurrency: z.string().length(3).optional(),
      taxExempt: z.boolean().optional(),
      discountPercentage: z.number().min(0).max(100).optional(),
      iban: z.string().max(34).optional(),
      bic: z.string().max(11).optional(),
      bankName: z.string().max(255).optional(),
    })
    .optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  clientNumber: z.string().max(50).optional(),
  creditorNumber: z.string().max(50).optional(),
  debitorId: z.string().max(50).optional(),
  responsibleUserId: z.number().int().positive().optional(),
});

const updateOrgSchema = createOrgSchema.partial().extend({
  id: z.number().int().positive(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const contactsListSchema = z.object({
  organizationId: z.number().int().positive(),
});

const createContactSchema = z.object({
  organizationId: z.number().int().positive().optional(),
  salutation: z.string().max(20).optional(),
  title: z.string().max(50).optional(),
  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100),
  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
  useOrgAddress: z.boolean().optional(),
  address: addressSchema.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateContactSchema = createContactSchema.partial().extend({
  id: z.number().int().positive(),
});

const activityTypeEnum = z.enum(['call', 'email', 'meeting', 'note', 'task']);

const activitiesListSchema = z
  .object({
    organizationId: z.number().int().positive().optional(),
    contactId: z.number().int().positive().optional(),
    activityType: activityTypeEnum.optional(),
  })
  .merge(paginationSchema);

const createActivitySchema = z.object({
  organizationId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  activityType: activityTypeEnum,
  subject: z.string().max(500).optional(),
  description: z.string().optional(),
  scheduledAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyOrgCompany(db: any, orgId: number, companyId: number) {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        eq(organizations.id, orgId),
        eq(organizations.companyId, companyId),
        isNull(organizations.deletedAt),
      ),
    )
    .limit(1);

  if (!org) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Organisation nicht gefunden',
    });
  }
  return org;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const crmRouter = createTRPCRouter({
  organizations: createTRPCRouter({
    /**
     * List organizations with pagination and filtering.
     */
    list: companyProcedure
      .input(orgFilterSchema)
      .query(async ({ ctx, input }) => {
        const conditions: any[] = [
          eq(organizations.companyId, ctx.companyId),
          isNull(organizations.deletedAt),
        ];

        if (input.type) conditions.push(eq(organizations.type, input.type));
        if (input.status) conditions.push(eq(organizations.status, input.status));
        if (input.responsibleUserId) conditions.push(eq(organizations.responsibleUserId, input.responsibleUserId));
        if (input.search) conditions.push(like(organizations.name, `%${input.search}%`));

        const whereClause = and(...conditions);

        const countResult = await ctx.db
          .select({ total: count() })
          .from(organizations)
          .where(whereClause);
        const total = countResult[0]?.total ?? 0;

        const orderDir = input.sortOrder === 'desc' ? desc : asc;
        const orderField =
          input.sortBy === 'name' ? organizations.name :
          input.sortBy === 'type' ? organizations.type :
          input.sortBy === 'lastContactAt' ? organizations.lastContactAt :
          organizations.createdAt;

        const items = await ctx.db
          .select({
            id: organizations.id,
            type: organizations.type,
            name: organizations.name,
            legalForm: organizations.legalForm,
            status: organizations.status,
            clientNumber: organizations.clientNumber,
            contact: organizations.contact,
            address: organizations.address,
            responsibleUserId: organizations.responsibleUserId,
            lastContactAt: organizations.lastContactAt,
            createdAt: organizations.createdAt,
          })
          .from(organizations)
          .where(whereClause)
          .orderBy(orderDir(orderField))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        // Batch fetch responsible user names
        const userIds = items.map(i => i.responsibleUserId).filter((id): id is number => id !== null);
        let userMap: Record<number, string> = {};
        if (userIds.length > 0) {
          const userRecords = await ctx.db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
          for (const u of userRecords) {
            userMap[u.id] = `${u.firstName} ${u.lastName}`;
          }
        }

        return {
          items: items.map((item) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            legalForm: item.legalForm,
            status: item.status,
            clientNumber: item.clientNumber,
            contactEmail: (item.contact as any)?.email ?? null,
            contactPhone: (item.contact as any)?.phone ?? null,
            city: (item.address as any)?.city ?? null,
            responsibleUserName: item.responsibleUserId ? (userMap[item.responsibleUserId] ?? null) : null,
            lastContactAt: item.lastContactAt,
            createdAt: item.createdAt,
          })),
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Get an organization with contacts and recent activities.
     */
    getById: companyProcedure
      .input(idSchema)
      .query(async ({ ctx, input }) => {
        const [org] = await ctx.db
          .select()
          .from(organizations)
          .where(
            and(
              eq(organizations.id, input.id),
              eq(organizations.companyId, ctx.companyId),
              isNull(organizations.deletedAt),
            ),
          )
          .limit(1);

        if (!org) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Organisation nicht gefunden',
          });
        }

        // Get contacts
        const orgContacts = await ctx.db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.organizationId, input.id),
              isNull(contacts.deletedAt),
            ),
          )
          .orderBy(desc(contacts.isPrimary), asc(contacts.lastName));

        // Get contact count
        const countRes = await ctx.db
          .select({ contactCount: count() })
          .from(contacts)
          .where(
            and(
              eq(contacts.organizationId, input.id),
              isNull(contacts.deletedAt),
            ),
          );
        const contactCount = countRes[0]?.contactCount ?? 0;

        return {
          ...org,
          contacts: orgContacts,
          contactCount,
        };
      }),

    /**
     * Create a new organization.
     */
    create: companyProcedure
      .input(createOrgSchema)
      .mutation(async ({ ctx, input }) => {
        const [newOrg] = await ctx.db
          .insert(organizations)
          .values({
            ...input,
            companyId: ctx.companyId,
          })
          .returning();

        return newOrg!;
      }),

    /**
     * Update an organization.
     */
    update: companyProcedure
      .input(updateOrgSchema)
      .mutation(async ({ ctx, input }) => {
        await verifyOrgCompany(ctx.db, input.id, ctx.companyId);

        const { id, ...rest } = input;

        const [updated] = await ctx.db
          .update(organizations)
          .set({ ...rest, updatedAt: new Date() })
          .where(
            and(
              eq(organizations.id, id),
              eq(organizations.companyId, ctx.companyId),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Organisation nicht gefunden',
          });
        }

        return updated;
      }),

    /**
     * Soft-delete an organization.
     */
    delete: companyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        await verifyOrgCompany(ctx.db, input.id, ctx.companyId);

        await ctx.db
          .update(organizations)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(organizations.id, input.id),
              eq(organizations.companyId, ctx.companyId),
            ),
          );

        return { success: true };
      }),
  }),

  contacts: createTRPCRouter({
    /**
     * List contacts for an organization.
     */
    list: companyProcedure
      .input(contactsListSchema)
      .query(async ({ ctx, input }) => {
        // Verify organization belongs to company
        await verifyOrgCompany(ctx.db, input.organizationId, ctx.companyId);

        const contactList = await ctx.db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            email: contacts.email,
            phone: contacts.phone,
            mobile: contacts.mobile,
            position: contacts.position,
            department: contacts.department,
            isPrimary: contacts.isPrimary,
            isActive: contacts.isActive,
          })
          .from(contacts)
          .where(
            and(
              eq(contacts.organizationId, input.organizationId),
              eq(contacts.companyId, ctx.companyId),
              isNull(contacts.deletedAt),
            ),
          )
          .orderBy(desc(contacts.isPrimary), asc(contacts.lastName));

        return contactList;
      }),

    /**
     * Create a new contact.
     */
    create: companyProcedure
      .input(createContactSchema)
      .mutation(async ({ ctx, input }) => {
        // If organizationId provided, verify it belongs to company
        if (input.organizationId) {
          await verifyOrgCompany(ctx.db, input.organizationId, ctx.companyId);
        }

        // If isPrimary, unset other primary contacts for the org
        if (input.isPrimary && input.organizationId) {
          await ctx.db
            .update(contacts)
            .set({ isPrimary: false, updatedAt: new Date() })
            .where(
              and(
                eq(contacts.organizationId, input.organizationId),
                eq(contacts.isPrimary, true),
              ),
            );
        }

        const [newContact] = await ctx.db
          .insert(contacts)
          .values({
            ...input,
            companyId: ctx.companyId,
          })
          .returning();

        return newContact!;
      }),

    /**
     * Update a contact.
     */
    update: companyProcedure
      .input(updateContactSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify contact belongs to company
        const [existing] = await ctx.db
          .select({ id: contacts.id, organizationId: contacts.organizationId })
          .from(contacts)
          .where(
            and(
              eq(contacts.id, input.id),
              eq(contacts.companyId, ctx.companyId),
              isNull(contacts.deletedAt),
            ),
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Kontakt nicht gefunden',
          });
        }

        // If isPrimary changed to true, unset others
        if (input.isPrimary && existing.organizationId) {
          await ctx.db
            .update(contacts)
            .set({ isPrimary: false, updatedAt: new Date() })
            .where(
              and(
                eq(contacts.organizationId, existing.organizationId),
                eq(contacts.isPrimary, true),
                sql`${contacts.id} != ${input.id}`,
              ),
            );
        }

        const { id, ...rest } = input;

        const [updated] = await ctx.db
          .update(contacts)
          .set({ ...rest, updatedAt: new Date() })
          .where(eq(contacts.id, id))
          .returning();

        return updated!;
      }),

    /**
     * Soft-delete a contact.
     */
    delete: companyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify contact belongs to company
        const [existing] = await ctx.db
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              eq(contacts.id, input.id),
              eq(contacts.companyId, ctx.companyId),
              isNull(contacts.deletedAt),
            ),
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Kontakt nicht gefunden',
          });
        }

        await ctx.db
          .update(contacts)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(contacts.id, input.id));

        return { success: true };
      }),
  }),

  activities: createTRPCRouter({
    /**
     * List CRM activities with filtering.
     */
    list: companyProcedure
      .input(activitiesListSchema)
      .query(async ({ ctx, input }) => {
        const conditions: any[] = [
          eq(crmActivities.companyId, ctx.companyId),
        ];

        if (input.organizationId) conditions.push(eq(crmActivities.organizationId, input.organizationId));
        if (input.contactId) conditions.push(eq(crmActivities.contactId, input.contactId));
        if (input.activityType) conditions.push(eq(crmActivities.activityType, input.activityType));

        const whereClause = and(...conditions);

        const actCountResult = await ctx.db
          .select({ total: count() })
          .from(crmActivities)
          .where(whereClause);
        const total = actCountResult[0]?.total ?? 0;

        const items = await ctx.db
          .select({
            id: crmActivities.id,
            activityType: crmActivities.activityType,
            subject: crmActivities.subject,
            description: crmActivities.description,
            scheduledAt: crmActivities.scheduledAt,
            completedAt: crmActivities.completedAt,
            createdAt: crmActivities.createdAt,
            userId: crmActivities.userId,
            organizationId: crmActivities.organizationId,
            contactId: crmActivities.contactId,
          })
          .from(crmActivities)
          .where(whereClause)
          .orderBy(desc(crmActivities.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        // Batch fetch user, org, contact names
        const userIdSet = [...new Set(items.map(i => i.userId))];
        const orgIdSet = [...new Set(items.map(i => i.organizationId).filter((id): id is number => id !== null))];
        const contactIdSet = [...new Set(items.map(i => i.contactId).filter((id): id is number => id !== null))];

        let userMap: Record<number, string> = {};
        if (userIdSet.length > 0) {
          const userRecords = await ctx.db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(sql`${users.id} IN (${sql.join(userIdSet.map(id => sql`${id}`), sql`, `)})`);
          for (const u of userRecords) {
            userMap[u.id] = `${u.firstName} ${u.lastName}`;
          }
        }

        let orgMap: Record<number, string> = {};
        if (orgIdSet.length > 0) {
          const orgRecords = await ctx.db
            .select({ id: organizations.id, name: organizations.name })
            .from(organizations)
            .where(sql`${organizations.id} IN (${sql.join(orgIdSet.map(id => sql`${id}`), sql`, `)})`);
          for (const o of orgRecords) {
            orgMap[o.id] = o.name;
          }
        }

        let contactMap: Record<number, string> = {};
        if (contactIdSet.length > 0) {
          const contactRecords = await ctx.db
            .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
            .from(contacts)
            .where(sql`${contacts.id} IN (${sql.join(contactIdSet.map(id => sql`${id}`), sql`, `)})`);
          for (const c of contactRecords) {
            contactMap[c.id] = `${c.firstName} ${c.lastName}`;
          }
        }

        return {
          items: items.map((item) => ({
            id: item.id,
            activityType: item.activityType,
            subject: item.subject,
            description: item.description,
            scheduledAt: item.scheduledAt,
            completedAt: item.completedAt,
            userName: userMap[item.userId] ?? 'Unbekannt',
            organizationName: item.organizationId ? (orgMap[item.organizationId] ?? null) : null,
            contactName: item.contactId ? (contactMap[item.contactId] ?? null) : null,
            createdAt: item.createdAt,
          })),
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Log a new CRM activity.
     */
    create: companyProcedure
      .input(createActivitySchema)
      .mutation(async ({ ctx, input }) => {
        // If organizationId provided, verify it belongs to company
        if (input.organizationId) {
          await verifyOrgCompany(ctx.db, input.organizationId, ctx.companyId);
        }

        const [newActivity] = await ctx.db
          .insert(crmActivities)
          .values({
            ...input,
            companyId: ctx.companyId,
            userId: ctx.session.user.id,
          })
          .returning();

        // Update organization.lastContactAt
        if (input.organizationId) {
          await ctx.db
            .update(organizations)
            .set({ lastContactAt: new Date(), updatedAt: new Date() })
            .where(eq(organizations.id, input.organizationId));
        }

        return newActivity!;
      }),
  }),
});
