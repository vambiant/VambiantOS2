/**
 * DIN 276:2018 - Cost Groups (Kostengruppen)
 *
 * Complete hierarchy of construction cost categories according to
 * DIN 276:2018-12 "Kosten im Bauwesen".
 *
 * Structure:
 * - Level 1: Hundreds (100, 200, ..., 800)
 * - Level 2: Tens (110, 120, ..., 790)
 * - Level 3: Units (111, 112, ..., 799) - included for KG 300 and KG 400
 */

export interface CostGroup {
  /** DIN 276 code, e.g. '300', '340', '345' */
  code: string;
  /** German name of the cost group */
  name: string;
  /** Hierarchy level: 1 = hundred, 2 = ten, 3 = unit */
  level: 1 | 2 | 3;
  /** Parent code, null for level 1 */
  parentCode: string | null;
  /** Child groups (populated by buildCostGroupTree) */
  children?: CostGroup[];
}

// ---------------------------------------------------------------------------
// Complete DIN 276:2018 cost group definitions
// ---------------------------------------------------------------------------

export const DIN276_COST_GROUPS: CostGroup[] = [
  // =========================================================================
  // KG 100 - Grundstueck
  // =========================================================================
  { code: '100', name: 'Grundstueck', level: 1, parentCode: null },
  { code: '110', name: 'Grundstueckswert', level: 2, parentCode: '100' },
  { code: '120', name: 'Grundstuecksnebenkosten', level: 2, parentCode: '100' },
  { code: '130', name: 'Freimachen', level: 2, parentCode: '100' },

  // =========================================================================
  // KG 200 - Vorbereitende Massnahmen
  // =========================================================================
  { code: '200', name: 'Vorbereitende Massnahmen', level: 1, parentCode: null },
  { code: '210', name: 'Herrichten', level: 2, parentCode: '200' },
  { code: '220', name: 'Oeffentliche Erschliessung', level: 2, parentCode: '200' },
  { code: '230', name: 'Nichtoeffentliche Erschliessung', level: 2, parentCode: '200' },
  { code: '240', name: 'Ausgleichsabgaben', level: 2, parentCode: '200' },
  { code: '250', name: 'Uebergangsmassnahmen', level: 2, parentCode: '200' },

  // =========================================================================
  // KG 300 - Bauwerk - Baukonstruktionen
  // =========================================================================
  { code: '300', name: 'Bauwerk - Baukonstruktionen', level: 1, parentCode: null },

  // KG 310 - Baugrube/Erdbau
  { code: '310', name: 'Baugrube/Erdbau', level: 2, parentCode: '300' },
  { code: '311', name: 'Herstellung', level: 3, parentCode: '310' },
  { code: '312', name: 'Umschliessung', level: 3, parentCode: '310' },
  { code: '313', name: 'Wasserhaltung', level: 3, parentCode: '310' },
  { code: '319', name: 'Baugrube/Erdbau, sonstiges', level: 3, parentCode: '310' },

  // KG 320 - Gruendung, Unterbau
  { code: '320', name: 'Gruendung, Unterbau', level: 2, parentCode: '300' },
  { code: '321', name: 'Baugrundverbesserung', level: 3, parentCode: '320' },
  { code: '322', name: 'Flachgruendungen und Bodenplatten', level: 3, parentCode: '320' },
  { code: '323', name: 'Tiefgruendungen', level: 3, parentCode: '320' },
  { code: '324', name: 'Unterboeden und Bodenplatten', level: 3, parentCode: '320' },
  { code: '325', name: 'Bodenbelaege', level: 3, parentCode: '320' },
  { code: '326', name: 'Bauwerksabdichtungen', level: 3, parentCode: '320' },
  { code: '327', name: 'Drainage', level: 3, parentCode: '320' },
  { code: '329', name: 'Gruendung, sonstiges', level: 3, parentCode: '320' },

  // KG 330 - Aussenwaende/Vertikale Baukonstruktionen, aussen
  { code: '330', name: 'Aussenwaende/Vertikale Baukonstruktionen, aussen', level: 2, parentCode: '300' },
  { code: '331', name: 'Tragende Aussenwaende', level: 3, parentCode: '330' },
  { code: '332', name: 'Nichttragende Aussenwaende', level: 3, parentCode: '330' },
  { code: '333', name: 'Aussenstuetzen', level: 3, parentCode: '330' },
  { code: '334', name: 'Aussenwandbekleidungen, aussen', level: 3, parentCode: '330' },
  { code: '335', name: 'Aussenwandbekleidungen, innen', level: 3, parentCode: '330' },
  { code: '336', name: 'Aussenwand-Fenster', level: 3, parentCode: '330' },
  { code: '337', name: 'Aussenwand-Tueren', level: 3, parentCode: '330' },
  { code: '338', name: 'Sonnenschutz', level: 3, parentCode: '330' },
  { code: '339', name: 'Aussenwaende, sonstiges', level: 3, parentCode: '330' },

  // KG 340 - Innenwaende/Vertikale Baukonstruktionen, innen
  { code: '340', name: 'Innenwaende/Vertikale Baukonstruktionen, innen', level: 2, parentCode: '300' },
  { code: '341', name: 'Tragende Innenwaende', level: 3, parentCode: '340' },
  { code: '342', name: 'Nichttragende Innenwaende', level: 3, parentCode: '340' },
  { code: '343', name: 'Innenstuetzen', level: 3, parentCode: '340' },
  { code: '344', name: 'Innenwandbekleidungen', level: 3, parentCode: '340' },
  { code: '345', name: 'Innenwand-Fenster', level: 3, parentCode: '340' },
  { code: '346', name: 'Innenwand-Tueren', level: 3, parentCode: '340' },
  { code: '349', name: 'Innenwaende, sonstiges', level: 3, parentCode: '340' },

  // KG 350 - Decken/Horizontale Baukonstruktionen
  { code: '350', name: 'Decken/Horizontale Baukonstruktionen', level: 2, parentCode: '300' },
  { code: '351', name: 'Deckenkonstruktionen', level: 3, parentCode: '350' },
  { code: '352', name: 'Deckenbelaege', level: 3, parentCode: '350' },
  { code: '353', name: 'Deckenbekleidungen', level: 3, parentCode: '350' },
  { code: '359', name: 'Decken, sonstiges', level: 3, parentCode: '350' },

  // KG 360 - Daecher
  { code: '360', name: 'Daecher', level: 2, parentCode: '300' },
  { code: '361', name: 'Dachkonstruktionen', level: 3, parentCode: '360' },
  { code: '362', name: 'Dachfenster, Dachoefffnungen', level: 3, parentCode: '360' },
  { code: '363', name: 'Dachbelaege', level: 3, parentCode: '360' },
  { code: '364', name: 'Dachbekleidungen', level: 3, parentCode: '360' },
  { code: '369', name: 'Daecher, sonstiges', level: 3, parentCode: '360' },

  // KG 370 - Infrastrukturelle Baukonstruktionen
  { code: '370', name: 'Infrastrukturelle Baukonstruktionen', level: 2, parentCode: '300' },
  { code: '371', name: 'Rinnen und Rinnenheizung', level: 3, parentCode: '370' },
  { code: '372', name: 'Fallrohre und Grundleitungen', level: 3, parentCode: '370' },
  { code: '379', name: 'Infrastrukturelle Baukonstruktionen, sonstiges', level: 3, parentCode: '370' },

  // KG 390 - Sonstige Massnahmen Baukonstruktionen
  { code: '390', name: 'Sonstige Massnahmen Baukonstruktionen', level: 2, parentCode: '300' },
  { code: '391', name: 'Baustelleneinrichtung', level: 3, parentCode: '390' },
  { code: '392', name: 'Gerueste', level: 3, parentCode: '390' },
  { code: '393', name: 'Sicherungsmassnahmen', level: 3, parentCode: '390' },
  { code: '394', name: 'Abbruchmassnahmen', level: 3, parentCode: '390' },
  { code: '395', name: 'Instandsetzungen', level: 3, parentCode: '390' },
  { code: '396', name: 'Materialentsorgung', level: 3, parentCode: '390' },
  { code: '397', name: 'Zusaetzliche Massnahmen', level: 3, parentCode: '390' },
  { code: '399', name: 'Sonstige Massnahmen Baukonstruktionen, sonstiges', level: 3, parentCode: '390' },

  // =========================================================================
  // KG 400 - Bauwerk - Technische Anlagen
  // =========================================================================
  { code: '400', name: 'Bauwerk - Technische Anlagen', level: 1, parentCode: null },

  // KG 410 - Abwasser-, Wasser-, Gasanlagen
  { code: '410', name: 'Abwasser-, Wasser-, Gasanlagen', level: 2, parentCode: '400' },
  { code: '411', name: 'Abwasseranlagen', level: 3, parentCode: '410' },
  { code: '412', name: 'Wasseranlagen', level: 3, parentCode: '410' },
  { code: '413', name: 'Gasanlagen', level: 3, parentCode: '410' },
  { code: '419', name: 'Abwasser-, Wasser-, Gasanlagen, sonstiges', level: 3, parentCode: '410' },

  // KG 420 - Waermeversorgungsanlagen
  { code: '420', name: 'Waermeversorgungsanlagen', level: 2, parentCode: '400' },
  { code: '421', name: 'Waermeerzeugungsanlagen', level: 3, parentCode: '420' },
  { code: '422', name: 'Waermeverteilnetze', level: 3, parentCode: '420' },
  { code: '423', name: 'Raumheizflaechen', level: 3, parentCode: '420' },
  { code: '429', name: 'Waermeversorgungsanlagen, sonstiges', level: 3, parentCode: '420' },

  // KG 430 - Raumlufttechnische Anlagen
  { code: '430', name: 'Raumlufttechnische Anlagen', level: 2, parentCode: '400' },
  { code: '431', name: 'Lueftungsanlagen', level: 3, parentCode: '430' },
  { code: '432', name: 'Teilklimaanlagen', level: 3, parentCode: '430' },
  { code: '433', name: 'Klimaanlagen', level: 3, parentCode: '430' },
  { code: '434', name: 'Kaelteanlagen', level: 3, parentCode: '430' },
  { code: '439', name: 'Raumlufttechnische Anlagen, sonstiges', level: 3, parentCode: '430' },

  // KG 440 - Starkstromanlagen
  { code: '440', name: 'Starkstromanlagen', level: 2, parentCode: '400' },
  { code: '441', name: 'Hoch- und Mittelspannungsanlagen', level: 3, parentCode: '440' },
  { code: '442', name: 'Eigenstromversorgungsanlagen', level: 3, parentCode: '440' },
  { code: '443', name: 'Niederspannungsschaltanlagen', level: 3, parentCode: '440' },
  { code: '444', name: 'Niederspannungsinstallationsanlagen', level: 3, parentCode: '440' },
  { code: '445', name: 'Beleuchtungsanlagen', level: 3, parentCode: '440' },
  { code: '446', name: 'Blitzschutz- und Erdungsanlagen', level: 3, parentCode: '440' },
  { code: '449', name: 'Starkstromanlagen, sonstiges', level: 3, parentCode: '440' },

  // KG 450 - Fernmelde- und informationstechnische Anlagen
  { code: '450', name: 'Fernmelde- und informationstechnische Anlagen', level: 2, parentCode: '400' },
  { code: '451', name: 'Telekommunikationsanlagen', level: 3, parentCode: '450' },
  { code: '452', name: 'Such- und Signalanlagen', level: 3, parentCode: '450' },
  { code: '453', name: 'Zeitdienstanlagen', level: 3, parentCode: '450' },
  { code: '454', name: 'Elektroakustische Anlagen', level: 3, parentCode: '450' },
  { code: '455', name: 'Fernseh- und Antennenanlagen', level: 3, parentCode: '450' },
  { code: '456', name: 'Gefahrenmelde- und Alarmanlagen', level: 3, parentCode: '450' },
  { code: '457', name: 'Uebertragungsnetze', level: 3, parentCode: '450' },
  { code: '459', name: 'Fernmelde- und informationstechnische Anlagen, sonstiges', level: 3, parentCode: '450' },

  // KG 460 - Foerderanlagen
  { code: '460', name: 'Foerderanlagen', level: 2, parentCode: '400' },
  { code: '461', name: 'Aufzugsanlagen', level: 3, parentCode: '460' },
  { code: '462', name: 'Fahrtreppen, Fahrsteige', level: 3, parentCode: '460' },
  { code: '463', name: 'Befahranlagen', level: 3, parentCode: '460' },
  { code: '464', name: 'Transportanlagen', level: 3, parentCode: '460' },
  { code: '465', name: 'Krananlagen', level: 3, parentCode: '460' },
  { code: '469', name: 'Foerderanlagen, sonstiges', level: 3, parentCode: '460' },

  // KG 470 - Nutzungsspezifische und verfahrenstechnische Anlagen
  { code: '470', name: 'Nutzungsspezifische und verfahrenstechnische Anlagen', level: 2, parentCode: '400' },
  { code: '471', name: 'Kuechentechnische Anlagen', level: 3, parentCode: '470' },
  { code: '472', name: 'Waescherei- und Reinigungsanlagen', level: 3, parentCode: '470' },
  { code: '473', name: 'Medienversorgungsanlagen', level: 3, parentCode: '470' },
  { code: '474', name: 'Medizintechnische Anlagen', level: 3, parentCode: '470' },
  { code: '475', name: 'Labortechnische Anlagen', level: 3, parentCode: '470' },
  { code: '476', name: 'Badetechnische Anlagen', level: 3, parentCode: '470' },
  { code: '477', name: 'Prozesswaerme-, -kaelte- und -luftanlagen', level: 3, parentCode: '470' },
  { code: '478', name: 'Entsorgungsanlagen', level: 3, parentCode: '470' },
  { code: '479', name: 'Nutzungsspezifische Anlagen, sonstiges', level: 3, parentCode: '470' },

  // KG 480 - Gebaeudeautomation und Automation von Infrastrukturanlagen
  { code: '480', name: 'Gebaeudeautomation', level: 2, parentCode: '400' },
  { code: '481', name: 'Automationssysteme', level: 3, parentCode: '480' },
  { code: '482', name: 'Schaltschraenke, Automationsschwerpunkte', level: 3, parentCode: '480' },
  { code: '483', name: 'Management- und Bedieneinrichtungen', level: 3, parentCode: '480' },
  { code: '484', name: 'Kabel, Leitungen und Verlegesysteme', level: 3, parentCode: '480' },
  { code: '489', name: 'Gebaeudeautomation, sonstiges', level: 3, parentCode: '480' },

  // KG 490 - Sonstige Massnahmen Technische Anlagen
  { code: '490', name: 'Sonstige Massnahmen Technische Anlagen', level: 2, parentCode: '400' },
  { code: '491', name: 'Baustelleneinrichtung', level: 3, parentCode: '490' },
  { code: '492', name: 'Gerueste', level: 3, parentCode: '490' },
  { code: '493', name: 'Sicherungsmassnahmen', level: 3, parentCode: '490' },
  { code: '494', name: 'Abbruchmassnahmen', level: 3, parentCode: '490' },
  { code: '495', name: 'Instandsetzungen', level: 3, parentCode: '490' },
  { code: '496', name: 'Materialentsorgung', level: 3, parentCode: '490' },
  { code: '497', name: 'Zusaetzliche Massnahmen', level: 3, parentCode: '490' },
  { code: '499', name: 'Sonstige Massnahmen Technische Anlagen, sonstiges', level: 3, parentCode: '490' },

  // =========================================================================
  // KG 500 - Aussenanlagen und Freiflaechen
  // =========================================================================
  { code: '500', name: 'Aussenanlagen und Freiflaechen', level: 1, parentCode: null },
  { code: '510', name: 'Erdbau', level: 2, parentCode: '500' },
  { code: '520', name: 'Gruendung, Unterbau', level: 2, parentCode: '500' },
  { code: '530', name: 'Oberbau, Deckschichten', level: 2, parentCode: '500' },
  { code: '540', name: 'Baukonstruktionen in Aussenanlagen', level: 2, parentCode: '500' },
  { code: '550', name: 'Technische Anlagen in Aussenanlagen', level: 2, parentCode: '500' },
  { code: '560', name: 'Einbauten in Aussenanlagen', level: 2, parentCode: '500' },
  { code: '570', name: 'Vegetationsflaechen', level: 2, parentCode: '500' },
  { code: '580', name: 'Wasserflaechen', level: 2, parentCode: '500' },
  { code: '590', name: 'Sonstige Aussenanlagen', level: 2, parentCode: '500' },

  // =========================================================================
  // KG 600 - Ausstattung und Kunstwerke
  // =========================================================================
  { code: '600', name: 'Ausstattung und Kunstwerke', level: 1, parentCode: null },
  { code: '610', name: 'Ausstattung', level: 2, parentCode: '600' },
  { code: '620', name: 'Kunstwerke', level: 2, parentCode: '600' },

  // =========================================================================
  // KG 700 - Baunebenkosten
  // =========================================================================
  { code: '700', name: 'Baunebenkosten', level: 1, parentCode: null },
  { code: '710', name: 'Bauherrenaufgaben', level: 2, parentCode: '700' },
  { code: '720', name: 'Vorbereitung der Objektplanung', level: 2, parentCode: '700' },
  { code: '730', name: 'Architekten- und Ingenieurleistungen', level: 2, parentCode: '700' },
  { code: '740', name: 'Gutachten und Beratung', level: 2, parentCode: '700' },
  { code: '750', name: 'Kuenstlerische Leistungen', level: 2, parentCode: '700' },
  { code: '760', name: 'Finanzierungskosten', level: 2, parentCode: '700' },
  { code: '770', name: 'Allgemeine Baunebenkosten', level: 2, parentCode: '700' },
  { code: '790', name: 'Sonstige Baunebenkosten', level: 2, parentCode: '700' },

  // =========================================================================
  // KG 800 - Finanzierung
  // =========================================================================
  { code: '800', name: 'Finanzierung', level: 1, parentCode: null },
  { code: '810', name: 'Finanzierungskosten', level: 2, parentCode: '800' },
  { code: '820', name: 'Eigenkapital', level: 2, parentCode: '800' },
  { code: '830', name: 'Fremdkapital', level: 2, parentCode: '800' },
  { code: '840', name: 'Zuwendungen', level: 2, parentCode: '800' },
  { code: '890', name: 'Sonstige Finanzierung', level: 2, parentCode: '800' },
];

// ---------------------------------------------------------------------------
// Internal index for fast lookups
// ---------------------------------------------------------------------------

const _costGroupIndex: Map<string, CostGroup> = new Map();

function ensureIndex(): void {
  if (_costGroupIndex.size > 0) return;
  for (const cg of DIN276_COST_GROUPS) {
    _costGroupIndex.set(cg.code, cg);
  }
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Look up a cost group by its code.
 *
 * @param code - The DIN 276 code (e.g. '300', '340', '345')
 * @returns The cost group or undefined if not found
 */
export function getCostGroup(code: string): CostGroup | undefined {
  ensureIndex();
  return _costGroupIndex.get(code);
}

/**
 * Get all direct children of a given cost group.
 *
 * @param parentCode - The parent cost group code
 * @returns Array of child cost groups
 */
export function getChildGroups(parentCode: string): CostGroup[] {
  return DIN276_COST_GROUPS.filter((cg) => cg.parentCode === parentCode);
}

/**
 * Get the full path from level 1 to the given cost group.
 *
 * @param code - The cost group code
 * @returns Array of cost groups from root to the specified group
 *
 * @example
 * getCostGroupPath('345') // returns [KG 300, KG 340, KG 345]
 */
export function getCostGroupPath(code: string): CostGroup[] {
  ensureIndex();
  const path: CostGroup[] = [];
  const target = _costGroupIndex.get(code);
  if (!target) return path;

  // Walk up the parent chain
  let current: CostGroup | undefined = target;
  while (current) {
    path.unshift(current);
    current = current.parentCode
      ? _costGroupIndex.get(current.parentCode)
      : undefined;
  }

  return path;
}

/**
 * Build a hierarchical tree structure from the flat cost group list.
 * Returns only the level 1 groups with nested children.
 *
 * @returns Array of level 1 cost groups with children populated
 */
export function buildCostGroupTree(): CostGroup[] {
  // Deep clone to avoid mutating the original data
  const cloned: CostGroup[] = DIN276_COST_GROUPS.map((cg) => ({
    ...cg,
    children: [],
  }));

  const index = new Map<string, CostGroup>();
  for (const cg of cloned) {
    index.set(cg.code, cg);
  }

  const roots: CostGroup[] = [];

  for (const cg of cloned) {
    if (cg.parentCode === null) {
      roots.push(cg);
    } else {
      const parent = index.get(cg.parentCode);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(cg);
      }
    }
  }

  return roots;
}

/**
 * Get all level 1 (hundred) cost groups.
 */
export function getLevel1Groups(): CostGroup[] {
  return DIN276_COST_GROUPS.filter((cg) => cg.level === 1);
}

/**
 * Get all level 2 (ten) cost groups for a given level 1 group.
 */
export function getLevel2Groups(level1Code: string): CostGroup[] {
  return DIN276_COST_GROUPS.filter(
    (cg) => cg.level === 2 && cg.parentCode === level1Code,
  );
}

/**
 * Get all level 3 (unit) cost groups for a given level 2 group.
 */
export function getLevel3Groups(level2Code: string): CostGroup[] {
  return DIN276_COST_GROUPS.filter(
    (cg) => cg.level === 3 && cg.parentCode === level2Code,
  );
}

/**
 * Check whether a cost group code is valid per DIN 276:2018.
 */
export function isValidCostGroupCode(code: string): boolean {
  ensureIndex();
  return _costGroupIndex.has(code);
}

/**
 * Get the level 1 ancestor code for any cost group code.
 * E.g. '345' -> '300', '420' -> '400', '100' -> '100'
 */
export function getLevel1Code(code: string): string {
  return `${code[0]}00`;
}

/**
 * Get the level 2 ancestor code for any level 3 cost group code.
 * E.g. '345' -> '340'. Returns the code itself if already level 1 or 2.
 */
export function getLevel2Code(code: string): string {
  if (code.length < 3) return code;
  return `${code[0]}${code[1]}0`;
}

/**
 * Determine the HOAI-relevant cost groups.
 * For §35 HOAI (Gebaeude), the anrechenbare Kosten are KG 300 + KG 400.
 * For §40 HOAI (Freianlagen), the anrechenbare Kosten are KG 500.
 */
export function getHoaiEligibleGroups(
  serviceType: 'gebaeude' | 'freianlagen' | 'technische_ausruestung',
): string[] {
  switch (serviceType) {
    case 'gebaeude':
      return ['300', '400'];
    case 'freianlagen':
      return ['500'];
    case 'technische_ausruestung':
      return ['400'];
    default:
      return [];
  }
}
