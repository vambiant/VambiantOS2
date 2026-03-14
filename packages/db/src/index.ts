import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/**
 * Connection pool for query operations.
 * Uses postgres.js driver with sensible defaults for production.
 */
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Drizzle ORM database instance with all schemas loaded.
 */
export const db = drizzle(client, { schema });

export type Database = typeof db;

export { schema };

// Re-export all schema tables for convenient imports like:
// import { users, projects } from '@vambiant/db'
export * from './schema/index';

// Re-export commonly used drizzle-orm operators
export { eq, ne, gt, gte, lt, lte, and, or, not, inArray, notInArray, isNull, isNotNull, sql, desc, asc, count, sum, avg } from 'drizzle-orm';
