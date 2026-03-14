/**
 * VambiantOS2 Domain Logic
 *
 * Pure business logic with no framework dependencies.
 * This package contains calculations, rules, and domain models for:
 *
 * - HOAI fee calculations (Leistungsphasen 1-9)
 * - DIN 276 cost categorization
 * - BKI cost reference data
 */

// HOAI - Fee calculation for architects and engineers
export * from './hoai/types';
export * from './hoai/interpolation';
export * from './hoai/fee-tables';

// DIN 276 - Construction cost groups
export * from './din276/cost-groups';

// BKI - Construction cost benchmarks
export * from './bki/types';
