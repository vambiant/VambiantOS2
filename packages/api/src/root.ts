import { createCallerFactory, createTRPCRouter } from './trpc';
import { authRouter } from './routers/auth';
import { companiesRouter } from './routers/companies';
import { projectsRouter } from './routers/projects';
import { tasksRouter } from './routers/tasks';
import { modulesRouter } from './routers/modules';
import { milestonesRouter } from './routers/milestones';
import { crmRouter } from './routers/crm';
import { timeTrackingRouter } from './routers/time-tracking';
import { procurementRouter } from './routers/procurement';
import { financeRouter } from './routers/finance';
import { marketplaceRouter } from './routers/marketplace';
import { referencesRouter } from './routers/references';
import { questionnairesRouter } from './routers/questionnaires';
import { bimRouter } from './routers/bim';
import { tendersRouter } from './routers/tenders';
import { resourcesRouter } from './routers/resources';
import { wikiRouter } from './routers/wiki';
import { reportsRouter } from './routers/reports';
import { communicationRouter } from './routers/communication';

/**
 * The root tRPC router for VambiantOS2.
 *
 * All domain sub-routers are merged here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  companies: companiesRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  modules: modulesRouter,
  milestones: milestonesRouter,
  crm: crmRouter,
  timeTracking: timeTrackingRouter,
  procurement: procurementRouter,
  finance: financeRouter,
  marketplace: marketplaceRouter,
  references: referencesRouter,
  questionnaires: questionnairesRouter,
  bim: bimRouter,
  tenders: tendersRouter,
  resources: resourcesRouter,
  wiki: wikiRouter,
  reports: reportsRouter,
  communication: communicationRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Server-side caller for the tRPC router.
 * Useful for calling procedures from server components or API routes.
 */
export const createCaller = createCallerFactory(appRouter);
