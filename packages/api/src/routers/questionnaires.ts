import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { questionnaires, questionnaireResponses, projectRequirements } from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const listQuestionnairesSchema = z
  .object({
    projectId: z.number().int().positive().optional(),
    status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.string(), // text | number | select | multiselect | boolean | date
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

const sectionSchema = z.object({
  title: z.string().max(255),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  questions: z.array(questionSchema),
});

const createQuestionnaireSchema = z.object({
  projectId: z.number().int().positive().optional(),
  title: z.string().min(1, 'Titel ist erforderlich').max(255),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).default('draft'),
  sections: z.array(sectionSchema),
  reportMappings: z.array(z.record(z.unknown())).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateQuestionnaireSchema = createQuestionnaireSchema.partial().extend({
  id: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

const listResponsesSchema = z
  .object({
    questionnaireId: z.number().int().positive(),
    projectId: z.number().int().positive().optional(),
    status: z.enum(['in_progress', 'completed']).optional(),
  })
  .merge(paginationSchema);

const createResponseSchema = z.object({
  questionnaireId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  answers: z.record(
    z.object({
      value: z.unknown(),
      notes: z.string().optional(),
      attachments: z.array(z.string()).optional(),
    }),
  ),
  runningText: z.string().optional(),
  status: z.enum(['in_progress', 'completed']).default('in_progress'),
});

const listRequirementsSchema = z
  .object({
    projectId: z.number().int().positive(),
    questionnaireId: z.number().int().positive().optional(),
    category: z.string().max(100).optional(),
    status: z.enum(['open', 'approved', 'implemented', 'rejected']).optional(),
  })
  .merge(paginationSchema);

const createRequirementSchema = z.object({
  projectId: z.number().int().positive(),
  questionnaireId: z.number().int().positive().optional(),
  category: z.string().max(100).optional(),
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  status: z.enum(['open', 'approved', 'implemented', 'rejected']).default('open'),
  source: z.enum(['questionnaire', 'manual', 'norm']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateRequirementSchema = createRequirementSchema.partial().extend({
  id: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyQuestionnaireCompany(
  db: any,
  questionnaireId: number,
  companyId: number,
) {
  const [q] = await db
    .select({ id: questionnaires.id })
    .from(questionnaires)
    .where(
      and(
        eq(questionnaires.id, questionnaireId),
        eq(questionnaires.companyId, companyId),
        eq(questionnaires.isActive, true),
      ),
    )
    .limit(1);

  if (!q) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Fragebogen nicht gefunden',
    });
  }
  return q;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const questionnairesRouter = createTRPCRouter({
  /**
   * List questionnaires for the current company with pagination.
   */
  list: companyProcedure
    .input(listQuestionnairesSchema)
    .query(async ({ ctx, input }) => {
      const conditions: any[] = [
        eq(questionnaires.companyId, ctx.companyId),
        eq(questionnaires.isActive, true),
      ];

      if (input.projectId) {
        conditions.push(eq(questionnaires.projectId, input.projectId));
      }
      if (input.status) {
        conditions.push(eq(questionnaires.status, input.status));
      }
      if (input.search) {
        conditions.push(
          sql`(${questionnaires.title} ILIKE ${'%' + input.search + '%'} OR ${questionnaires.description} ILIKE ${'%' + input.search + '%'})`,
        );
      }

      const whereClause = and(...conditions);

      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(questionnaires)
        .where(whereClause);
      const total = countResult[0]?.total ?? 0;

      const items = await ctx.db
        .select({
          id: questionnaires.id,
          companyId: questionnaires.companyId,
          projectId: questionnaires.projectId,
          title: questionnaires.title,
          description: questionnaires.description,
          status: questionnaires.status,
          sections: questionnaires.sections,
          isActive: questionnaires.isActive,
          createdAt: questionnaires.createdAt,
          updatedAt: questionnaires.updatedAt,
        })
        .from(questionnaires)
        .where(whereClause)
        .orderBy(desc(questionnaires.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        items,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * Get a single questionnaire by ID.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [questionnaire] = await ctx.db
        .select()
        .from(questionnaires)
        .where(
          and(
            eq(questionnaires.id, input.id),
            eq(questionnaires.companyId, ctx.companyId),
            eq(questionnaires.isActive, true),
          ),
        )
        .limit(1);

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Fragebogen nicht gefunden',
        });
      }

      // Get response count for this questionnaire
      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, input.id));
      const responseCount = countResult[0]?.total ?? 0;

      return {
        ...questionnaire,
        responseCount,
      };
    }),

  /**
   * Create a new questionnaire.
   */
  create: companyProcedure
    .input(createQuestionnaireSchema)
    .mutation(async ({ ctx, input }) => {
      const [newQuestionnaire] = await ctx.db
        .insert(questionnaires)
        .values({
          companyId: ctx.companyId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          status: input.status,
          sections: input.sections,
          reportMappings: input.reportMappings ?? [],
          metadata: input.metadata,
        })
        .returning();

      if (!newQuestionnaire) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Fragebogen konnte nicht erstellt werden',
        });
      }

      return newQuestionnaire;
    }),

  /**
   * Update an existing questionnaire.
   */
  update: companyProcedure
    .input(updateQuestionnaireSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyQuestionnaireCompany(ctx.db, input.id, ctx.companyId);

      const { id, ...rest } = input;

      const [updated] = await ctx.db
        .update(questionnaires)
        .set({ ...rest, updatedAt: new Date() })
        .where(
          and(
            eq(questionnaires.id, id),
            eq(questionnaires.companyId, ctx.companyId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Fragebogen nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Soft-delete a questionnaire by setting isActive to false.
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyQuestionnaireCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(questionnaires)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(questionnaires.id, input.id),
            eq(questionnaires.companyId, ctx.companyId),
          ),
        );

      return { success: true };
    }),

  responses: createTRPCRouter({
    /**
     * List questionnaire responses with pagination.
     */
    list: companyProcedure
      .input(listResponsesSchema)
      .query(async ({ ctx, input }) => {
        // Verify questionnaire belongs to company
        await verifyQuestionnaireCompany(ctx.db, input.questionnaireId, ctx.companyId);

        const conditions: any[] = [
          eq(questionnaireResponses.questionnaireId, input.questionnaireId),
        ];

        if (input.projectId) {
          conditions.push(eq(questionnaireResponses.projectId, input.projectId));
        }
        if (input.status) {
          conditions.push(eq(questionnaireResponses.status, input.status));
        }

        const whereClause = and(...conditions);

        const countResult = await ctx.db
          .select({ total: sql<number>`count(*)::int` })
          .from(questionnaireResponses)
          .where(whereClause);
        const total = countResult[0]?.total ?? 0;

        const items = await ctx.db
          .select({
            id: questionnaireResponses.id,
            questionnaireId: questionnaireResponses.questionnaireId,
            projectId: questionnaireResponses.projectId,
            respondentId: questionnaireResponses.respondentId,
            status: questionnaireResponses.status,
            answers: questionnaireResponses.answers,
            runningText: questionnaireResponses.runningText,
            completedAt: questionnaireResponses.completedAt,
            createdAt: questionnaireResponses.createdAt,
            updatedAt: questionnaireResponses.updatedAt,
          })
          .from(questionnaireResponses)
          .where(whereClause)
          .orderBy(desc(questionnaireResponses.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return {
          items,
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Create a new questionnaire response.
     */
    create: companyProcedure
      .input(createResponseSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify questionnaire belongs to company
        await verifyQuestionnaireCompany(ctx.db, input.questionnaireId, ctx.companyId);

        const completedAt = input.status === 'completed' ? new Date() : null;

        const [newResponse] = await ctx.db
          .insert(questionnaireResponses)
          .values({
            questionnaireId: input.questionnaireId,
            projectId: input.projectId,
            respondentId: ctx.session.user.id,
            status: input.status,
            answers: input.answers,
            runningText: input.runningText,
            completedAt,
          })
          .returning();

        if (!newResponse) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Antwort konnte nicht erstellt werden',
          });
        }

        return newResponse;
      }),

    /**
     * Get a single questionnaire response by ID.
     */
    getById: companyProcedure
      .input(idSchema)
      .query(async ({ ctx, input }) => {
        const [response] = await ctx.db
          .select()
          .from(questionnaireResponses)
          .where(eq(questionnaireResponses.id, input.id))
          .limit(1);

        if (!response) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Antwort nicht gefunden',
          });
        }

        // Verify the questionnaire belongs to the company
        await verifyQuestionnaireCompany(ctx.db, response.questionnaireId, ctx.companyId);

        return response;
      }),
  }),

  requirements: createTRPCRouter({
    /**
     * List project requirements with pagination and filtering.
     */
    list: companyProcedure
      .input(listRequirementsSchema)
      .query(async ({ ctx, input }) => {
        const conditions: any[] = [
          eq(projectRequirements.projectId, input.projectId),
        ];

        if (input.questionnaireId) {
          conditions.push(eq(projectRequirements.questionnaireId, input.questionnaireId));
        }
        if (input.category) {
          conditions.push(eq(projectRequirements.category, input.category));
        }
        if (input.status) {
          conditions.push(eq(projectRequirements.status, input.status));
        }

        const whereClause = and(...conditions);

        const countResult = await ctx.db
          .select({ total: sql<number>`count(*)::int` })
          .from(projectRequirements)
          .where(whereClause);
        const total = countResult[0]?.total ?? 0;

        const items = await ctx.db
          .select({
            id: projectRequirements.id,
            projectId: projectRequirements.projectId,
            questionnaireId: projectRequirements.questionnaireId,
            category: projectRequirements.category,
            title: projectRequirements.title,
            description: projectRequirements.description,
            priority: projectRequirements.priority,
            status: projectRequirements.status,
            source: projectRequirements.source,
            createdAt: projectRequirements.createdAt,
            updatedAt: projectRequirements.updatedAt,
          })
          .from(projectRequirements)
          .where(whereClause)
          .orderBy(desc(projectRequirements.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return {
          items,
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Create a new project requirement.
     */
    create: companyProcedure
      .input(createRequirementSchema)
      .mutation(async ({ ctx, input }) => {
        // If questionnaireId provided, verify it belongs to company
        if (input.questionnaireId) {
          await verifyQuestionnaireCompany(ctx.db, input.questionnaireId, ctx.companyId);
        }

        const [newRequirement] = await ctx.db
          .insert(projectRequirements)
          .values({
            projectId: input.projectId,
            questionnaireId: input.questionnaireId,
            category: input.category,
            title: input.title,
            description: input.description,
            priority: input.priority,
            status: input.status,
            source: input.source,
            metadata: input.metadata,
          })
          .returning();

        if (!newRequirement) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Anforderung konnte nicht erstellt werden',
          });
        }

        return newRequirement;
      }),

    /**
     * Update an existing project requirement.
     */
    update: companyProcedure
      .input(updateRequirementSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify requirement exists
        const [existing] = await ctx.db
          .select({ id: projectRequirements.id })
          .from(projectRequirements)
          .where(eq(projectRequirements.id, input.id))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Anforderung nicht gefunden',
          });
        }

        const { id, ...rest } = input;

        const [updated] = await ctx.db
          .update(projectRequirements)
          .set({ ...rest, updatedAt: new Date() })
          .where(eq(projectRequirements.id, id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Anforderung nicht gefunden',
          });
        }

        return updated;
      }),
  }),
});
