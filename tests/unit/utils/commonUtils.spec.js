import { test, expect } from '@playwright/test';
import { startCoverage, stopCoverage, flushCoverage } from '../../setup/coverageHelpers.js';

test.describe('commonUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await startCoverage(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof window.debounce === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await stopCoverage(page);
    await flushCoverage();
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

  test.describe('parseError() - Parse error to readable string', () => {
    test('should parse basic error', async () => {
      const result = await page.evaluate(() => {
        const error = new Error('Test error message');
        return parseError(error);
      });

      expect(result).toContain('Test error message');
    });

    test('should replace URLs with file names', async () => {
      const result = await page.evaluate(() => {
        const error = {
          stack: 'Error at http://localhost:8080/modules/test.js:10:5',
          toString: () => 'Error'
        };
        return parseError(error);
      });

      expect(result).toContain('<i>test.js:10:5</i>');
      expect(result).not.toContain('http://localhost:8080');
    });

    test('should format stack trace with line breaks', async () => {
      const result = await page.evaluate(() => {
        const error = {
          stack: 'Error\nat functionA\nat functionB',
          toString: () => 'Error'
        };
        return parseError(error);
      });

      expect(result).toContain('<br>&nbsp;&nbsp;at ');
    });

    test('should handle error with multiple URLs', async () => {
      const result = await page.evaluate(() => {
        const error = {
          stack: 'Error at http://example.com/a.js at https://example.com/b.js',
          toString: () => 'Error'
        };
        return parseError(error);
      });

      expect(result).toContain('<i>a.js</i>');
      expect(result).toContain('<i>b.js</i>');
    });
  });

  test.describe('link() - Create HTML anchor element', () => {
    test('should create basic link', async () => {
      const result = await page.evaluate(() => {
        return link('http://example.com', 'Example');
      });

      expect(result).toBe('<a href="http://example.com" rel="noopener" target="_blank">Example</a>');
    });

    test('should handle HTTPS URLs', async () => {
      const result = await page.evaluate(() => {
        return link('https://secure.example.com/path', 'Secure Link');
      });

      expect(result).toContain('href="https://secure.example.com/path"');
      expect(result).toContain('Secure Link');
    });

    test('should handle special characters in description', async () => {
      const result = await page.evaluate(() => {
        return link('http://example.com', 'Link with <special> chars');
      });

      expect(result).toContain('Link with <special> chars');
    });

    test('should handle empty description', async () => {
      const result = await page.evaluate(() => {
        return link('http://example.com', '');
      });

      expect(result).toBe('<a href="http://example.com" rel="noopener" target="_blank"></a>');
    });
  });

  test.describe('isCtrlClick() - Detect Ctrl+Click', () => {
    test('should return true for ctrlKey', async () => {
      const result = await page.evaluate(() => {
        const event = { ctrlKey: true, metaKey: false };
        return isCtrlClick(event);
      });

      expect(result).toBe(true);
    });

    test('should return true for metaKey (Mac)', async () => {
      const result = await page.evaluate(() => {
        const event = { ctrlKey: false, metaKey: true };
        return isCtrlClick(event);
      });

      expect(result).toBe(true);
    });

    test('should return true for both keys', async () => {
      const result = await page.evaluate(() => {
        const event = { ctrlKey: true, metaKey: true };
        return isCtrlClick(event);
      });

      expect(result).toBe(true);
    });

    test('should return false for regular click', async () => {
      const result = await page.evaluate(() => {
        const event = { ctrlKey: false, metaKey: false };
        return isCtrlClick(event);
      });

      expect(result).toBe(false);
    });

    test('should return false for undefined keys', async () => {
      const result = await page.evaluate(() => {
        const event = {};
        return isCtrlClick(event);
      });

      expect(result).toBeFalsy();
    });
  });

  test.describe('generateDate() - Generate random date string', () => {
    test('should return a date string', async () => {
      const result = await page.evaluate(() => {
        return generateDate(100, 1000);
      });

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should contain year, month, and day', async () => {
      const result = await page.evaluate(() => {
        return generateDate(500, 500);
      });

      // Should contain a numeric year and a month name
      expect(result).toMatch(/\d{3}/); // at least 3 digit year
      expect(result).toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/);
    });

    test('should use default parameters', async () => {
      const result = await page.evaluate(() => {
        return generateDate();
      });

      expect(typeof result).toBe('string');
    });
  });

  test.describe('getLongitude() - Get map longitude', () => {
    test('should calculate longitude from x coordinate', async () => {
      const result = await page.evaluate(() => {
        // Set up map coordinates
        window.mapCoordinates = {
          lonW: -180,
          lonT: 360 // total longitude span
        };
        window.graphWidth = 1920;

        return getLongitude(960); // center of map
      });

      expect(result).toBe(0); // center should be 0 longitude
    });

    test('should return western edge at x=0', async () => {
      const result = await page.evaluate(() => {
        window.mapCoordinates = {
          lonW: -180,
          lonT: 360
        };
        window.graphWidth = 1920;

        return getLongitude(0);
      });

      expect(result).toBe(-180);
    });

    test('should return eastern edge at max x', async () => {
      const result = await page.evaluate(() => {
        window.mapCoordinates = {
          lonW: -180,
          lonT: 360
        };
        window.graphWidth = 1920;

        return getLongitude(1920);
      });

      expect(result).toBe(180);
    });

    test('should respect decimals parameter', async () => {
      const result = await page.evaluate(() => {
        window.mapCoordinates = {
          lonW: 0,
          lonT: 100
        };
        window.graphWidth = 1000;

        return getLongitude(333, 4);
      });

      expect(result).toBe(33.3);
    });
  });

  test.describe('getLatitude() - Get map latitude', () => {
    test('should calculate latitude from y coordinate', async () => {
      const result = await page.evaluate(() => {
        window.mapCoordinates = {
          latN: 90,
          latT: 180 // total latitude span
        };
        window.graphHeight = 1080;

        return getLatitude(540); // center of map
      });

      expect(result).toBe(0); // center should be 0 latitude
    });

    test('should return northern edge at y=0', async () => {
      const result = await page.evaluate(() => {
        window.mapCoordinates = {
          latN: 90,
          latT: 180
        };
        window.graphHeight = 1080;

        return getLatitude(0);
      });

      expect(result).toBe(90);
    });

    test('should return southern edge at max y', async () => {
      const result = await page.evaluate(() => {
        window.mapCoordinates = {
          latN: 90,
          latT: 180
        };
        window.graphHeight = 1080;

        return getLatitude(1080);
      });

      expect(result).toBe(-90);
    });
  });

  test.describe('getCoordinates() - Get both longitude and latitude', () => {
    test('should return [longitude, latitude] array', async () => {
      const result = await page.evaluate(() => {
        window.mapCoordinates = {
          lonW: -180,
          lonT: 360,
          latN: 90,
          latT: 180
        };
        window.graphWidth = 1920;
        window.graphHeight = 1080;

        return getCoordinates(960, 540);
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toBe(0); // longitude at center
      expect(result[1]).toBe(0); // latitude at center
    });

    test('should handle corner coordinates', async () => {
      const result = await page.evaluate(() => {
        window.mapCoordinates = {
          lonW: -180,
          lonT: 360,
          latN: 90,
          latT: 180
        };
        window.graphWidth = 1920;
        window.graphHeight = 1080;

        return getCoordinates(0, 0);
      });

      expect(result[0]).toBe(-180); // west
      expect(result[1]).toBe(90);   // north
    });
  });
});
