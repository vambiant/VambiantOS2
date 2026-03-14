/**
 * HOAI 2021 - Fee Interpolation Logic
 *
 * Implements linear interpolation between fee table entries
 * to determine the exact fee for any given eligible cost amount.
 */

import type { FeeTableEntry, HoaiZone } from './types';

/**
 * Linear interpolation between two data points.
 *
 * @param cost - The cost value to interpolate for
 * @param lowerCost - The lower bound cost from the table
 * @param upperCost - The upper bound cost from the table
 * @param lowerFee - The fee at the lower bound
 * @param upperFee - The fee at the upper bound
 * @returns The interpolated fee value
 */
export function interpolateFee(
  cost: number,
  lowerCost: number,
  upperCost: number,
  lowerFee: number,
  upperFee: number,
): number {
  if (upperCost === lowerCost) {
    return lowerFee;
  }
  const ratio = (cost - lowerCost) / (upperCost - lowerCost);
  return lowerFee + ratio * (upperFee - lowerFee);
}

/**
 * Retrieves the fee column index for a given zone and boundary.
 *
 * Zone I:   indices 0 (min), 1 (max)
 * Zone II:  indices 2 (min), 3 (max)
 * Zone III: indices 4 (min), 5 (max)
 * Zone IV:  indices 6 (min), 7 (max)
 * Zone V:   indices 8 (min), 9 (max)
 */
function getFeeIndex(zone: HoaiZone, boundary: 'min' | 'max'): number {
  const zoneOffset = (zone - 1) * 2;
  return boundary === 'min' ? zoneOffset : zoneOffset + 1;
}

/**
 * Look up the fee for given eligible costs and zone from a fee table.
 *
 * If the cost is below the minimum table entry, the lowest entry is used.
 * If the cost is above the maximum table entry, the highest entry is used.
 * Otherwise, linear interpolation is applied between the two surrounding entries.
 *
 * @param table - The fee table entries sorted by ascending cost
 * @param zone - The Honorarzone (I-V)
 * @param costs - The anrechenbare Kosten (eligible costs) in EUR
 * @param boundary - Whether to look up 'min' or 'max' fee for the zone
 * @returns The interpolated fee in EUR
 */
export function lookupFee(
  table: FeeTableEntry[],
  zone: HoaiZone,
  costs: number,
  boundary: 'min' | 'max',
): number {
  if (table.length === 0) {
    throw new Error('Fee table is empty');
  }

  const feeIdx = getFeeIndex(zone, boundary);

  const firstEntry = table[0];
  const lastEntry = table[table.length - 1];

  if (!firstEntry || !lastEntry) {
    throw new Error('Fee table is empty');
  }

  // Clamp to table bounds
  if (costs <= firstEntry.costs) {
    return firstEntry.fees[feeIdx] ?? 0;
  }

  if (costs >= lastEntry.costs) {
    return lastEntry.fees[feeIdx] ?? 0;
  }

  // Find the two surrounding entries
  for (let i = 0; i < table.length - 1; i++) {
    const lower = table[i];
    const upper = table[i + 1];

    if (lower && upper && costs >= lower.costs && costs <= upper.costs) {
      return interpolateFee(
        costs,
        lower.costs,
        upper.costs,
        lower.fees[feeIdx] ?? 0,
        upper.fees[feeIdx] ?? 0,
      );
    }
  }

  // Fallback (should not reach here with valid sorted table)
  return lastEntry.fees[feeIdx] ?? 0;
}

/**
 * Look up both min and max fees for a given zone and cost.
 */
export function lookupFeeRange(
  table: FeeTableEntry[],
  zone: HoaiZone,
  costs: number,
): { min: number; max: number } {
  return {
    min: lookupFee(table, zone, costs, 'min'),
    max: lookupFee(table, zone, costs, 'max'),
  };
}
