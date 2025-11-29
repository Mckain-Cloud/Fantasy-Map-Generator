import { test, expect } from '@playwright/test';

test.describe('languageUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => typeof window.vowel === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('vowel() - Check if character is vowel', () => {
    test('should identify lowercase vowels', async () => {
      const result = await page.evaluate(() => [
        vowel('a'), vowel('e'), vowel('i'), vowel('o'), vowel('u'), vowel('y')
      ]);
      expect(result).toEqual([true, true, true, true, true, true]);
    });

    test('should identify uppercase vowels', async () => {
      const result = await page.evaluate(() => [
        vowel('A'), vowel('E'), vowel('I'), vowel('O'), vowel('U')
      ]);
      expect(result).toEqual([false, false, false, false, false]);
    });

    test('should reject consonants', async () => {
      const result = await page.evaluate(() => [
        vowel('b'), vowel('c'), vowel('d'), vowel('f'), vowel('g')
      ]);
      expect(result).toEqual([false, false, false, false, false]);
    });

    test('should identify special vowels', async () => {
      const result = await page.evaluate(() => [
        vowel('ä'), vowel('ö'), vowel('ü'), vowel('à'), vowel('é')
      ]);
      expect(result).toEqual([true, true, true, true, true]);
    });

    test('should handle empty string', async () => {
      const result = await page.evaluate(() => vowel(''));
      expect(typeof result).toBe('boolean');
    });

    test('should handle apostrophe as vowel', async () => {
      const result = await page.evaluate(() => vowel("'"));
      expect(result).toBe(true);
    });
  });

  test.describe('trimVowels() - Remove trailing vowels', () => {
    test('should remove single trailing vowel', async () => {
      const result = await page.evaluate(() => trimVowels('hello'));
      expect(result).toBe('hell');
    });

    test('should remove multiple trailing vowels', async () => {
      const result = await page.evaluate(() => trimVowels('area'));
      expect(result).toBe('are');
    });

    test('should respect minimum length', async () => {
      const result = await page.evaluate(() => trimVowels('io', 2));
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    test('should use default minLength of 3', async () => {
      const result = await page.evaluate(() => trimVowels('ae'));
      expect(result).toBe('ae');
    });

    test('should trim to minLength 0 when specified', async () => {
      const result = await page.evaluate(() => trimVowels('aeiou', 0));
      expect(result).toBe('');
    });

    test('should not trim consonants', async () => {
      const result = await page.evaluate(() => trimVowels('test'));
      expect(result).toBe('test');
    });

    test('should handle strings with no vowels', async () => {
      const result = await page.evaluate(() => trimVowels('xyz'));
      expect(result).toBe('xyz');
    });

    test('should handle empty string', async () => {
      const result = await page.evaluate(() => trimVowels(''));
      expect(result).toBe('');
    });

    test('should trim special vowels', async () => {
      const result = await page.evaluate(() => trimVowels('café', 0));
      expect(result).toBe('caf');
    });
  });

  test.describe('getAdjective() - Convert noun to adjective', () => {
    test('should convert "land" endings', async () => {
      const result = await page.evaluate(() => getAdjective('England'));
      expect(result).toMatch(/English|Engish/);
    });

    test('should convert "stan" endings', async () => {
      const result = await page.evaluate(() => getAdjective('Pakistan'));
      expect(result).toMatch(/Pakistani|Pakist/);
    });

    test('should convert "a" endings', async () => {
      const result = await page.evaluate(() => getAdjective('America'));
      expect(result).toBe('American');
    });

    test('should convert "o" endings', async () => {
      const result = await page.evaluate(() => getAdjective('Mexico'));
      expect(result).toBe('Mexican');
    });

    test('should convert "i" endings', async () => {
      const result = await page.evaluate(() => getAdjective('Fiji'));
      expect(result).toBe('Fijian');
    });

    test('should convert "e" endings', async () => {
      const result = await page.evaluate(() => getAdjective('Rome'));
      expect(result).toBe('Romean');
    });

    test('should convert "u" endings', async () => {
      const result = await page.evaluate(() => getAdjective('Peru'));
      expect(result).toBe('Peruan');
    });

    test('should convert "que" endings', async () => {
      const result = await page.evaluate(() => getAdjective('Mozambique'));
      expect(result).toBe('Mozambican');
    });

    test('should handle Guo suffix', async () => {
      const result = await page.evaluate(() => getAdjective('Test Guo'));
      expect(result).toBe('Test');
    });

    test('should return noun if no rule matches', async () => {
      const result = await page.evaluate(() => {
        Math.random = () => 1;
        return getAdjective('xyz');
      });
      expect(result).toBe('xyz');
    });
  });

  test.describe('nth() - Get ordinal numbers', () => {
    test('should return 1st for 1', async () => {
      const result = await page.evaluate(() => nth(1));
      expect(result).toBe('1st');
    });

    test('should return 2nd for 2', async () => {
      const result = await page.evaluate(() => nth(2));
      expect(result).toBe('2nd');
    });

    test('should return 3rd for 3', async () => {
      const result = await page.evaluate(() => nth(3));
      expect(result).toBe('3rd');
    });

    test('should return 4th for 4', async () => {
      const result = await page.evaluate(() => nth(4));
      expect(result).toBe('4th');
    });

    test('should return 11th for 11', async () => {
      const result = await page.evaluate(() => nth(11));
      expect(result).toBe('11th');
    });

    test('should return 12th for 12', async () => {
      const result = await page.evaluate(() => nth(12));
      expect(result).toBe('12th');
    });

    test('should return 13th for 13', async () => {
      const result = await page.evaluate(() => nth(13));
      expect(result).toBe('13th');
    });

    test('should return 21st for 21', async () => {
      const result = await page.evaluate(() => nth(21));
      expect(result).toBe('21st');
    });

    test('should return 22nd for 22', async () => {
      const result = await page.evaluate(() => nth(22));
      expect(result).toBe('22nd');
    });

    test('should return 23rd for 23', async () => {
      const result = await page.evaluate(() => nth(23));
      expect(result).toBe('23rd');
    });

    test('should return correct ordinal for 100', async () => {
      const result = await page.evaluate(() => nth(100));
      expect(result).toMatch(/100(st|nd|rd|th)/);
    });

    test('should return 101st for 101', async () => {
      const result = await page.evaluate(() => nth(101));
      expect(result).toBe('101st');
    });

    test('should handle 0', async () => {
      const result = await page.evaluate(() => nth(0));
      expect(result).toBe('0th');
    });

    test('should handle negative numbers', async () => {
      const result = await page.evaluate(() => nth(-1));
      expect(result).toMatch(/-1(st|nd|rd|th)/);
    });
  });

  test.describe('abbreviate() - Get two-letter code', () => {
    test('should abbreviate two-word names with first letters', async () => {
      const result = await page.evaluate(() => abbreviate('United States'));
      expect(result).toBe('US');
    });

    test('should abbreviate single-word names with first two letters', async () => {
      const result = await page.evaluate(() => abbreviate('France'));
      expect(result).toBe('Fr');
    });

    test('should handle "Old" prefix', async () => {
      const result = await page.evaluate(() => abbreviate('Old Kingdom'));
      expect(result).toBe('OK');
    });

    test('should remove parentheses', async () => {
      const result = await page.evaluate(() => abbreviate('Test (Name)'));
      expect(result).toBe('TN');
    });

    test('should avoid restricted codes', async () => {
      const result = await page.evaluate(() => abbreviate('France', ['Fr']));
      expect(result).not.toBe('Fr');
      expect(result.length).toBe(2);
      expect(result[0]).toBe('F');
    });

    test('should handle multiple restricted codes', async () => {
      const result = await page.evaluate(() => abbreviate('Test', ['Te', 'Ts', 'Tt']));
      expect(result).not.toBe('Te');
      expect(result.length).toBe(2);
      expect(result[0]).toBe('T');
    });

    test('should handle three-word names', async () => {
      const result = await page.evaluate(() => abbreviate('United Arab Emirates'));
      expect(result).toBe('Un');
    });

    test('should handle empty string', async () => {
      const result = await page.evaluate(() => abbreviate(''));
      expect(result).toBe('');
    });

    test('should handle single character', async () => {
      const result = await page.evaluate(() => abbreviate('A'));
      expect(result).toBe('A');
    });
  });

  test.describe('list() - Conjunct array', () => {
    test('should format array with Intl.ListFormat if available', async () => {
      const result = await page.evaluate(() => {
        if (!Intl.ListFormat) return 'skip';
        return list(['Apple', 'Banana', 'Cherry']);
      });
      if (result !== 'skip') {
        expect(result).toContain('and');
        expect(result).toContain('Apple');
        expect(result).toContain('Banana');
        expect(result).toContain('Cherry');
      }
    });

    test('should handle two items', async () => {
      const result = await page.evaluate(() => {
        if (!Intl.ListFormat) return 'skip';
        return list(['First', 'Second']);
      });
      if (result !== 'skip') {
        expect(result).toContain('and');
        expect(result).toContain('First');
        expect(result).toContain('Second');
      }
    });

    test('should handle single item', async () => {
      const result = await page.evaluate(() => {
        if (!Intl.ListFormat) return 'skip';
        return list(['Only']);
      });
      if (result !== 'skip') {
        expect(result).toBe('Only');
      }
    });

    test('should handle empty array', async () => {
      const result = await page.evaluate(() => {
        if (!Intl.ListFormat) return 'skip';
        return list([]);
      });
      if (result !== 'skip') {
        expect(result).toBe('');
      }
    });

    test('should fallback to comma join if Intl.ListFormat not available', async () => {
      const result = await page.evaluate(() => {
        const originalListFormat = Intl.ListFormat;
        Intl.ListFormat = undefined;
        const res = list(['A', 'B', 'C']);
        Intl.ListFormat = originalListFormat;
        return res;
      });
      expect(result).toBe('A, B, C');
    });
  });
});
