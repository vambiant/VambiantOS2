import { describe, it, expect } from 'vitest';
import { interpolateFee, lookupFee, lookupFeeRange } from '../interpolation';
import { getFeeTable } from '../fee-tables';
import type { FeeTableEntry } from '../types';

describe('HOAI Fee Interpolation', () => {
  const gebaeudeTable = getFeeTable('gebaeude');

  // -------------------------------------------------------------------------
  // 1. Exact table value
  // -------------------------------------------------------------------------
  it('returns exact fee for a cost that matches a table entry', () => {
    // 1,000,000 EUR is an exact entry in the Gebaeude table
    // Zone III min index=4, Zone III max index=5
    const feeMin = lookupFee(gebaeudeTable, 3, 1_000_000, 'min');
    const feeMax = lookupFee(gebaeudeTable, 3, 1_000_000, 'max');

    expect(feeMin).toBe(91_710);
    expect(feeMax).toBe(114_106);
  });

  it('returns exact fee for Zone I at 25,000 EUR', () => {
    const feeMin = lookupFee(gebaeudeTable, 1, 25_000, 'min');
    const feeMax = lookupFee(gebaeudeTable, 1, 25_000, 'max');

    expect(feeMin).toBe(3_843);
    expect(feeMax).toBe(4_590);
  });

  it('returns exact fee for Zone V at 25,000,000 EUR', () => {
    const feeMin = lookupFee(gebaeudeTable, 5, 25_000_000, 'min');
    const feeMax = lookupFee(gebaeudeTable, 5, 25_000_000, 'max');

    expect(feeMin).toBe(1_585_582);
    expect(feeMax).toBe(1_852_978);
  });

  // -------------------------------------------------------------------------
  // 2. Midpoint interpolation
  // -------------------------------------------------------------------------
  it('interpolates fee at the midpoint between two table entries', () => {
    // Between 500,000 and 750,000: midpoint = 625,000
    // Zone III min: 500,000 -> 54,439 and 750,000 -> 73,770
    // Expected midpoint: (54,439 + 73,770) / 2 = 64,104.5
    const fee = lookupFee(gebaeudeTable, 3, 625_000, 'min');
    const expectedMid = (54_439 + 73_770) / 2;

    expect(fee).toBeCloseTo(expectedMid, 0);
  });

  // -------------------------------------------------------------------------
  // 3. Below minimum - should clamp
  // -------------------------------------------------------------------------
  it('clamps to minimum table entry when cost is below the table range', () => {
    const fee = lookupFee(gebaeudeTable, 3, 10_000, 'min');
    // Should return the fee for the lowest entry (25,000 EUR)
    const lowestFee = lookupFee(gebaeudeTable, 3, 25_000, 'min');
    expect(fee).toBe(lowestFee);
  });

  it('clamps to minimum for cost of 1 EUR', () => {
    const fee = lookupFee(gebaeudeTable, 1, 1, 'min');
    expect(fee).toBe(3_843); // Zone I min at 25,000
  });

  // -------------------------------------------------------------------------
  // 4. Above maximum - should clamp
  // -------------------------------------------------------------------------
  it('clamps to maximum table entry when cost exceeds the table range', () => {
    const fee = lookupFee(gebaeudeTable, 3, 50_000_000, 'min');
    // Should return the fee for the highest entry (25,000,000 EUR)
    const highestFee = lookupFee(gebaeudeTable, 3, 25_000_000, 'min');
    expect(fee).toBe(highestFee);
  });

  it('clamps to maximum for cost of 100,000,000 EUR', () => {
    const fee = lookupFee(gebaeudeTable, 5, 100_000_000, 'max');
    expect(fee).toBe(1_852_978); // Zone V max at 25,000,000
  });

  // -------------------------------------------------------------------------
  // 5. Quarter-point interpolation
  // -------------------------------------------------------------------------
  it('interpolates correctly at 25% between two entries', () => {
    // Between 100,000 and 150,000: 25% = 112,500
    // Zone III min: 100,000 -> 15,982 and 150,000 -> 21,734
    // Expected: 15,982 + 0.25 * (21,734 - 15,982) = 15,982 + 1,438 = 17,420
    const fee = lookupFee(gebaeudeTable, 3, 112_500, 'min');
    const expected = 15_982 + 0.25 * (21_734 - 15_982);

    expect(fee).toBeCloseTo(expected, 0);
  });

  // -------------------------------------------------------------------------
  // interpolateFee unit tests
  // -------------------------------------------------------------------------
  describe('interpolateFee', () => {
    it('returns lowerFee when costs equal lowerCost', () => {
      const result = interpolateFee(100, 100, 200, 1000, 2000);
      expect(result).toBe(1000);
    });

    it('returns upperFee when costs equal upperCost', () => {
      const result = interpolateFee(200, 100, 200, 1000, 2000);
      expect(result).toBe(2000);
    });

    it('returns midpoint when costs are exactly between bounds', () => {
      const result = interpolateFee(150, 100, 200, 1000, 2000);
      expect(result).toBe(1500);
    });

    it('handles equal bounds (returns lowerFee)', () => {
      const result = interpolateFee(100, 100, 100, 1000, 2000);
      expect(result).toBe(1000);
    });

    it('handles 75% ratio correctly', () => {
      const result = interpolateFee(175, 100, 200, 1000, 2000);
      expect(result).toBe(1750);
    });
  });

  // -------------------------------------------------------------------------
  // lookupFeeRange tests
  // -------------------------------------------------------------------------
  describe('lookupFeeRange', () => {
    it('returns both min and max for a given zone and cost', () => {
      const range = lookupFeeRange(gebaeudeTable, 3, 1_000_000);
      expect(range.min).toBe(91_710);
      expect(range.max).toBe(114_106);
      expect(range.min).toBeLessThanOrEqual(range.max);
    });
  });

  // -------------------------------------------------------------------------
  // Edge case: empty table
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('throws for an empty fee table', () => {
      const emptyTable: FeeTableEntry[] = [];
      expect(() => lookupFee(emptyTable, 3, 100_000, 'min')).toThrow(/Fee table is empty/);
    });
  });

  // -------------------------------------------------------------------------
  // All zones return consistent results
  // -------------------------------------------------------------------------
  describe('zone consistency', () => {
    it('higher zones produce higher or equal fees', () => {
      const cost = 1_000_000;
      const zones = [1, 2, 3, 4, 5] as const;

      let prevMin = 0;
      let prevMax = 0;

      for (const zone of zones) {
        const min = lookupFee(gebaeudeTable, zone, cost, 'min');
        const max = lookupFee(gebaeudeTable, zone, cost, 'max');

        expect(min).toBeGreaterThanOrEqual(prevMin);
        expect(max).toBeGreaterThanOrEqual(prevMax);

        prevMin = min;
        prevMax = max;
      }
    });
  });
});
