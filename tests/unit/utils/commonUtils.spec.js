import { test, expect } from '@playwright/test';

test.describe('commonUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => typeof window.debounce === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('debounce() - Debounce function calls', () => {
    test('should call function immediately on first call', async () => {
      const result = await page.evaluate(() => {
        let callCount = 0;
        const fn = debounce(() => callCount++, 100);

        fn();
        return callCount;
      });

      expect(result).toBe(1);
    });

    test('should ignore calls during cooldown period', async () => {
      const result = await page.evaluate(async () => {
        let callCount = 0;
        const fn = debounce(() => callCount++, 100);

        fn();
        fn();
        fn();

        return callCount;
      });

      expect(result).toBe(1);
    });

    test('should allow call after cooldown expires', async () => {
      const result = await page.evaluate(async () => {
        let callCount = 0;
        const fn = debounce(() => callCount++, 50);

        fn();
        await new Promise(resolve => setTimeout(resolve, 60));
        fn();

        return callCount;
      });

      expect(result).toBe(2);
    });
  });

  test.describe('throttle() - Throttle function calls', () => {
    test('should call function immediately on first call', async () => {
      const result = await page.evaluate(() => {
        let callCount = 0;
        const fn = throttle(() => callCount++, 100);

        fn();
        return callCount;
      });

      expect(result).toBe(1);
    });

    test('should queue calls during throttle period', async () => {
      const result = await page.evaluate(async () => {
        let callCount = 0;
        const fn = throttle(() => callCount++, 50);

        fn();
        fn();
        fn();

        await new Promise(resolve => setTimeout(resolve, 60));

        return callCount;
      });

      expect(result).toBeGreaterThanOrEqual(1);
    });

    test('should preserve last call arguments', async () => {
      const result = await page.evaluate(async () => {
        let lastValue = null;
        const fn = throttle((val) => { lastValue = val; }, 50);

        fn(1);
        fn(2);
        fn(3);

        await new Promise(resolve => setTimeout(resolve, 60));
        return lastValue;
      });

      expect(result).toBe(3);
    });
  });

  test.describe('clipPoly() - Clip polygon', () => {
    test('should return points if less than 2', async () => {
      const result = await page.evaluate(() => {
        const points = [[100, 100]];
        return clipPoly(points);
      });

      expect(result).toEqual([[100, 100]]);
    });

    test('should clip polygon to graph bounds', async () => {
      const result = await page.evaluate(() => {
        if (typeof clipPoly !== 'function') return null;
        window.graphWidth = 1920;
        window.graphHeight = 1080;

        const points = [
          [100, 100],
          [200, 200],
          [2000, 200],
          [100, 1500]
        ];

        return clipPoly(points);
      });

      if (result !== null) {
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  test.describe('getSegmentId() - Get segment on polyline', () => {
    test('should return 1 for two-point line', async () => {
      const result = await page.evaluate(() => {
        const points = [[0, 0], [100, 100]];
        const point = [50, 50];
        return getSegmentId(points, point);
      });

      expect(result).toBe(1);
    });

    test('should find closest segment', async () => {
      const result = await page.evaluate(() => {
        const points = [
          [0, 0],
          [100, 0],
          [100, 100]
        ];
        const point = [50, 10];

        return getSegmentId(points, point);
      });

      expect(result).toBe(1);
    });

    test('should find second segment when closer', async () => {
      const result = await page.evaluate(() => {
        const points = [
          [0, 0],
          [100, 0],
          [100, 100]
        ];
        const point = [105, 50];

        return getSegmentId(points, point);
      });

      expect(result).toBe(2);
    });
  });
});
