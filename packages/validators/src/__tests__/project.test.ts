import { describe, it, expect } from 'vitest';
import { createProjectSchema, projectFilterSchema } from '../project';

describe('Project Validators', () => {
  // =========================================================================
  // createProjectSchema
  // =========================================================================
  describe('createProjectSchema', () => {
    it('accepts a valid project with only required fields', () => {
      const result = createProjectSchema.safeParse({
        name: 'Neubau Schule Berlin',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Neubau Schule Berlin');
        expect(result.data.status).toBe('draft'); // default
        expect(result.data.currency).toBe('EUR'); // default
      }
    });

    it('accepts a fully populated project', () => {
      const result = createProjectSchema.safeParse({
        name: 'Sanierung Rathaus',
        code: 'SR-2024-001',
        description: 'Sanierung des historischen Rathauses',
        clientId: 1,
        projectManagerId: 2,
        projectType: 'renovation',
        status: 'active',
        hoaiZone: 3,
        useBim: true,
        bimStandard: 'IFC4',
        timeTrackingEnabled: true,
        address: {
          street: 'Marktplatz',
          streetNumber: '1',
          zip: '10115',
          city: 'Berlin',
        },
        buildingType: 'public',
        startDate: '2024-01-01',
        endDate: '2025-12-31',
        budgetNet: 2_500_000,
        estimatedHours: 5000,
        vatRate: 19,
        currency: 'EUR',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing name', () => {
      const result = createProjectSchema.safeParse({
        description: 'No name provided',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = createProjectSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 255 characters', () => {
      const result = createProjectSchema.safeParse({
        name: 'A'.repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it('rejects HOAI zone outside 1-5 range', () => {
      const result = createProjectSchema.safeParse({
        name: 'Test',
        hoaiZone: 0,
      });
      expect(result.success).toBe(false);

      const result2 = createProjectSchema.safeParse({
        name: 'Test',
        hoaiZone: 6,
      });
      expect(result2.success).toBe(false);
    });

    it('rejects negative budget', () => {
      const result = createProjectSchema.safeParse({
        name: 'Test',
        budgetNet: -100,
      });
      expect(result.success).toBe(false);
    });

    it('rejects startDate after endDate', () => {
      const result = createProjectSchema.safeParse({
        name: 'Test',
        startDate: '2025-12-31',
        endDate: '2024-01-01',
      });
      expect(result.success).toBe(false);
    });

    it('accepts startDate equal to endDate', () => {
      const result = createProjectSchema.safeParse({
        name: 'Test',
        startDate: '2025-06-15',
        endDate: '2025-06-15',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid project statuses', () => {
      const statuses = ['draft', 'active', 'on_hold', 'completed', 'archived', 'cancelled'];
      for (const status of statuses) {
        const result = createProjectSchema.safeParse({ name: 'Test', status });
        expect(result.success, `Status '${status}' should be valid`).toBe(true);
      }
    });

    it('rejects invalid project status', () => {
      const result = createProjectSchema.safeParse({
        name: 'Test',
        status: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // projectFilterSchema
  // =========================================================================
  describe('projectFilterSchema', () => {
    it('provides default pagination values when not specified', () => {
      const result = projectFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.sortOrder).toBe('asc');
      }
    });

    it('accepts custom page and pageSize', () => {
      const result = projectFilterSchema.safeParse({
        page: 3,
        pageSize: 50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(50);
      }
    });

    it('rejects page less than 1', () => {
      const result = projectFilterSchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects pageSize greater than 100', () => {
      const result = projectFilterSchema.safeParse({
        pageSize: 101,
      });
      expect(result.success).toBe(false);
    });

    it('accepts filter by status', () => {
      const result = projectFilterSchema.safeParse({
        status: 'active',
      });
      expect(result.success).toBe(true);
    });

    it('accepts filter by search term', () => {
      const result = projectFilterSchema.safeParse({
        search: 'Rathaus',
      });
      expect(result.success).toBe(true);
    });

    it('rejects search term exceeding 200 characters', () => {
      const result = projectFilterSchema.safeParse({
        search: 'A'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('accepts combined filters', () => {
      const result = projectFilterSchema.safeParse({
        status: 'active',
        projectType: 'residential',
        search: 'Neubau',
        clientId: 5,
        page: 2,
        pageSize: 10,
        sortBy: 'name',
        sortOrder: 'desc',
      });
      expect(result.success).toBe(true);
    });
  });
});
