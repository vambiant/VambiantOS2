/**
 * HOAI 2021 - Fee Tables and Calculation
 *
 * Contains the official HOAI 2021 fee table data and the main
 * calculation function for determining architect/engineer fees.
 *
 * Reference: HOAI 2021 (Honorarordnung fuer Architekten und Ingenieure)
 * - §35 Gebaeude und Innenraeume
 * - §40 Freianlagen
 * - §44 Ingenieurbauwerke
 * - §48 Verkehrsanlagen
 * - §52 Tragwerksplanung
 * - §56 Technische Ausruestung
 */

import type {
  FeeTableEntry,
  HoaiFeeParams,
  HoaiFeeResult,
  HoaiPhaseBreakdown,
  HoaiPhasePercentage,
  HoaiPhaseNumber,
  HoaiServiceType,
  HoaiZone,
} from './types';
import { lookupFee } from './interpolation';

// ---------------------------------------------------------------------------
// Leistungsphasen (service phases) percentages per service type
// ---------------------------------------------------------------------------

/** §35 HOAI - Gebaeude und Innenraeume */
const GEBAEUDE_PHASES: HoaiPhasePercentage[] = [
  { phase: 1, name: 'Grundlagenermittlung', percentage: 2 },
  { phase: 2, name: 'Vorplanung', percentage: 7 },
  { phase: 3, name: 'Entwurfsplanung', percentage: 15 },
  { phase: 4, name: 'Genehmigungsplanung', percentage: 3 },
  { phase: 5, name: 'Ausfuehrungsplanung', percentage: 25 },
  { phase: 6, name: 'Vorbereitung der Vergabe', percentage: 10 },
  { phase: 7, name: 'Mitwirkung bei der Vergabe', percentage: 4 },
  { phase: 8, name: 'Objektueberwachung - Bauueberwachung', percentage: 32 },
  { phase: 9, name: 'Objektbetreuung', percentage: 2 },
];

/** §35 HOAI - Innenraeume (same table as Gebaeude, different phase split) */
const INNENRAEUME_PHASES: HoaiPhasePercentage[] = [
  { phase: 1, name: 'Grundlagenermittlung', percentage: 2 },
  { phase: 2, name: 'Vorplanung', percentage: 7 },
  { phase: 3, name: 'Entwurfsplanung', percentage: 15 },
  { phase: 4, name: 'Genehmigungsplanung', percentage: 3 },
  { phase: 5, name: 'Ausfuehrungsplanung', percentage: 30 },
  { phase: 6, name: 'Vorbereitung der Vergabe', percentage: 7 },
  { phase: 7, name: 'Mitwirkung bei der Vergabe', percentage: 3 },
  { phase: 8, name: 'Objektueberwachung - Bauueberwachung', percentage: 31 },
  { phase: 9, name: 'Objektbetreuung', percentage: 2 },
];

/** §40 HOAI - Freianlagen */
const FREIANLAGEN_PHASES: HoaiPhasePercentage[] = [
  { phase: 1, name: 'Grundlagenermittlung', percentage: 3 },
  { phase: 2, name: 'Vorplanung', percentage: 10 },
  { phase: 3, name: 'Entwurfsplanung', percentage: 16 },
  { phase: 4, name: 'Genehmigungsplanung', percentage: 4 },
  { phase: 5, name: 'Ausfuehrungsplanung', percentage: 25 },
  { phase: 6, name: 'Vorbereitung der Vergabe', percentage: 7 },
  { phase: 7, name: 'Mitwirkung bei der Vergabe', percentage: 3 },
  { phase: 8, name: 'Objektueberwachung - Bauueberwachung', percentage: 30 },
  { phase: 9, name: 'Objektbetreuung', percentage: 2 },
];

/** §44 HOAI - Ingenieurbauwerke */
const INGENIEURBAUWERKE_PHASES: HoaiPhasePercentage[] = [
  { phase: 1, name: 'Grundlagenermittlung', percentage: 2 },
  { phase: 2, name: 'Vorplanung', percentage: 10 },
  { phase: 3, name: 'Entwurfsplanung', percentage: 15 },
  { phase: 4, name: 'Genehmigungsplanung', percentage: 5 },
  { phase: 5, name: 'Ausfuehrungsplanung', percentage: 22 },
  { phase: 6, name: 'Vorbereitung der Vergabe', percentage: 12 },
  { phase: 7, name: 'Mitwirkung bei der Vergabe', percentage: 4 },
  { phase: 8, name: 'Objektueberwachung - Bauueberwachung', percentage: 28 },
  { phase: 9, name: 'Objektbetreuung', percentage: 2 },
];

/** §48 HOAI - Verkehrsanlagen */
const VERKEHRSANLAGEN_PHASES: HoaiPhasePercentage[] = [
  { phase: 1, name: 'Grundlagenermittlung', percentage: 2 },
  { phase: 2, name: 'Vorplanung', percentage: 10 },
  { phase: 3, name: 'Entwurfsplanung', percentage: 15 },
  { phase: 4, name: 'Genehmigungsplanung', percentage: 8 },
  { phase: 5, name: 'Ausfuehrungsplanung', percentage: 18 },
  { phase: 6, name: 'Vorbereitung der Vergabe', percentage: 12 },
  { phase: 7, name: 'Mitwirkung bei der Vergabe', percentage: 5 },
  { phase: 8, name: 'Objektueberwachung - Bauueberwachung', percentage: 28 },
  { phase: 9, name: 'Objektbetreuung', percentage: 2 },
];

/** §52 HOAI - Tragwerksplanung (only LP1-6, no LP7-9) */
const TRAGWERKSPLANUNG_PHASES: HoaiPhasePercentage[] = [
  { phase: 1, name: 'Grundlagenermittlung', percentage: 3 },
  { phase: 2, name: 'Vorplanung', percentage: 10 },
  { phase: 3, name: 'Entwurfsplanung', percentage: 12 },
  { phase: 4, name: 'Genehmigungsplanung', percentage: 30 },
  { phase: 5, name: 'Ausfuehrungsplanung', percentage: 40 },
  { phase: 6, name: 'Vorbereitung der Vergabe', percentage: 5 },
];

/** §56 HOAI - Technische Ausruestung */
const TECHNISCHE_AUSRUESTUNG_PHASES: HoaiPhasePercentage[] = [
  { phase: 1, name: 'Grundlagenermittlung', percentage: 2 },
  { phase: 2, name: 'Vorplanung', percentage: 9 },
  { phase: 3, name: 'Entwurfsplanung', percentage: 17 },
  { phase: 4, name: 'Genehmigungsplanung', percentage: 2 },
  { phase: 5, name: 'Ausfuehrungsplanung', percentage: 22 },
  { phase: 6, name: 'Vorbereitung der Vergabe', percentage: 7 },
  { phase: 7, name: 'Mitwirkung bei der Vergabe', percentage: 5 },
  { phase: 8, name: 'Objektueberwachung - Bauueberwachung', percentage: 34 },
  { phase: 9, name: 'Objektbetreuung', percentage: 2 },
];

// ---------------------------------------------------------------------------
// Phase percentages lookup
// ---------------------------------------------------------------------------

const PHASE_PERCENTAGES: Record<HoaiServiceType, HoaiPhasePercentage[]> = {
  gebaeude: GEBAEUDE_PHASES,
  innenraeume: INNENRAEUME_PHASES,
  freianlagen: FREIANLAGEN_PHASES,
  ingenieurbauwerke: INGENIEURBAUWERKE_PHASES,
  verkehrsanlagen: VERKEHRSANLAGEN_PHASES,
  tragwerksplanung: TRAGWERKSPLANUNG_PHASES,
  technische_ausruestung: TECHNISCHE_AUSRUESTUNG_PHASES,
};

/**
 * Get the Leistungsphasen percentages for a given service type.
 */
export function getPhasePercentages(
  serviceType: HoaiServiceType,
): HoaiPhasePercentage[] {
  return PHASE_PERCENTAGES[serviceType];
}

// ---------------------------------------------------------------------------
// Fee Tables (HOAI 2021 Anlage 1)
// ---------------------------------------------------------------------------

/**
 * Fee table for §35 HOAI - Gebaeude und Innenraeume
 *
 * Each entry: { costs, fees: [ZI_min, ZI_max, ZII_min, ZII_max, ZIII_min, ZIII_max, ZIV_min, ZIV_max, ZV_min, ZV_max] }
 *
 * Values are based on the HOAI 2021 Honorartafel zu §35 Abs. 1.
 * Fees are in EUR for 100% Leistung (all phases).
 */
const GEBAEUDE_FEE_TABLE: FeeTableEntry[] = [
  { costs: 25_000, fees: [3_843, 4_590, 4_590, 5_703, 5_703, 7_095, 7_095, 8_576, 8_576, 10_024] },
  { costs: 50_000, fees: [6_395, 7_638, 7_638, 9_490, 9_490, 11_805, 11_805, 14_274, 14_274, 16_686] },
  { costs: 75_000, fees: [8_666, 10_351, 10_351, 12_860, 12_860, 16_000, 16_000, 19_347, 19_347, 22_617] },
  { costs: 100_000, fees: [10_770, 12_863, 12_863, 15_982, 15_982, 19_884, 19_884, 24_043, 24_043, 28_105] },
  { costs: 150_000, fees: [14_645, 17_491, 17_491, 21_734, 21_734, 27_041, 27_041, 32_697, 32_697, 38_218] },
  { costs: 200_000, fees: [18_195, 21_732, 21_732, 27_005, 27_005, 33_602, 33_602, 40_630, 40_630, 47_492] },
  { costs: 300_000, fees: [24_750, 29_562, 29_562, 36_732, 36_732, 45_697, 45_697, 55_266, 55_266, 64_594] },
  { costs: 500_000, fees: [36_681, 43_800, 43_800, 54_439, 54_439, 67_735, 67_735, 81_916, 81_916, 95_738] },
  { costs: 750_000, fees: [49_699, 59_355, 59_355, 73_770, 73_770, 91_790, 91_790, 111_009, 111_009, 129_753] },
  { costs: 1_000_000, fees: [61_786, 73_790, 73_790, 91_710, 91_710, 114_106, 114_106, 137_999, 137_999, 161_299] },
  { costs: 1_500_000, fees: [84_014, 100_322, 100_322, 124_685, 124_685, 155_108, 155_108, 187_614, 187_614, 219_291] },
  { costs: 2_000_000, fees: [104_436, 124_719, 124_719, 154_984, 154_984, 192_793, 192_793, 233_174, 233_174, 272_541] },
  { costs: 3_000_000, fees: [142_045, 169_639, 169_639, 210_834, 210_834, 262_324, 262_324, 317_197, 317_197, 370_732] },
  { costs: 5_000_000, fees: [210_540, 251_410, 251_410, 312_420, 312_420, 388_686, 388_686, 470_005, 470_005, 549_309] },
  { costs: 7_500_000, fees: [285_337, 340_716, 340_716, 423_373, 423_373, 526_728, 526_728, 637_058, 637_058, 744_572] },
  { costs: 10_000_000, fees: [354_856, 423_717, 423_717, 526_542, 526_542, 655_056, 655_056, 792_213, 792_213, 926_003] },
  { costs: 15_000_000, fees: [482_582, 576_224, 576_224, 715_986, 715_986, 890_792, 890_792, 1_077_394, 1_077_394, 1_259_356] },
  { costs: 20_000_000, fees: [599_714, 716_102, 716_102, 889_911, 889_911, 1_107_186, 1_107_186, 1_339_171, 1_339_171, 1_565_086] },
  { costs: 25_000_000, fees: [710_005, 847_869, 847_869, 1_053_618, 1_053_618, 1_310_925, 1_310_925, 1_585_582, 1_585_582, 1_852_978] },
];

/**
 * Fee table for §40 HOAI - Freianlagen
 */
const FREIANLAGEN_FEE_TABLE: FeeTableEntry[] = [
  { costs: 25_000, fees: [3_321, 3_975, 3_975, 4_832, 4_832, 5_829, 5_829, 6_934, 6_934, 8_106] },
  { costs: 50_000, fees: [5_572, 6_666, 6_666, 8_103, 8_103, 9_778, 9_778, 11_630, 11_630, 13_595] },
  { costs: 75_000, fees: [7_590, 9_077, 9_077, 11_034, 11_034, 13_316, 13_316, 15_841, 15_841, 18_522] },
  { costs: 100_000, fees: [9_463, 11_318, 11_318, 13_757, 13_757, 16_603, 16_603, 19_751, 19_751, 23_095] },
  { costs: 150_000, fees: [12_920, 15_452, 15_452, 18_785, 18_785, 22_666, 22_666, 26_961, 26_961, 31_525] },
  { costs: 200_000, fees: [16_109, 19_266, 19_266, 23_419, 23_419, 28_259, 28_259, 33_614, 33_614, 39_300] },
  { costs: 300_000, fees: [21_997, 26_305, 26_305, 31_974, 31_974, 38_586, 38_586, 45_913, 45_913, 53_686] },
  { costs: 500_000, fees: [32_808, 39_237, 39_237, 47_688, 47_688, 57_541, 57_541, 68_453, 68_453, 80_033] },
  { costs: 750_000, fees: [44_668, 53_404, 53_404, 64_921, 64_921, 78_335, 78_335, 93_165, 93_165, 108_928] },
  { costs: 1_000_000, fees: [55_641, 66_543, 66_543, 80_872, 80_872, 97_594, 97_594, 116_089, 116_089, 135_712] },
  { costs: 1_500_000, fees: [75_991, 90_867, 90_867, 110_426, 110_426, 133_255, 133_255, 158_541, 158_541, 185_328] },
  { costs: 2_000_000, fees: [94_749, 113_316, 113_316, 137_715, 137_715, 166_161, 166_161, 197_662, 197_662, 231_073] },
  { costs: 3_000_000, fees: [129_505, 154_878, 154_878, 188_226, 188_226, 227_115, 227_115, 270_174, 270_174, 315_848] },
  { costs: 5_000_000, fees: [193_194, 231_032, 231_032, 280_800, 280_800, 338_864, 338_864, 403_110, 403_110, 471_198] },
];

/**
 * Fee table for §44 HOAI - Ingenieurbauwerke
 */
const INGENIEURBAUWERKE_FEE_TABLE: FeeTableEntry[] = [
  { costs: 25_000, fees: [4_167, 4_880, 4_880, 5_928, 5_928, 7_325, 7_325, 8_906, 8_906, 10_403] },
  { costs: 50_000, fees: [7_004, 8_197, 8_197, 9_958, 9_958, 12_306, 12_306, 14_963, 14_963, 17_478] },
  { costs: 100_000, fees: [11_766, 13_769, 13_769, 16_726, 16_726, 20_674, 20_674, 25_137, 25_137, 29_362] },
  { costs: 200_000, fees: [19_772, 23_138, 23_138, 28_109, 28_109, 34_741, 34_741, 42_238, 42_238, 49_339] },
  { costs: 500_000, fees: [40_124, 46_957, 46_957, 57_049, 57_049, 70_512, 70_512, 85_718, 85_718, 100_118] },
  { costs: 1_000_000, fees: [67_417, 78_892, 78_892, 95_855, 95_855, 118_477, 118_477, 144_004, 144_004, 168_222] },
  { costs: 2_000_000, fees: [113_289, 132_568, 132_568, 161_070, 161_070, 199_058, 199_058, 241_966, 241_966, 282_625] },
  { costs: 5_000_000, fees: [229_901, 269_072, 269_072, 326_901, 326_901, 404_022, 404_022, 491_090, 491_090, 573_566] },
  { costs: 10_000_000, fees: [386_309, 452_115, 452_115, 549_215, 549_215, 678_761, 678_761, 825_087, 825_087, 963_666] },
  { costs: 25_000_000, fees: [783_792, 917_274, 917_274, 1_114_108, 1_114_108, 1_376_876, 1_376_876, 1_673_556, 1_673_556, 1_954_709] },
];

/**
 * Fee table for §48 HOAI - Verkehrsanlagen
 */
const VERKEHRSANLAGEN_FEE_TABLE: FeeTableEntry[] = [
  { costs: 25_000, fees: [2_870, 3_423, 3_423, 4_195, 4_195, 5_158, 5_158, 6_219, 6_219, 7_266] },
  { costs: 50_000, fees: [4_823, 5_751, 5_751, 7_048, 7_048, 8_667, 8_667, 10_448, 10_448, 12_208] },
  { costs: 100_000, fees: [8_102, 9_661, 9_661, 11_839, 11_839, 14_559, 14_559, 17_554, 17_554, 20_510] },
  { costs: 200_000, fees: [13_611, 16_228, 16_228, 19_887, 19_887, 24_454, 24_454, 29_480, 29_480, 34_441] },
  { costs: 500_000, fees: [27_625, 32_930, 32_930, 40_347, 40_347, 49_613, 49_613, 59_806, 59_806, 69_870] },
  { costs: 1_000_000, fees: [46_405, 55_314, 55_314, 67_780, 67_780, 83_347, 83_347, 100_466, 100_466, 117_360] },
  { costs: 2_000_000, fees: [77_982, 92_944, 92_944, 113_876, 113_876, 139_999, 139_999, 168_793, 168_793, 197_174] },
  { costs: 5_000_000, fees: [158_310, 188_700, 188_700, 231_195, 231_195, 284_176, 284_176, 342_629, 342_629, 400_200] },
  { costs: 10_000_000, fees: [265_949, 316_984, 316_984, 388_393, 388_393, 477_396, 477_396, 575_591, 575_591, 672_295] },
  { costs: 25_000_000, fees: [539_571, 643_067, 643_067, 787_844, 787_844, 968_866, 968_866, 1_168_009, 1_168_009, 1_364_371] },
];

/**
 * Fee table for §52 HOAI - Tragwerksplanung
 */
const TRAGWERKSPLANUNG_FEE_TABLE: FeeTableEntry[] = [
  { costs: 25_000, fees: [1_833, 2_323, 2_323, 3_013, 3_013, 3_690, 3_690, 4_483, 4_483, 5_244] },
  { costs: 50_000, fees: [3_132, 3_968, 3_968, 5_146, 5_146, 6_303, 6_303, 7_656, 7_656, 8_959] },
  { costs: 100_000, fees: [5_351, 6_779, 6_779, 8_793, 8_793, 10_768, 10_768, 13_080, 13_080, 15_305] },
  { costs: 200_000, fees: [9_141, 11_581, 11_581, 15_023, 15_023, 18_397, 18_397, 22_348, 22_348, 26_150] },
  { costs: 500_000, fees: [18_818, 23_834, 23_834, 30_917, 30_917, 37_857, 37_857, 45_986, 45_986, 53_810] },
  { costs: 1_000_000, fees: [32_145, 40_720, 40_720, 52_825, 52_825, 64_681, 64_681, 78_572, 78_572, 91_930] },
  { costs: 2_000_000, fees: [54_916, 69_564, 69_564, 90_245, 90_245, 110_498, 110_498, 134_234, 134_234, 157_071] },
  { costs: 5_000_000, fees: [113_005, 143_122, 143_122, 185_685, 185_685, 227_313, 227_313, 276_134, 276_134, 323_056] },
  { costs: 10_000_000, fees: [193_041, 244_528, 244_528, 317_204, 317_204, 388_330, 388_330, 471_673, 471_673, 551_913] },
  { costs: 25_000_000, fees: [391_679, 496_135, 496_135, 643_580, 643_580, 787_880, 787_880, 956_919, 956_919, 1_119_676] },
];

/**
 * Fee table for §56 HOAI - Technische Ausruestung
 */
const TECHNISCHE_AUSRUESTUNG_FEE_TABLE: FeeTableEntry[] = [
  { costs: 25_000, fees: [2_498, 2_964, 2_964, 3_619, 3_619, 4_461, 4_461, 5_412, 5_412, 6_323] },
  { costs: 50_000, fees: [4_232, 5_020, 5_020, 6_130, 6_130, 7_553, 7_553, 9_163, 9_163, 10_706] },
  { costs: 100_000, fees: [7_168, 8_503, 8_503, 10_382, 10_382, 12_793, 12_793, 15_518, 15_518, 18_132] },
  { costs: 200_000, fees: [12_140, 14_401, 14_401, 17_583, 17_583, 21_670, 21_670, 26_291, 26_291, 30_714] },
  { costs: 500_000, fees: [24_833, 29_455, 29_455, 35_963, 35_963, 44_318, 44_318, 53_773, 53_773, 62_812] },
  { costs: 1_000_000, fees: [42_066, 49_901, 49_901, 60_918, 60_918, 75_067, 75_067, 91_074, 91_074, 106_370] },
  { costs: 2_000_000, fees: [71_248, 84_521, 84_521, 103_178, 103_178, 127_136, 127_136, 154_256, 154_256, 180_170] },
  { costs: 5_000_000, fees: [145_762, 172_890, 172_890, 211_060, 211_060, 260_048, 260_048, 315_535, 315_535, 368_604] },
  { costs: 10_000_000, fees: [246_875, 292_838, 292_838, 357_479, 357_479, 440_538, 440_538, 534_540, 534_540, 624_406] },
  { costs: 25_000_000, fees: [500_808, 594_023, 594_023, 725_175, 725_175, 893_668, 893_668, 1_084_327, 1_084_327, 1_266_614] },
];

// ---------------------------------------------------------------------------
// Fee table lookup
// ---------------------------------------------------------------------------

const FEE_TABLES: Record<HoaiServiceType, FeeTableEntry[]> = {
  gebaeude: GEBAEUDE_FEE_TABLE,
  innenraeume: GEBAEUDE_FEE_TABLE, // Innenraeume uses same table as Gebaeude
  freianlagen: FREIANLAGEN_FEE_TABLE,
  ingenieurbauwerke: INGENIEURBAUWERKE_FEE_TABLE,
  verkehrsanlagen: VERKEHRSANLAGEN_FEE_TABLE,
  tragwerksplanung: TRAGWERKSPLANUNG_FEE_TABLE,
  technische_ausruestung: TECHNISCHE_AUSRUESTUNG_FEE_TABLE,
};

/**
 * Get the fee table for a given service type.
 */
export function getFeeTable(serviceType: HoaiServiceType): FeeTableEntry[] {
  return FEE_TABLES[serviceType];
}

// ---------------------------------------------------------------------------
// Phase name lookup
// ---------------------------------------------------------------------------

const PHASE_NAMES: Record<number, string> = {
  1: 'Grundlagenermittlung',
  2: 'Vorplanung',
  3: 'Entwurfsplanung',
  4: 'Genehmigungsplanung',
  5: 'Ausfuehrungsplanung',
  6: 'Vorbereitung der Vergabe',
  7: 'Mitwirkung bei der Vergabe',
  8: 'Objektueberwachung - Bauueberwachung',
  9: 'Objektbetreuung',
};

// ---------------------------------------------------------------------------
// Main calculation function
// ---------------------------------------------------------------------------

/**
 * Calculate the HOAI fee for a given set of parameters.
 *
 * This implements the full HOAI 2021 fee calculation:
 * 1. Look up the base fee (min/max) for the zone and eligible costs from the fee table
 * 2. Apply Leistungsphasen percentages for selected phases
 * 3. Apply Umbauzuschlag (conversion factor) if applicable
 * 4. Apply Koordinierungszuschlag (coordination factor) if applicable
 * 5. Calculate Nebenkosten (ancillary costs) surcharge
 *
 * @param params - Calculation parameters
 * @returns Complete fee calculation result
 * @throws Error if parameters are invalid
 */
export function calculateHoaiFee(params: HoaiFeeParams): HoaiFeeResult {
  const {
    serviceType,
    zone,
    eligibleCosts,
    phases,
    conversionFactor = 1.0,
    nebenkostenPercent = 0,
    coordinationFactor = 1.0,
  } = params;

  // --- Validation ---
  if (zone < 1 || zone > 5) {
    throw new Error(`Invalid Honorarzone: ${zone}. Must be 1-5.`);
  }
  if (eligibleCosts <= 0) {
    throw new Error(
      `Invalid eligible costs: ${eligibleCosts}. Must be positive.`,
    );
  }
  if (phases.length === 0) {
    throw new Error('At least one Leistungsphase must be selected.');
  }
  if (conversionFactor < 1.0 || conversionFactor > 1.33) {
    throw new Error(
      `Invalid conversion factor: ${conversionFactor}. Must be between 1.0 and 1.33.`,
    );
  }
  if (coordinationFactor < 1.0) {
    throw new Error(
      `Invalid coordination factor: ${coordinationFactor}. Must be >= 1.0.`,
    );
  }

  const phasePercentages = getPhasePercentages(serviceType);
  const availablePhases = phasePercentages.map((p) => p.phase);

  for (const phase of phases) {
    if (!availablePhases.includes(phase as HoaiPhaseNumber)) {
      throw new Error(
        `Phase ${phase} is not available for service type '${serviceType}'. Available phases: ${availablePhases.join(', ')}`,
      );
    }
  }

  // --- Fee table lookup ---
  const table = getFeeTable(serviceType);
  const feeMin = lookupFee(table, zone, eligibleCosts, 'min');
  const feeMax = lookupFee(table, zone, eligibleCosts, 'max');

  // --- Phase breakdown ---
  const feeByPhase: HoaiPhaseBreakdown[] = [];
  let phasePercentageTotal = 0;

  for (const phaseNum of phases) {
    const phaseDef = phasePercentages.find((p) => p.phase === phaseNum);
    if (!phaseDef) continue;

    const percentage = phaseDef.percentage;
    phasePercentageTotal += percentage;

    feeByPhase.push({
      phase: phaseNum,
      name: phaseDef.name,
      percentage,
      feeMin: roundCurrency(feeMin * (percentage / 100)),
      feeMax: roundCurrency(feeMax * (percentage / 100)),
    });
  }

  // --- Total fee for selected phases ---
  const totalFeeMin = roundCurrency(feeMin * (phasePercentageTotal / 100));
  const totalFeeMax = roundCurrency(feeMax * (phasePercentageTotal / 100));

  // --- Apply factors ---
  const adjustedFeeMin = roundCurrency(
    totalFeeMin * conversionFactor * coordinationFactor,
  );
  const adjustedFeeMax = roundCurrency(
    totalFeeMax * conversionFactor * coordinationFactor,
  );

  // --- Nebenkosten ---
  const nebenkostenAmountMin = roundCurrency(
    adjustedFeeMin * (nebenkostenPercent / 100),
  );
  const nebenkostenAmountMax = roundCurrency(
    adjustedFeeMax * (nebenkostenPercent / 100),
  );

  // --- Final totals ---
  const totalNetMin = roundCurrency(adjustedFeeMin + nebenkostenAmountMin);
  const totalNetMax = roundCurrency(adjustedFeeMax + nebenkostenAmountMax);

  return {
    serviceType,
    zone,
    eligibleCosts,
    feeMin: roundCurrency(feeMin),
    feeMax: roundCurrency(feeMax),
    selectedPhases: [...phases].sort((a, b) => a - b),
    phasePercentageTotal,
    feeByPhase,
    totalFeeMin,
    totalFeeMax,
    conversionFactor,
    coordinationFactor,
    adjustedFeeMin,
    adjustedFeeMax,
    nebenkostenPercent,
    nebenkostenAmountMin,
    nebenkostenAmountMax,
    totalNetMin,
    totalNetMax,
  };
}

/**
 * Round a value to 2 decimal places (EUR cents).
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Convenience: calculate the "mittleres Honorar" (midpoint fee)
 * for a given zone by averaging min and max.
 */
export function calculateMidpointFee(params: HoaiFeeParams): number {
  const result = calculateHoaiFee(params);
  return roundCurrency((result.totalNetMin + result.totalNetMax) / 2);
}

/**
 * Get valid phase numbers for a service type.
 */
export function getValidPhases(serviceType: HoaiServiceType): number[] {
  return getPhasePercentages(serviceType).map((p) => p.phase);
}
