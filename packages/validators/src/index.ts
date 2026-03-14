/**
 * VambiantOS2 Shared Validators
 *
 * Zod schemas shared between client and server.
 * These validators ensure type-safe data validation across the stack.
 */

export { z } from 'zod';

export * from './common';
export * from './auth';
export * from './company';
export * from './project';
export * from './crm';
export * from './tasks';
export * from './procurement';
export * from './time-tracking';
export * from './finance';
