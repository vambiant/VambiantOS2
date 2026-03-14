import { describe, it, expect } from 'vitest';
import { createTimeEntrySchema } from '../time-tracking';

describe('Time Tracking Validators', () => {
  // =========================================================================
  // createTimeEntrySchema
  // =========================================================================
  describe('createTimeEntrySchema', () => {
    const validEntry = {
      date: '2025-03-10',
      hours: 8,
      projectId: 1,
    };

    it('accepts a valid time entry with required fields', () => {
      const result = createTimeEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hours).toBe(8);
        expect(result.data.projectId).toBe(1);
        expect(result.data.billable).toBe(true); // default
        expect(result.data.status).toBe('draft'); // default
      }
    });

    it('accepts a fully populated time entry', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        moduleId: 2,
        taskId: 3,
        description: 'Entwurfsplanung LP3',
        billable: false,
        workType: 'design',
        status: 'submitted',
      });
      expect(result.success).toBe(true);
    });

    it('rejects hours below 0.25', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        hours: 0.1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const hoursError = result.error.issues.find((i) => i.path.includes('hours'));
        expect(hoursError).toBeDefined();
      }
    });

    it('rejects hours of 0', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        hours: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative hours', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        hours: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects hours above 24', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        hours: 25,
      });
      expect(result.success).toBe(false);
    });

    it('rejects hours of exactly 24.01', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        hours: 24.01,
      });
      expect(result.success).toBe(false);
    });

    it('accepts exactly 0.25 hours (minimum)', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        hours: 0.25,
      });
      expect(result.success).toBe(true);
    });

    it('accepts exactly 24 hours (maximum)', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        hours: 24,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing date', () => {
      const { date, ...rest } = validEntry;
      const result = createTimeEntrySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing projectId', () => {
      const { projectId, ...rest } = validEntry;
      const result = createTimeEntrySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects negative projectId', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        projectId: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero projectId', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        projectId: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects description exceeding 2000 characters', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        description: 'A'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid status values', () => {
      const statuses = ['draft', 'submitted', 'approved', 'rejected'];
      for (const status of statuses) {
        const result = createTimeEntrySchema.safeParse({
          ...validEntry,
          status,
        });
        expect(result.success, `Status '${status}' should be valid`).toBe(true);
      }
    });

    it('rejects invalid status', () => {
      const result = createTimeEntrySchema.safeParse({
        ...validEntry,
        status: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('coerces date string to Date object', () => {
      const result = createTimeEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBeInstanceOf(Date);
      }
    });
  });
});
