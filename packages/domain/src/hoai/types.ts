/**
 * HOAI 2021 - Types and Interfaces
 *
 * Types for the German fee schedule for architects and engineers
 * (Honorarordnung fuer Architekten und Ingenieure).
 */

/** Service types defined in the HOAI */
export type HoaiServiceType =
  | 'gebaeude' // §35 - Gebaeude und Innenraeume
  | 'innenraeume' // §35 - Innenraeume (same fee table, different phase %)
  | 'freianlagen' // §40 - Freianlagen
  | 'ingenieurbauwerke' // §44 - Ingenieurbauwerke
  | 'verkehrsanlagen' // §48 - Verkehrsanlagen
  | 'tragwerksplanung' // §52 - Tragwerksplanung
  | 'technische_ausruestung'; // §56 - Technische Ausruestung

/** Honorarzone I through V */
export type HoaiZone = 1 | 2 | 3 | 4 | 5;

/** Leistungsphase number 1-9 */
export type HoaiPhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Percentage allocation for a single Leistungsphase */
export interface HoaiPhasePercentage {
  phase: HoaiPhaseNumber;
  name: string;
  percentage: number;
}

/** A single entry in a fee table */
export interface FeeTableEntry {
  /** Anrechenbare Kosten in EUR */
  costs: number;
  /** Fee values per zone: [zoneI_min, zoneI_max, zoneII_min, zoneII_max, ..., zoneV_min, zoneV_max] */
  fees: [
    number, number, // Zone I min/max
    number, number, // Zone II min/max
    number, number, // Zone III min/max
    number, number, // Zone IV min/max
    number, number, // Zone V min/max
  ];
}

/** Result of a phase-by-phase fee calculation */
export interface HoaiPhaseBreakdown {
  phase: number;
  name: string;
  percentage: number;
  feeMin: number;
  feeMax: number;
}

/** Complete result of a HOAI fee calculation */
export interface HoaiFeeResult {
  /** Input parameters echoed back */
  serviceType: HoaiServiceType;
  zone: HoaiZone;
  eligibleCosts: number;

  /** Base fee for full service (100%) at the given zone */
  feeMin: number;
  feeMax: number;

  /** Selected phases and their total percentage */
  selectedPhases: number[];
  phasePercentageTotal: number;

  /** Breakdown per selected Leistungsphase */
  feeByPhase: HoaiPhaseBreakdown[];

  /** Fee for selected phases only (base fee * phase percentage) */
  totalFeeMin: number;
  totalFeeMax: number;

  /** Applied factors */
  conversionFactor: number;
  coordinationFactor: number;

  /** Fee after applying conversion and coordination factors */
  adjustedFeeMin: number;
  adjustedFeeMax: number;

  /** Nebenkosten (ancillary costs) */
  nebenkostenPercent: number;
  nebenkostenAmountMin: number;
  nebenkostenAmountMax: number;

  /** Final totals (adjusted fee + nebenkosten) */
  totalNetMin: number;
  totalNetMax: number;
}

/** Result of a zone classification evaluation */
export interface HoaiZoneClassification {
  zone: HoaiZone;
  points: number;
  criteria: string[];
}

/** Parameters for the main fee calculation function */
export interface HoaiFeeParams {
  serviceType: HoaiServiceType;
  zone: HoaiZone;
  eligibleCosts: number;
  phases: number[];
  conversionFactor?: number;
  nebenkostenPercent?: number;
  coordinationFactor?: number;
}
