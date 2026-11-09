# Testing Implementation Guide

**Status:** Infrastructure Complete ✅
**Next:** Write 520+ tests across 40 test files
**Coverage Target:** 90%

---

## ✅ Infrastructure Complete

### Created Files:
1. **package.json** - Playwright + dependencies
2. **playwright.config.js** - Microsoft Edge configuration
3. **tests/setup/fixtures.js** - Test data and seeds
4. **tests/setup/mocks.js** - AI, storage, random mocks
5. **tests/setup/helpers.js** - Test utilities
6. **tests/setup/assertions.js** - Custom assertions
7. **.github/workflows/test.yml** - CI/CD pipeline

### Ready to Run:
```bash
npm install
npx playwright install msedge
npm test
```

---

## Test Implementation Roadmap

### Phase 2: Unit Tests for utils/ (~80 tests) - NEXT

#### Files to Test (16 total):

**1. numberUtils.js** (~8 tests)
- `rn(value, decimals)` - Round numbers
- `clamp(value, min, max)` - Constrain values
- `gauss(expected, sigma)` - Gaussian distribution
- `rand(min, max)` - Random in range
- Edge cases: NaN, Infinity, negative

**2. stringUtils.js** (~6 tests)
- `capitalize(str)` - Capitalize first letter
- `trimVowels(str)` - Remove vowels
- `splitCamelCase(str)` - Split camel case
- Edge cases: empty, special chars

**3. arrayUtils.js** (~8 tests)
- `last(arr)` - Get last element
- `unique(arr)` - Remove duplicates
- `shuffle(arr)` - Randomize array
- `removeItemOnce(arr, item)` - Remove single
- Edge cases: empty array, single element

**4. colorUtils.js** (~6 tests)
- `getColor(id)` - Generate color from ID
- `colorToRGB(color)` - Convert to RGB
- `RGBtoHex(r, g, b)` - Convert to hex
- Edge cases: invalid colors

**5. graphUtils.js** (~10 tests)
- `findCell(x, y)` - Get cell at coordinates
- `getPackPolygon(cellId)` - Get cell polygon
- `getCellNeighbors(cellId)` - Get neighbors
- Voronoi/Delaunay utilities
- Edge cases: out of bounds

**6. probabilityUtils.js** (~8 tests)
- `probability(chance)` - Random yes/no
- `weighted(weights)` - Weighted random selection
- `rw(weights)` - Random weighted
- Distribution testing

**7. languageUtils.js** (~6 tests)
- `addArticle(word)` - Add article (a/an)
- `pluralize(word)` - Pluralization
- Language processing utilities

**8. unitUtils.js** (~6 tests)
- `convertTemperature(temp, unit)` - Temp conversion
- `convertDistance(dist, unit)` - Distance conversion
- `convertArea(area, unit)` - Area conversion

**9. pathUtils.js** (~8 tests)
- `getIsolines()` - Isoline generation
- Path simplification
- SVG path utilities

**10-16. Remaining utils** (~14 tests)
- commonUtils.js - General helpers
- nodeUtils.js - Node utilities
- functionUtils.js - Function helpers
- shorthands.js - Shortcuts (byId, etc.)
- polyfills.js - Polyfills
- debugUtils.js - Debug helpers

**Total: ~80 tests**

---

### Example Test File Template

```javascript
// tests/unit/utils/numberUtils.spec.js
import { test, expect } from '@playwright/test';

test.describe('numberUtils.js', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.rn === 'function');
  });

  test.describe('rn() - Round number', () => {
    test('should round to 2 decimal places by default', async ({ page }) => {
      const result = await page.evaluate(() => rn(3.14159));
      expect(result).toBe(3.14);
    });

    test('should round to specified decimal places', async ({ page }) => {
      const result = await page.evaluate(() => rn(3.14159, 3));
      expect(result).toBe(3.142);
    });

    test('should round to 0 decimals', async ({ page }) => {
      const result = await page.evaluate(() => rn(3.7, 0));
      expect(result).toBe(4);
    });

    test('should handle negative numbers', async ({ page }) => {
      const result = await page.evaluate(() => rn(-3.14159, 1));
      expect(result).toBe(-3.1);
    });

    test('should handle zero', async ({ page }) => {
      const result = await page.evaluate(() => rn(0, 2));
      expect(result).toBe(0);
    });

    test('should handle very small numbers', async ({ page }) => {
      const result = await page.evaluate(() => rn(0.000123, 5));
      expect(result).toBe(0.00012);
    });

    test('should handle NaN gracefully', async ({ page }) => {
      const result = await page.evaluate(() => rn(NaN));
      expect(isNaN(result)).toBe(true);
    });

    test('should handle Infinity', async ({ page }) => {
      const result = await page.evaluate(() => rn(Infinity));
      expect(result).toBe(Infinity);
    });
  });

  test.describe('clamp() - Constrain value', () => {
    test('should clamp value within range', async ({ page }) => {
      const result = await page.evaluate(() => clamp(5, 0, 10));
      expect(result).toBe(5);
    });

    test('should clamp value below minimum', async ({ page }) => {
      const result = await page.evaluate(() => clamp(-5, 0, 10));
      expect(result).toBe(0);
    });

    test('should clamp value above maximum', async ({ page }) => {
      const result = await page.evaluate(() => clamp(15, 0, 10));
      expect(result).toBe(10);
    });

    test('should handle min === max', async ({ page }) => {
      const result = await page.evaluate(() => clamp(5, 5, 5));
      expect(result).toBe(5);
    });
  });

  // Continue for all functions in numberUtils.js...
});
```

---

## Test Count Per Module (Complete Breakdown)

Given the massive scope, here's a detailed summary document showing all planned tests rather than creating 520 individual test files in this conversation.

I'll create a master implementation checklist you can follow.

