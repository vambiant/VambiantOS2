import { describe, it, expect } from 'vitest';
import {
  calculateHoaiFee,
  calculateMidpointFee,
  getPhasePercentages,
  getFeeTable,
  getValidPhases,
} from '../fee-tables';
import type { HoaiFeeParams, HoaiServiceType } from '../types';

describe('HOAI Fee Calculation', () => {
  // -------------------------------------------------------------------------
  // 1. Basic fee calculation for Gebaeude
  // -------------------------------------------------------------------------
  it('calculates fees for Gebaeude Zone III, 1,000,000 EUR, all phases LP1-9', () => {
    const params: HoaiFeeParams = {
      serviceType: 'gebaeude',
      zone: 3,
      eligibleCosts: 1_000_000,
      phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    };

    const result = calculateHoaiFee(params);

    // For 1,000,000 EUR, Zone III: min=91,710 max=114,106 (from fee table)
    expect(result.feeMin).toBe(91_710);
    expect(result.feeMax).toBe(114_106);

    // All phases selected = 100%
    expect(result.phasePercentageTotal).toBe(100);
    expect(result.totalFeeMin).toBe(91_710);
    expect(result.totalFeeMax).toBe(114_106);

    // No conversion/coordination/nebenkosten
    expect(result.adjustedFeeMin).toBe(91_710);
    expect(result.adjustedFeeMax).toBe(114_106);
    expect(result.totalNetMin).toBe(91_710);
    expect(result.totalNetMax).toBe(114_106);

    // Verify the result is in a reasonable range for a 1M EUR project
    expect(result.totalNetMin).toBeGreaterThan(80_000);
    expect(result.totalNetMax).toBeLessThan(150_000);
  });

  // -------------------------------------------------------------------------
  // 2. Single phase calculation
  // -------------------------------------------------------------------------
  it('calculates fee for single phase LP3 (15%) in Zone II, 500,000 EUR', () => {
    const params: HoaiFeeParams = {
      serviceType: 'gebaeude',
      zone: 2,
      eligibleCosts: 500_000,
      phases: [3],
    };

    const result = calculateHoaiFee(params);

    // Phase 3 = 15% for Gebaeude
    expect(result.phasePercentageTotal).toBe(15);
    expect(result.selectedPhases).toEqual([3]);
    expect(result.feeByPhase).toHaveLength(1);
    expect(result.feeByPhase[0]?.percentage).toBe(15);

    // totalFeeMin should be 15% of feeMin
    expect(result.totalFeeMin).toBeCloseTo(result.feeMin * 0.15, 2);
    expect(result.totalFeeMax).toBeCloseTo(result.feeMax * 0.15, 2);
  });

  // -------------------------------------------------------------------------
  // 3. Edge case - minimum costs
  // -------------------------------------------------------------------------
  it('handles minimum eligible costs (25,000 EUR, Zone I)', () => {
    const params: HoaiFeeParams = {
      serviceType: 'gebaeude',
      zone: 1,
      eligibleCosts: 25_000,
      phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    };

    const result = calculateHoaiFee(params);

    // Should use the first table entry directly
    expect(result.feeMin).toBe(3_843);
    expect(result.feeMax).toBe(4_590);
    expect(result.totalNetMin).toBeGreaterThan(0);
    expect(result.totalNetMax).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 4. Edge case - maximum costs
  // -------------------------------------------------------------------------
  it('handles maximum eligible costs (25,000,000 EUR, Zone V)', () => {
    const params: HoaiFeeParams = {
      serviceType: 'gebaeude',
      zone: 5,
      eligibleCosts: 25_000_000,
      phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    };

    const result = calculateHoaiFee(params);

    // Should use the last table entry directly
    expect(result.feeMin).toBe(1_585_582);
    expect(result.feeMax).toBe(1_852_978);
    expect(result.totalNetMin).toBeGreaterThan(0);
    expect(result.totalNetMax).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 5. Conversion factor (Umbauzuschlag)
  // -------------------------------------------------------------------------
  it('applies conversion factor of 1.2 correctly', () => {
    const baseParams: HoaiFeeParams = {
      serviceType: 'gebaeude',
      zone: 3,
      eligibleCosts: 1_000_000,
      phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    };

    const withFactor: HoaiFeeParams = {
      ...baseParams,
      conversionFactor: 1.2,
    };

    const baseResult = calculateHoaiFee(baseParams);
    const factorResult = calculateHoaiFee(withFactor);

    // Adjusted fee should be 20% higher than base
    expect(factorResult.adjustedFeeMin).toBeCloseTo(baseResult.totalFeeMin * 1.2, 2);
    expect(factorResult.adjustedFeeMax).toBeCloseTo(baseResult.totalFeeMax * 1.2, 2);
    expect(factorResult.conversionFactor).toBe(1.2);
  });

  // -------------------------------------------------------------------------
  // 6. Nebenkosten
  // -------------------------------------------------------------------------
  it('calculates nebenkosten at 5% correctly', () => {
    const params: HoaiFeeParams = {
      serviceType: 'gebaeude',
      zone: 3,
      eligibleCosts: 1_000_000,
      phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      nebenkostenPercent: 5,
    };

    const result = calculateHoaiFee(params);

    expect(result.nebenkostenPercent).toBe(5);

    // Nebenkosten should be 5% of the adjusted fee
    expect(result.nebenkostenAmountMin).toBeCloseTo(result.adjustedFeeMin * 0.05, 2);
    expect(result.nebenkostenAmountMax).toBeCloseTo(result.adjustedFeeMax * 0.05, 2);

    // Total net should be adjusted fee + nebenkosten
    expect(result.totalNetMin).toBeCloseTo(result.adjustedFeeMin + result.nebenkostenAmountMin, 2);
    expect(result.totalNetMax).toBeCloseTo(result.adjustedFeeMax + result.nebenkostenAmountMax, 2);

    // Total should be 105% of the base fee
    expect(result.totalNetMin).toBeCloseTo(result.adjustedFeeMin * 1.05, 2);
  });

  // -------------------------------------------------------------------------
  // 7. Phase percentages sum to 100%
  // -------------------------------------------------------------------------
  it('verifies phase percentages sum to 100% for each service type', () => {
    const serviceTypes: HoaiServiceType[] = [
      'gebaeude',
      'innenraeume',
      'freianlagen',
      'ingenieurbauwerke',
      'verkehrsanlagen',
      'tragwerksplanung',
      'technische_ausruestung',
    ];

    for (const serviceType of serviceTypes) {
      const phases = getPhasePercentages(serviceType);
      const sum = phases.reduce((acc, p) => acc + p.percentage, 0);
      expect(sum, `Phase percentages for ${serviceType} should sum to 100`).toBe(100);
    }
  });

  // -------------------------------------------------------------------------
  // 8. Different service types
  // -------------------------------------------------------------------------
  describe('different service types', () => {
    it('calculates Tragwerksplanung (LP1-6 only)', () => {
      const params: HoaiFeeParams = {
        serviceType: 'tragwerksplanung',
        zone: 3,
        eligibleCosts: 1_000_000,
        phases: [1, 2, 3, 4, 5, 6],
      };

      const result = calculateHoaiFee(params);

      // Tragwerksplanung only has LP1-6
      expect(result.selectedPhases).toEqual([1, 2, 3, 4, 5, 6]);
      expect(result.phasePercentageTotal).toBe(100);
      expect(result.totalNetMin).toBeGreaterThan(0);
    });

    it('throws for invalid phase in Tragwerksplanung (LP7)', () => {
      const params: HoaiFeeParams = {
        serviceType: 'tragwerksplanung',
        zone: 3,
        eligibleCosts: 1_000_000,
        phases: [7],
      };

      expect(() => calculateHoaiFee(params)).toThrow(/Phase 7 is not available/);
    });

    it('calculates Technische Ausruestung (LP1-9)', () => {
      const params: HoaiFeeParams = {
        serviceType: 'technische_ausruestung',
        zone: 3,
        eligibleCosts: 1_000_000,
        phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      };

      const result = calculateHoaiFee(params);

      expect(result.phasePercentageTotal).toBe(100);
      expect(result.totalNetMin).toBeGreaterThan(0);
    });

    it('calculates Freianlagen', () => {
      const params: HoaiFeeParams = {
        serviceType: 'freianlagen',
        zone: 3,
        eligibleCosts: 500_000,
        phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      };

      const result = calculateHoaiFee(params);

      expect(result.phasePercentageTotal).toBe(100);
      expect(result.totalNetMin).toBeGreaterThan(0);
    });

    it('calculates Ingenieurbauwerke', () => {
      const params: HoaiFeeParams = {
        serviceType: 'ingenieurbauwerke',
        zone: 4,
        eligibleCosts: 2_000_000,
        phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      };

      const result = calculateHoaiFee(params);
      expect(result.totalNetMin).toBeGreaterThan(0);
    });

    it('calculates Verkehrsanlagen', () => {
      const params: HoaiFeeParams = {
        serviceType: 'verkehrsanlagen',
        zone: 2,
        eligibleCosts: 5_000_000,
        phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      };

      const result = calculateHoaiFee(params);
      expect(result.totalNetMin).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Fee ordering: feeMin < feeMax
  // -------------------------------------------------------------------------
  it('ensures feeMin is always less than or equal to feeMax', () => {
    const serviceTypes: HoaiServiceType[] = [
      'gebaeude',
      'freianlagen',
      'ingenieurbauwerke',
      'verkehrsanlagen',
      'tragwerksplanung',
      'technische_ausruestung',
    ];
    const zones = [1, 2, 3, 4, 5] as const;
    const costValues = [50_000, 200_000, 1_000_000, 5_000_000];

    for (const serviceType of serviceTypes) {
      const validPhases = getValidPhases(serviceType);
      for (const zone of zones) {
        for (const costs of costValues) {
          const table = getFeeTable(serviceType);
          // Only test costs within table range
          if (costs < table[0]!.costs || costs > table[table.length - 1]!.costs) continue;

          const result = calculateHoaiFee({
            serviceType,
            zone,
            eligibleCosts: costs,
            phases: validPhases,
          });

          expect(
            result.feeMin,
            `feeMin should be <= feeMax for ${serviceType} zone ${zone} at ${costs} EUR`,
          ).toBeLessThanOrEqual(result.feeMax);
          expect(result.totalNetMin).toBeLessThanOrEqual(result.totalNetMax);
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // 10. Monotonic costs: higher eligible costs produce higher fees
  // -------------------------------------------------------------------------
  it('produces higher fees for higher eligible costs (monotonicity)', () => {
    const costSeries = [50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000];

    let prevResult: ReturnType<typeof calculateHoaiFee> | null = null;
    for (const costs of costSeries) {
      const result = calculateHoaiFee({
        serviceType: 'gebaeude',
        zone: 3,
        eligibleCosts: costs,
        phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      });

      if (prevResult) {
        expect(
          result.feeMin,
          `feeMin at ${costs} should be > feeMin at lower cost`,
        ).toBeGreaterThan(prevResult.feeMin);
        expect(
          result.feeMax,
          `feeMax at ${costs} should be > feeMax at lower cost`,
        ).toBeGreaterThan(prevResult.feeMax);
      }
      prevResult = result;
    }
  });

  // -------------------------------------------------------------------------
  // Validation error tests
  // -------------------------------------------------------------------------
  describe('validation', () => {
    it('throws for invalid zone', () => {
      expect(() =>
        calculateHoaiFee({
          serviceType: 'gebaeude',
          zone: 0 as any,
          eligibleCosts: 100_000,
          phases: [1],
        }),
      ).toThrow(/Invalid Honorarzone/);

      expect(() =>
        calculateHoaiFee({
          serviceType: 'gebaeude',
          zone: 6 as any,
          eligibleCosts: 100_000,
          phases: [1],
        }),
      ).toThrow(/Invalid Honorarzone/);
    });

    it('throws for negative eligible costs', () => {
      expect(() =>
        calculateHoaiFee({
          serviceType: 'gebaeude',
          zone: 3,
          eligibleCosts: -1,
          phases: [1],
        }),
      ).toThrow(/Invalid eligible costs/);
    });

    it('throws for empty phases array', () => {
      expect(() =>
        calculateHoaiFee({
          serviceType: 'gebaeude',
          zone: 3,
          eligibleCosts: 100_000,
          phases: [],
        }),
      ).toThrow(/At least one Leistungsphase/);
    });

    it('throws for conversion factor out of range', () => {
      expect(() =>
        calculateHoaiFee({
          serviceType: 'gebaeude',
          zone: 3,
          eligibleCosts: 100_000,
          phases: [1],
          conversionFactor: 0.5,
        }),
      ).toThrow(/Invalid conversion factor/);

      expect(() =>
        calculateHoaiFee({
          serviceType: 'gebaeude',
          zone: 3,
          eligibleCosts: 100_000,
          phases: [1],
          conversionFactor: 1.5,
        }),
      ).toThrow(/Invalid conversion factor/);
    });
  });

  // -------------------------------------------------------------------------
  // Helper functions
  // -------------------------------------------------------------------------
  describe('helper functions', () => {
    it('calculateMidpointFee returns average of min and max', () => {
      const params: HoaiFeeParams = {
        serviceType: 'gebaeude',
        zone: 3,
        eligibleCosts: 1_000_000,
        phases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      };

      const result = calculateHoaiFee(params);
      const midpoint = calculateMidpointFee(params);

      expect(midpoint).toBeCloseTo((result.totalNetMin + result.totalNetMax) / 2, 2);
    });

    it('getValidPhases returns correct phases for Tragwerksplanung', () => {
      const phases = getValidPhases('tragwerksplanung');
      expect(phases).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('getValidPhases returns 9 phases for Gebaeude', () => {
      const phases = getValidPhases('gebaeude');
      expect(phases).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });
});
