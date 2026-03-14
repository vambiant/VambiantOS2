import { describe, it, expect } from 'vitest';
import {
  getCostGroup,
  getChildGroups,
  getCostGroupPath,
  buildCostGroupTree,
  getLevel1Groups,
  getLevel2Groups,
  getLevel3Groups,
  isValidCostGroupCode,
  getLevel1Code,
  getLevel2Code,
  getHoaiEligibleGroups,
  DIN276_COST_GROUPS,
} from '../cost-groups';

describe('DIN 276 Cost Groups', () => {
  // -------------------------------------------------------------------------
  // 1. getCostGroup - valid lookup
  // -------------------------------------------------------------------------
  it("looks up cost group '300' and returns Bauwerk - Baukonstruktionen", () => {
    const cg = getCostGroup('300');
    expect(cg).toBeDefined();
    expect(cg?.code).toBe('300');
    expect(cg?.name).toBe('Bauwerk - Baukonstruktionen');
    expect(cg?.level).toBe(1);
    expect(cg?.parentCode).toBeNull();
  });

  it("looks up cost group '345' and returns Innenwand-Fenster", () => {
    const cg = getCostGroup('345');
    expect(cg).toBeDefined();
    expect(cg?.code).toBe('345');
    expect(cg?.name).toBe('Innenwand-Fenster');
    expect(cg?.level).toBe(3);
    expect(cg?.parentCode).toBe('340');
  });

  // -------------------------------------------------------------------------
  // 2. getCostGroup - invalid lookup
  // -------------------------------------------------------------------------
  it("returns undefined for non-existent code '999'", () => {
    const cg = getCostGroup('999');
    expect(cg).toBeUndefined();
  });

  it("returns undefined for empty string ''", () => {
    const cg = getCostGroup('');
    expect(cg).toBeUndefined();
  });

  it("returns undefined for code 'abc'", () => {
    const cg = getCostGroup('abc');
    expect(cg).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 3. getChildGroups - children of '300'
  // -------------------------------------------------------------------------
  it("returns correct children for cost group '300'", () => {
    const children = getChildGroups('300');
    const codes = children.map((c) => c.code);

    expect(codes).toContain('310');
    expect(codes).toContain('320');
    expect(codes).toContain('330');
    expect(codes).toContain('340');
    expect(codes).toContain('350');
    expect(codes).toContain('360');
    expect(codes).toContain('370');
    expect(codes).toContain('390');
    expect(codes).toHaveLength(8);
  });

  it("returns empty array for leaf node '345'", () => {
    const children = getChildGroups('345');
    expect(children).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 4. getCostGroupPath - path for '345'
  // -------------------------------------------------------------------------
  it("returns correct path for cost group '345'", () => {
    const path = getCostGroupPath('345');

    expect(path).toHaveLength(3);
    expect(path[0]?.code).toBe('300');
    expect(path[1]?.code).toBe('340');
    expect(path[2]?.code).toBe('345');
  });

  it("returns single-element path for root group '100'", () => {
    const path = getCostGroupPath('100');
    expect(path).toHaveLength(1);
    expect(path[0]?.code).toBe('100');
  });

  it("returns two-element path for level 2 group '310'", () => {
    const path = getCostGroupPath('310');
    expect(path).toHaveLength(2);
    expect(path[0]?.code).toBe('300');
    expect(path[1]?.code).toBe('310');
  });

  it('returns empty path for non-existent code', () => {
    const path = getCostGroupPath('999');
    expect(path).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 5. buildCostGroupTree - hierarchical tree
  // -------------------------------------------------------------------------
  it('builds a tree with 8 root nodes', () => {
    const tree = buildCostGroupTree();
    expect(tree).toHaveLength(8);
  });

  it('tree root nodes are level 1 groups', () => {
    const tree = buildCostGroupTree();
    for (const node of tree) {
      expect(node.level).toBe(1);
      expect(node.parentCode).toBeNull();
    }
  });

  it('tree preserves children hierarchy', () => {
    const tree = buildCostGroupTree();
    const kg300 = tree.find((n) => n.code === '300');

    expect(kg300).toBeDefined();
    expect(kg300?.children).toBeDefined();
    expect(kg300?.children?.length).toBe(8);

    // Check nested children (e.g., 340 -> 341, 342, ...)
    const kg340 = kg300?.children?.find((n) => n.code === '340');
    expect(kg340).toBeDefined();
    expect(kg340?.children?.length).toBeGreaterThan(0);
    expect(kg340?.children?.some((c) => c.code === '345')).toBe(true);
  });

  it('tree does not mutate the original DIN276_COST_GROUPS array', () => {
    buildCostGroupTree();
    // Original entries should not have children property populated
    const original300 = DIN276_COST_GROUPS.find((cg) => cg.code === '300');
    expect(original300?.children).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 6. Level 1 groups - exactly 8 groups (100-800)
  // -------------------------------------------------------------------------
  it('has exactly 8 level 1 cost groups', () => {
    const level1 = getLevel1Groups();
    expect(level1).toHaveLength(8);

    const codes = level1.map((cg) => cg.code);
    expect(codes).toEqual(['100', '200', '300', '400', '500', '600', '700', '800']);
  });

  // -------------------------------------------------------------------------
  // 7. All codes unique
  // -------------------------------------------------------------------------
  it('has no duplicate cost group codes', () => {
    const codes = DIN276_COST_GROUPS.map((cg) => cg.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  // -------------------------------------------------------------------------
  // 8. Parent references valid
  // -------------------------------------------------------------------------
  it('every parentCode references an existing code', () => {
    const allCodes = new Set(DIN276_COST_GROUPS.map((cg) => cg.code));

    for (const cg of DIN276_COST_GROUPS) {
      if (cg.parentCode !== null) {
        expect(
          allCodes.has(cg.parentCode),
          `Cost group ${cg.code} references non-existent parent ${cg.parentCode}`,
        ).toBe(true);
      }
    }
  });

  // -------------------------------------------------------------------------
  // Additional helper function tests
  // -------------------------------------------------------------------------
  describe('helper functions', () => {
    it('isValidCostGroupCode returns true for valid codes', () => {
      expect(isValidCostGroupCode('300')).toBe(true);
      expect(isValidCostGroupCode('345')).toBe(true);
      expect(isValidCostGroupCode('100')).toBe(true);
    });

    it('isValidCostGroupCode returns false for invalid codes', () => {
      expect(isValidCostGroupCode('999')).toBe(false);
      expect(isValidCostGroupCode('')).toBe(false);
      expect(isValidCostGroupCode('abc')).toBe(false);
    });

    it('getLevel1Code extracts the hundreds digit', () => {
      expect(getLevel1Code('345')).toBe('300');
      expect(getLevel1Code('420')).toBe('400');
      expect(getLevel1Code('100')).toBe('100');
    });

    it('getLevel2Code extracts the tens digit', () => {
      expect(getLevel2Code('345')).toBe('340');
      expect(getLevel2Code('420')).toBe('420');
      expect(getLevel2Code('100')).toBe('100');
    });

    it('getLevel2Groups returns correct groups for KG 300', () => {
      const groups = getLevel2Groups('300');
      expect(groups.length).toBe(8);
      expect(groups.every((g) => g.level === 2)).toBe(true);
      expect(groups.every((g) => g.parentCode === '300')).toBe(true);
    });

    it('getLevel3Groups returns correct groups for KG 340', () => {
      const groups = getLevel3Groups('340');
      expect(groups.length).toBeGreaterThan(0);
      expect(groups.every((g) => g.level === 3)).toBe(true);
      expect(groups.every((g) => g.parentCode === '340')).toBe(true);
      expect(groups.some((g) => g.code === '345')).toBe(true);
    });

    it('getHoaiEligibleGroups returns correct groups for Gebaeude', () => {
      expect(getHoaiEligibleGroups('gebaeude')).toEqual(['300', '400']);
    });

    it('getHoaiEligibleGroups returns correct groups for Freianlagen', () => {
      expect(getHoaiEligibleGroups('freianlagen')).toEqual(['500']);
    });

    it('getHoaiEligibleGroups returns correct groups for Technische Ausruestung', () => {
      expect(getHoaiEligibleGroups('technische_ausruestung')).toEqual(['400']);
    });
  });

  // -------------------------------------------------------------------------
  // Data integrity
  // -------------------------------------------------------------------------
  describe('data integrity', () => {
    it('all level 1 groups have parentCode null', () => {
      const level1 = DIN276_COST_GROUPS.filter((cg) => cg.level === 1);
      for (const cg of level1) {
        expect(cg.parentCode, `Level 1 group ${cg.code} should have null parent`).toBeNull();
      }
    });

    it('all level 2+ groups have non-null parentCode', () => {
      const nonLevel1 = DIN276_COST_GROUPS.filter((cg) => cg.level > 1);
      for (const cg of nonLevel1) {
        expect(
          cg.parentCode,
          `Level ${cg.level} group ${cg.code} should have a parent`,
        ).not.toBeNull();
      }
    });

    it('level 2 groups always have a level 1 parent', () => {
      const level2 = DIN276_COST_GROUPS.filter((cg) => cg.level === 2);
      for (const cg of level2) {
        const parent = getCostGroup(cg.parentCode!);
        expect(parent, `Parent of ${cg.code} should exist`).toBeDefined();
        expect(parent?.level, `Parent of level 2 group ${cg.code} should be level 1`).toBe(1);
      }
    });

    it('level 3 groups always have a level 2 parent', () => {
      const level3 = DIN276_COST_GROUPS.filter((cg) => cg.level === 3);
      for (const cg of level3) {
        const parent = getCostGroup(cg.parentCode!);
        expect(parent, `Parent of ${cg.code} should exist`).toBeDefined();
        expect(parent?.level, `Parent of level 3 group ${cg.code} should be level 2`).toBe(2);
      }
    });
  });
});
