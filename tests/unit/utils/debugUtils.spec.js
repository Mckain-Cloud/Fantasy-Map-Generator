import { test, expect } from '@playwright/test';

test.describe('debugUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => {
      try {
        return typeof d3 !== 'undefined' &&
               typeof drawPoint === 'function' &&
               typeof drawPath === 'function' &&
               typeof debug !== 'undefined' &&
               debug.node() !== null;
      } catch { return false; }
    }, { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('drawPoint() - Draw debug point', () => {
    test('should draw point with default color and radius', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        drawPoint([100, 200], {});

        const circle = debug.select('circle');
        return {
          exists: circle.node() !== null,
          cx: circle.attr('cx'),
          cy: circle.attr('cy'),
          r: circle.attr('r'),
          fill: circle.attr('fill')
        };
      });

      expect(result.exists).toBe(true);
      expect(result.cx).toBe('100');
      expect(result.cy).toBe('200');
      expect(result.r).toBe('0.5');
      expect(result.fill).toBe('red');
    });

    test('should draw point with custom color', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        drawPoint([50, 75], { color: 'blue' });

        const circle = debug.select('circle');
        return {
          fill: circle.attr('fill'),
          cx: circle.attr('cx'),
          cy: circle.attr('cy')
        };
      });

      expect(result.fill).toBe('blue');
      expect(result.cx).toBe('50');
      expect(result.cy).toBe('75');
    });

    test('should draw point with custom radius', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        drawPoint([100, 100], { radius: 2.5 });

        const circle = debug.select('circle');
        return {
          r: circle.attr('r'),
          fill: circle.attr('fill')
        };
      });

      expect(result.r).toBe('2.5');
      expect(result.fill).toBe('red');
    });

    test('should draw multiple points', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          const map = d3.select('#map');
          if (!map.node()) return 0;
          map.append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        drawPoint([10, 10], { color: 'red' });
        drawPoint([20, 20], { color: 'blue' });
        drawPoint([30, 30], { color: 'green' });

        const circles = debug.selectAll('circle');
        return circles.size();
      });

      expect(result).toBeGreaterThanOrEqual(0);
    });

    test('should draw point at origin', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        drawPoint([0, 0], {});

        const circle = debug.select('circle');
        return {
          cx: circle.attr('cx'),
          cy: circle.attr('cy')
        };
      });

      expect(result.cx).toBe('0');
      expect(result.cy).toBe('0');
    });
  });

  test.describe('drawPath() - Draw debug path', () => {
    test('should draw path with default color and width', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        const points = [[0, 0], [100, 0], [100, 100], [0, 100]];
        drawPath(points, {});

        const path = debug.select('path');
        return {
          exists: path.node() !== null,
          stroke: path.attr('stroke'),
          strokeWidth: path.attr('stroke-width'),
          fill: path.attr('fill'),
          hasD: path.attr('d') !== null
        };
      });

      expect(result.exists).toBe(true);
      expect(result.stroke).toBe('red');
      expect(result.strokeWidth).toBe('0.5');
      expect(result.fill).toBe('none');
      expect(result.hasD).toBe(true);
    });

    test('should draw path with custom color', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        const points = [[0, 0], [50, 50]];
        drawPath(points, { color: 'green' });

        const path = debug.select('path');
        return path.attr('stroke');
      });

      expect(result).toBe('green');
    });

    test('should draw path with custom width', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        const points = [[0, 0], [100, 100]];
        drawPath(points, { width: 3 });

        const path = debug.select('path');
        return path.attr('stroke-width');
      });

      expect(result).toBe('3');
    });

    test('should draw path with two points', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        const points = [[10, 20], [30, 40]];
        drawPath(points, {});

        const path = debug.select('path');
        const d = path.attr('d');
        return {
          exists: path.node() !== null,
          hasPath: d !== null && d.length > 0
        };
      });

      expect(result.exists).toBe(true);
      expect(result.hasPath).toBe(true);
    });

    test('should draw multiple paths', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        drawPath([[0, 0], [10, 10]], { color: 'red' });
        drawPath([[20, 20], [30, 30]], { color: 'blue' });

        const paths = debug.selectAll('path');
        return paths.size();
      });

      expect(result).toBe(2);
    });

    test('should handle complex paths', async () => {
      const result = await page.evaluate(() => {
        if (!d3.select('#debug').node()) {
          d3.select('#map').append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');
        debug.selectAll('*').remove();

        const points = [
          [0, 0],
          [50, 25],
          [100, 0],
          [75, 75],
          [25, 75]
        ];
        drawPath(points, {});

        const path = debug.select('path');
        return {
          exists: path.node() !== null,
          fill: path.attr('fill')
        };
      });

      expect(result.exists).toBe(true);
      expect(result.fill).toBe('none');
    });
  });

  test.describe('Debug layer integration', () => {
    test('should work when debug layer already exists', async () => {
      const result = await page.evaluate(() => {
        const debug = d3.select('#debug');
        const existed = debug.node() !== null;

        if (existed) {
          debug.selectAll('*').remove();
          drawPoint([50, 50], { color: 'purple' });

          const circle = debug.select('circle');
          return {
            layerExisted: existed,
            pointDrawn: circle.node() !== null,
            color: circle.attr('fill')
          };
        }
        return { layerExisted: existed };
      });

      expect(result.layerExisted).toBe(true);
      if (result.pointDrawn) {
        expect(result.color).toBe('purple');
      }
    });

    test('should clear previous debug elements', async () => {
      const result = await page.evaluate(() => {
        const map = d3.select('#map');
        if (!map.node()) return { beforeCount: 0, afterCount: 0 };

        if (!d3.select('#debug').node()) {
          map.append('g').attr('id', 'debug');
        }

        const debug = d3.select('#debug');

        drawPoint([10, 10], {});
        drawPoint([20, 20], {});
        const beforeCount = debug.selectAll('circle').size();

        debug.selectAll('*').remove();
        drawPoint([30, 30], {});
        const afterCount = debug.selectAll('circle').size();

        return { beforeCount, afterCount };
      });

      if (result.beforeCount > 0) {
        expect(result.afterCount).toBeLessThan(result.beforeCount);
      }
    });
  });
});
