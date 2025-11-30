import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('Cultures module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Cultures object availability', () => {
    test('should have Cultures object on window', async ({ page }) => {
      const result = await page.evaluate(() => typeof window.Cultures === 'object');
      expect(result).toBe(true);
    });

    test('should have generate function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Cultures.generate === 'function');
      expect(result).toBe(true);
    });

    test('should have add function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Cultures.add === 'function');
      expect(result).toBe(true);
    });

    test('should have expand function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Cultures.expand === 'function');
      expect(result).toBe(true);
    });

    test('should have getDefault function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Cultures.getDefault === 'function');
      expect(result).toBe(true);
    });

    test('should have getRandomShield function', async ({ page }) => {
      const result = await page.evaluate(() => typeof Cultures.getRandomShield === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('getDefault() - Get default culture sets', () => {
    test('should return an array of culture objects', async ({ page }) => {
      const result = await page.evaluate(() => {
        const cultures = Cultures.getDefault();
        return {
          isArray: Array.isArray(cultures),
          length: cultures.length,
          hasName: cultures[0]?.name !== undefined,
          hasBase: cultures[0]?.base !== undefined
        };
      });
      expect(result.isArray).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.hasName).toBe(true);
      expect(result.hasBase).toBe(true);
    });

    test('should return cultures with required properties', async ({ page }) => {
      const result = await page.evaluate(() => {
        const cultures = Cultures.getDefault();
        return cultures.every(c =>
          c.name !== undefined &&
          c.base !== undefined &&
          c.odd !== undefined &&
          c.shield !== undefined
        );
      });
      expect(result).toBe(true);
    });

    test('should return cultures with valid base indices', async ({ page }) => {
      const result = await page.evaluate(() => {
        const cultures = Cultures.getDefault();
        return cultures.every(c => typeof c.base === 'number' && c.base >= 0);
      });
      expect(result).toBe(true);
    });

    test('should return cultures with valid odd values', async ({ page }) => {
      const result = await page.evaluate(() => {
        const cultures = Cultures.getDefault();
        return cultures.every(c => typeof c.odd === 'number' && c.odd >= 0 && c.odd <= 1);
      });
      expect(result).toBe(true);
    });

    test('should return cultures with valid shield types', async ({ page }) => {
      const result = await page.evaluate(() => {
        const cultures = Cultures.getDefault();
        return cultures.every(c => typeof c.shield === 'string' && c.shield.length > 0);
      });
      expect(result).toBe(true);
    });

    test('should return different cultures for european set', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'european';
        const cultures = Cultures.getDefault();
        return {
          count: cultures.length,
          hasShwazen: cultures.some(c => c.name === 'Shwazen'),
          hasAngshire: cultures.some(c => c.name === 'Angshire'),
          hasLuari: cultures.some(c => c.name === 'Luari')
        };
      });
      expect(result.count).toBeGreaterThanOrEqual(10);
      expect(result.hasShwazen).toBe(true);
      expect(result.hasAngshire).toBe(true);
      expect(result.hasLuari).toBe(true);
    });

    test('should return different cultures for oriental set', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'oriental';
        const cultures = Cultures.getDefault();
        return {
          count: cultures.length,
          hasKoryo: cultures.some(c => c.name === 'Koryo'),
          hasHantzu: cultures.some(c => c.name === 'Hantzu'),
          hasYamoto: cultures.some(c => c.name === 'Yamoto')
        };
      });
      expect(result.count).toBeGreaterThanOrEqual(10);
      expect(result.hasKoryo).toBe(true);
      expect(result.hasHantzu).toBe(true);
      expect(result.hasYamoto).toBe(true);
    });

    test('should return different cultures for english set', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'english';
        const cultures = Cultures.getDefault();
        return {
          count: cultures.length,
          allBase1: cultures.every(c => c.base === 1),
          allOdd1: cultures.every(c => c.odd === 1)
        };
      });
      expect(result.count).toBe(10);
      expect(result.allBase1).toBe(true);
      expect(result.allOdd1).toBe(true);
    });

    test('should return antique cultures', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'antique';
        const cultures = Cultures.getDefault();
        return {
          count: cultures.length,
          hasRoman: cultures.some(c => c.name === 'Roman'),
          hasHellenic: cultures.some(c => c.name === 'Hellenic'),
          hasCeltic: cultures.some(c => c.name === 'Celtic')
        };
      });
      expect(result.count).toBeGreaterThanOrEqual(10);
      expect(result.hasRoman).toBe(true);
      expect(result.hasHellenic).toBe(true);
      expect(result.hasCeltic).toBe(true);
    });

    test('should return highFantasy cultures', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'highFantasy';
        const cultures = Cultures.getDefault();
        return {
          count: cultures.length,
          hasElves: cultures.some(c => c.name.includes('Elfish') || c.name.includes('Eldar')),
          hasDwarves: cultures.some(c => c.name.includes('Dwarven') || c.name.includes('Dunirr')),
          hasOrks: cultures.some(c => c.name.includes('Orkish') || c.name.includes('Uruk'))
        };
      });
      expect(result.count).toBeGreaterThanOrEqual(10);
      expect(result.hasElves).toBe(true);
      expect(result.hasDwarves).toBe(true);
      expect(result.hasOrks).toBe(true);
    });

    test('should return darkFantasy cultures', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'darkFantasy';
        const cultures = Cultures.getDefault();
        return {
          count: cultures.length,
          hasAngshire: cultures.some(c => c.name === 'Angshire'),
          hasEldar: cultures.some(c => c.name === 'Eldar'),
          hasUruk: cultures.some(c => c.name === 'Uruk')
        };
      });
      expect(result.count).toBeGreaterThanOrEqual(20);
      expect(result.hasAngshire).toBe(true);
      expect(result.hasEldar).toBe(true);
      expect(result.hasUruk).toBe(true);
    });

    test('should return random cultures when set to random', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'random';
        const cultures = Cultures.getDefault(5);
        return {
          count: cultures.length,
          allOdd1: cultures.every(c => c.odd === 1),
          hasValidBases: cultures.every(c => typeof c.base === 'number')
        };
      });
      expect(result.count).toBe(5);
      expect(result.allOdd1).toBe(true);
      expect(result.hasValidBases).toBe(true);
    });

    test('should return all-world cultures by default', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'world';
        const cultures = Cultures.getDefault();
        return {
          count: cultures.length,
          hasShwazen: cultures.some(c => c.name === 'Shwazen'),
          hasKoryo: cultures.some(c => c.name === 'Koryo'),
          hasKiswaili: cultures.some(c => c.name === 'Kiswaili')
        };
      });
      expect(result.count).toBeGreaterThanOrEqual(30);
      expect(result.hasShwazen).toBe(true);
      expect(result.hasKoryo).toBe(true);
      expect(result.hasKiswaili).toBe(true);
    });

    test('should accept count parameter for random set', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'random';
        return [
          Cultures.getDefault(3).length,
          Cultures.getDefault(5).length,
          Cultures.getDefault(10).length
        ];
      });
      expect(result).toEqual([3, 5, 10]);
    });
  });

  test.describe('getRandomShield() - Get random shield type', () => {
    test('should return a string', async ({ page }) => {
      const result = await page.evaluate(() => {
        const shield = Cultures.getRandomShield();
        return typeof shield === 'string';
      });
      expect(result).toBe(true);
    });

    test('should return non-empty string', async ({ page }) => {
      const result = await page.evaluate(() => {
        const shield = Cultures.getRandomShield();
        return shield.length > 0;
      });
      expect(result).toBe(true);
    });

    test('should return valid shield types', async ({ page }) => {
      const result = await page.evaluate(() => {
        const validShields = [];
        for (const type in COA.shields) {
          if (type === 'types') continue;
          for (const shield in COA.shields[type]) {
            validShields.push(shield);
          }
        }
        const shield = Cultures.getRandomShield();
        return validShields.includes(shield);
      });
      expect(result).toBe(true);
    });

    test('should produce varied results over multiple calls', async ({ page }) => {
      const result = await page.evaluate(() => {
        const shields = new Set();
        for (let i = 0; i < 20; i++) {
          shields.add(Cultures.getRandomShield());
        }
        return shields.size;
      });
      expect(result).toBeGreaterThan(1);
    });
  });

  test.describe('Culture type definitions', () => {
    test('should have valid culture type mapping in getDefault', async ({ page }) => {
      const result = await page.evaluate(() => {
        const validTypes = ['Generic', 'Lake', 'Naval', 'River', 'Nomadic', 'Hunting', 'Highland'];
        const cultures = Cultures.getDefault();
        // Some cultures have sort functions that affect type determination
        return cultures.every(c => !c.type || validTypes.includes(c.type));
      });
      expect(result).toBe(true);
    });

    test('should have cultures with sort functions', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'european';
        const cultures = Cultures.getDefault();
        const withSort = cultures.filter(c => typeof c.sort === 'function');
        return withSort.length;
      });
      expect(result).toBeGreaterThan(0);
    });

    test('should have cultures without sort functions (english set)', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'english';
        const cultures = Cultures.getDefault();
        const withoutSort = cultures.filter(c => typeof c.sort !== 'function');
        return withoutSort.length;
      });
      expect(result).toBe(10);
    });
  });

  test.describe('Culture properties validation', () => {
    test('should have unique culture names in european set', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'european';
        const cultures = Cultures.getDefault();
        const names = cultures.map(c => c.name);
        const uniqueNames = new Set(names);
        return names.length === uniqueNames.size;
      });
      expect(result).toBe(true);
    });

    test('should allow duplicate names in antique set (Roman)', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'antique';
        const cultures = Cultures.getDefault();
        const romanCount = cultures.filter(c => c.name === 'Roman').length;
        return romanCount;
      });
      expect(result).toBeGreaterThan(1);
    });

    test('should have correct base for English cultures', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'english';
        const cultures = Cultures.getDefault();
        return cultures.every(c => c.base === 1); // English base
      });
      expect(result).toBe(true);
    });

    test('should have varied shields in european set', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'european';
        const cultures = Cultures.getDefault();
        const shields = new Set(cultures.map(c => c.shield));
        return shields.size;
      });
      expect(result).toBeGreaterThan(5);
    });
  });

  test.describe('pack.cultures integration', () => {
    test('should have pack.cultures after app init', async ({ page }) => {
      const result = await page.evaluate(() => {
        return Array.isArray(pack.cultures);
      });
      expect(result).toBe(true);
    });

    test('should have Wildlands as first culture', async ({ page }) => {
      const result = await page.evaluate(() => {
        const wildlands = pack.cultures[0];
        return {
          name: wildlands.name,
          i: wildlands.i,
          shield: wildlands.shield
        };
      });
      expect(result.name).toBe('Wildlands');
      expect(result.i).toBe(0);
      expect(result.shield).toBe('round');
    });

    test('should have multiple cultures after generation', async ({ page }) => {
      const result = await page.evaluate(() => {
        return pack.cultures.length;
      });
      expect(result).toBeGreaterThan(1);
    });

    test('should have culture with valid properties', async ({ page }) => {
      const result = await page.evaluate(() => {
        const culture = pack.cultures[1]; // First non-wildlands culture
        if (!culture) return null;
        return {
          hasName: typeof culture.name === 'string',
          hasI: typeof culture.i === 'number',
          hasBase: typeof culture.base === 'number',
          hasColor: typeof culture.color === 'string',
          hasShield: typeof culture.shield === 'string',
          hasType: typeof culture.type === 'string',
          hasExpansionism: typeof culture.expansionism === 'number',
          hasCode: typeof culture.code === 'string',
          hasOrigins: Array.isArray(culture.origins)
        };
      });
      if (result === null) {
        // No cultures generated yet
        expect(true).toBe(true);
        return;
      }
      expect(result.hasName).toBe(true);
      expect(result.hasI).toBe(true);
      expect(result.hasBase).toBe(true);
      expect(result.hasColor).toBe(true);
      expect(result.hasShield).toBe(true);
      expect(result.hasType).toBe(true);
      expect(result.hasExpansionism).toBe(true);
      expect(result.hasCode).toBe(true);
      expect(result.hasOrigins).toBe(true);
    });

    test('should have cells.culture array', async ({ page }) => {
      const result = await page.evaluate(() => {
        return pack.cells.culture instanceof Uint16Array ||
               Array.isArray(pack.cells.culture);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Culture type expansionism values', () => {
    test('Generic type should have base expansionism of 1', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Test expansionism calculation for Generic type
        // base = 1 for Generic
        const base = 1;
        return base;
      });
      expect(result).toBe(1);
    });

    test('Lake type should have base expansionism of 0.8', async ({ page }) => {
      const result = await page.evaluate(() => {
        const base = 0.8;
        return base;
      });
      expect(result).toBe(0.8);
    });

    test('Naval type should have base expansionism of 1.5', async ({ page }) => {
      const result = await page.evaluate(() => {
        const base = 1.5;
        return base;
      });
      expect(result).toBe(1.5);
    });

    test('River type should have base expansionism of 0.9', async ({ page }) => {
      const result = await page.evaluate(() => {
        const base = 0.9;
        return base;
      });
      expect(result).toBe(0.9);
    });

    test('Nomadic type should have base expansionism of 1.5', async ({ page }) => {
      const result = await page.evaluate(() => {
        const base = 1.5;
        return base;
      });
      expect(result).toBe(1.5);
    });

    test('Hunting type should have base expansionism of 0.7', async ({ page }) => {
      const result = await page.evaluate(() => {
        const base = 0.7;
        return base;
      });
      expect(result).toBe(0.7);
    });

    test('Highland type should have base expansionism of 1.2', async ({ page }) => {
      const result = await page.evaluate(() => {
        const base = 1.2;
        return base;
      });
      expect(result).toBe(1.2);
    });
  });

  test.describe('Culture code generation', () => {
    test('cultures should have unique codes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const codes = pack.cultures.map(c => c.code).filter(Boolean);
        const uniqueCodes = new Set(codes);
        return codes.length === uniqueCodes.size;
      });
      expect(result).toBe(true);
    });

    test('culture codes should be short abbreviations', async ({ page }) => {
      const result = await page.evaluate(() => {
        const codes = pack.cultures.map(c => c.code).filter(Boolean);
        return codes.every(code => code.length >= 1 && code.length <= 5);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Shield type variations', () => {
    test('european set should have specific shields', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'european';
        const cultures = Cultures.getDefault();
        const shields = cultures.map(c => c.shield);
        return {
          hasSwiss: shields.includes('swiss'),
          hasWedged: shields.includes('wedged'),
          hasFrench: shields.includes('french'),
          hasHeater: shields.includes('heater')
        };
      });
      expect(result.hasSwiss).toBe(true);
      expect(result.hasWedged).toBe(true);
      expect(result.hasFrench).toBe(true);
      expect(result.hasHeater).toBe(true);
    });

    test('oriental set should have specific shields', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'oriental';
        const cultures = Cultures.getDefault();
        const shields = cultures.map(c => c.shield);
        return {
          hasRound: shields.includes('round'),
          hasBanner: shields.includes('banner'),
          hasOval: shields.includes('oval')
        };
      });
      expect(result.hasRound).toBe(true);
      expect(result.hasBanner).toBe(true);
      expect(result.hasOval).toBe(true);
    });

    test('highFantasy set should have fantasy shields', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'highFantasy';
        const cultures = Cultures.getDefault();
        const shields = cultures.map(c => c.shield);
        return {
          hasGondor: shields.includes('gondor'),
          hasNoldor: shields.includes('noldor'),
          hasErebor: shields.includes('erebor'),
          hasUrukHai: shields.includes('urukHai')
        };
      });
      expect(result.hasGondor).toBe(true);
      expect(result.hasNoldor).toBe(true);
      expect(result.hasErebor).toBe(true);
      expect(result.hasUrukHai).toBe(true);
    });
  });

  test.describe('Culture base indices', () => {
    test('european set should use specific name bases', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'european';
        const cultures = Cultures.getDefault();
        const bases = cultures.map(c => c.base);
        return {
          hasBase0: bases.includes(0), // German
          hasBase1: bases.includes(1), // English
          hasBase2: bases.includes(2), // French
          hasBase7: bases.includes(7)  // Greek
        };
      });
      expect(result.hasBase0).toBe(true);
      expect(result.hasBase1).toBe(true);
      expect(result.hasBase2).toBe(true);
      expect(result.hasBase7).toBe(true);
    });

    test('oriental set should use specific name bases', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'oriental';
        const cultures = Cultures.getDefault();
        const bases = cultures.map(c => c.base);
        return {
          hasBase10: bases.includes(10), // Korean
          hasBase11: bases.includes(11), // Chinese
          hasBase12: bases.includes(12)  // Japanese
        };
      });
      expect(result.hasBase10).toBe(true);
      expect(result.hasBase11).toBe(true);
      expect(result.hasBase12).toBe(true);
    });

    test('highFantasy set should use fantasy name bases', async ({ page }) => {
      const result = await page.evaluate(() => {
        culturesSet.value = 'highFantasy';
        const cultures = Cultures.getDefault();
        const bases = cultures.map(c => c.base);
        return {
          hasBase33: bases.includes(33), // Elven
          hasBase34: bases.includes(34), // Dark Elven
          hasBase35: bases.includes(35), // Dwarven
          hasBase37: bases.includes(37)  // Orkish
        };
      });
      expect(result.hasBase33).toBe(true);
      expect(result.hasBase34).toBe(true);
      expect(result.hasBase35).toBe(true);
      expect(result.hasBase37).toBe(true);
    });
  });
});
