/**
 * BKI - Baukosteninformationszentrum
 *
 * Types for construction cost benchmarks provided by the BKI
 * (Baukosteninformationszentrum Deutscher Architektenkammern).
 *
 * BKI provides reference cost data categorized by building type,
 * region, and cost group (DIN 276). This data is used for:
 * - Cost estimation in early project phases
 * - Plausibility checks of cost calculations
 * - Benchmarking actual costs against reference values
 */

/** Building type categories used by BKI */
export type BkiBuildingCategory =
  | 'wohngebaeude' // Residential buildings
  | 'buerogebaeude' // Office buildings
  | 'schulen' // Schools
  | 'kindergaerten' // Kindergartens
  | 'krankenhaeuser' // Hospitals
  | 'sportstaetten' // Sports facilities
  | 'kulturbauten' // Cultural buildings
  | 'gewerbebauten' // Commercial buildings
  | 'industriebauten' // Industrial buildings
  | 'verkehrsbauten' // Transport buildings
  | 'sakralbauten' // Sacred buildings
  | 'laborgebaeude' // Laboratory buildings
  | 'parkhaeuser'; // Parking structures

/** German federal states for regional cost factors */
export type BkiBundesland =
  | 'baden_wuerttemberg'
  | 'bayern'
  | 'berlin'
  | 'brandenburg'
  | 'bremen'
  | 'hamburg'
  | 'hessen'
  | 'mecklenburg_vorpommern'
  | 'niedersachsen'
  | 'nordrhein_westfalen'
  | 'rheinland_pfalz'
  | 'saarland'
  | 'sachsen'
  | 'sachsen_anhalt'
  | 'schleswig_holstein'
  | 'thueringen';

/** Cost reference unit types */
export type BkiReferenceUnit =
  | 'bgf' // Brutto-Grundflaeche (gross floor area) in m2
  | 'ngf' // Netto-Grundflaeche (net floor area) in m2
  | 'bri' // Brutto-Rauminhalt (gross volume) in m3
  | 'nuf'; // Nutzungsflaeche (usable area) in m2

/** A single BKI cost reference data point */
export interface BkiCostReference {
  /** Unique identifier */
  id: string;
  /** Building category */
  category: BkiBuildingCategory;
  /** Subcategory or specific building type description */
  subcategory: string;
  /** DIN 276 cost group code */
  costGroupCode: string;
  /** Reference unit type */
  referenceUnit: BkiReferenceUnit;
  /** Cost per reference unit in EUR (average) */
  costPerUnit: number;
  /** Minimum cost per reference unit in EUR */
  costPerUnitMin: number;
  /** Maximum cost per reference unit in EUR */
  costPerUnitMax: number;
  /** Standard deviation */
  standardDeviation: number;
  /** Number of reference objects in the sample */
  sampleSize: number;
  /** Base year for the cost data */
  baseYear: number;
  /** Regional factor (1.0 = national average) */
  regionalFactor: number;
  /** Bundesland the data applies to (null = national) */
  bundesland: BkiBundesland | null;
}

/** Regional cost index factors per Bundesland */
export interface BkiRegionalIndex {
  bundesland: BkiBundesland;
  /** Display name */
  name: string;
  /** Cost index relative to national average (1.0 = average) */
  factor: number;
  /** Base year of the index */
  baseYear: number;
}

/** BKI construction cost index for inflation adjustment */
export interface BkiCostIndex {
  /** Year of the index */
  year: number;
  /** Quarter (1-4) */
  quarter: number;
  /** Index value (base year 2015 = 100) */
  index: number;
}

/** Parameters for a BKI cost estimation */
export interface BkiEstimationParams {
  /** Building category */
  category: BkiBuildingCategory;
  /** Subcategory (optional, for more specific lookup) */
  subcategory?: string;
  /** Reference unit type */
  referenceUnit: BkiReferenceUnit;
  /** Amount of the reference unit (e.g. m2 of BGF) */
  referenceAmount: number;
  /** Target Bundesland for regional adjustment */
  bundesland?: BkiBundesland;
  /** Target year for inflation adjustment */
  targetYear?: number;
  /** DIN 276 cost group codes to include (default: all) */
  costGroupCodes?: string[];
}

/** Result of a BKI cost estimation */
export interface BkiEstimationResult {
  /** Input parameters echoed back */
  params: BkiEstimationParams;
  /** Estimated total cost (average) */
  totalCost: number;
  /** Estimated total cost (minimum) */
  totalCostMin: number;
  /** Estimated total cost (maximum) */
  totalCostMax: number;
  /** Cost per reference unit used */
  costPerUnit: number;
  /** Regional factor applied */
  regionalFactor: number;
  /** Inflation adjustment factor applied */
  inflationFactor: number;
  /** Breakdown by DIN 276 cost group */
  costGroupBreakdown: Array<{
    costGroupCode: string;
    costGroupName: string;
    costPerUnit: number;
    totalCost: number;
    percentageOfTotal: number;
  }>;
}

/**
 * BKI building quality levels
 * Used to adjust reference costs based on expected quality standard.
 */
export type BkiQualityLevel =
  | 'einfach' // Simple/basic standard
  | 'mittel' // Medium standard
  | 'gehoben' // Elevated standard
  | 'hoch'; // High/premium standard

/** Quality adjustment factors */
export interface BkiQualityFactor {
  level: BkiQualityLevel;
  name: string;
  factor: number; // Multiplier relative to medium (1.0)
}

/** Standard quality factors */
export const BKI_QUALITY_FACTORS: BkiQualityFactor[] = [
  { level: 'einfach', name: 'Einfacher Standard', factor: 0.8 },
  { level: 'mittel', name: 'Mittlerer Standard', factor: 1.0 },
  { level: 'gehoben', name: 'Gehobener Standard', factor: 1.25 },
  { level: 'hoch', name: 'Hoher Standard', factor: 1.5 },
];

/**
 * BKI energy standard categories
 * Relevant for estimating additional costs for energy efficiency measures.
 */
export type BkiEnergyStandard =
  | 'enev' // EnEV minimum requirement
  | 'kfw55' // KfW Effizienzhaus 55
  | 'kfw40' // KfW Effizienzhaus 40
  | 'kfw40plus' // KfW Effizienzhaus 40 Plus
  | 'passivhaus'; // Passivhaus standard

/** Energy standard cost adjustment */
export interface BkiEnergyFactor {
  standard: BkiEnergyStandard;
  name: string;
  /** Additional cost factor relative to EnEV baseline */
  additionalCostFactor: number;
}

/** Standard energy cost factors (approximate surcharges) */
export const BKI_ENERGY_FACTORS: BkiEnergyFactor[] = [
  { standard: 'enev', name: 'EnEV / GEG Mindestanforderung', additionalCostFactor: 0 },
  { standard: 'kfw55', name: 'KfW Effizienzhaus 55', additionalCostFactor: 0.05 },
  { standard: 'kfw40', name: 'KfW Effizienzhaus 40', additionalCostFactor: 0.10 },
  { standard: 'kfw40plus', name: 'KfW Effizienzhaus 40 Plus', additionalCostFactor: 0.15 },
  { standard: 'passivhaus', name: 'Passivhaus', additionalCostFactor: 0.12 },
];
