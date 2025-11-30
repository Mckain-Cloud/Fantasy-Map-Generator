import { test, expect } from '@playwright/test';
import { waitForAppReady, startCoverage, stopCoverage, flushCoverage } from '../../setup/helpers.js';

test.describe('UI Measurers module', () => {
  test.beforeEach(async ({ page }) => {
    await startCoverage(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Rulers class', () => {
    test('should have Rulers class on window', async ({ page }) => {
      const result = await page.evaluate(() => typeof Rulers === 'function');
      expect(result).toBe(true);
    });

    test('should have rulers instance', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers === 'object');
      expect(result).toBe(true);
    });

    test('rulers should have data array', async ({ page }) => {
      const result = await page.evaluate(() => Array.isArray(rulers.data));
      expect(result).toBe(true);
    });

    test('rulers should have create method', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers.create === 'function');
      expect(result).toBe(true);
    });

    test('rulers should have toString method', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers.toString === 'function');
      expect(result).toBe(true);
    });

    test('rulers should have fromString method', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers.fromString === 'function');
      expect(result).toBe(true);
    });

    test('rulers should have draw method', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers.draw === 'function');
      expect(result).toBe(true);
    });

    test('rulers should have undraw method', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers.undraw === 'function');
      expect(result).toBe(true);
    });

    test('rulers should have remove method', async ({ page }) => {
      const result = await page.evaluate(() => typeof rulers.remove === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Ruler class', () => {
    test('should have Ruler class on window', async ({ page }) => {
      const result = await page.evaluate(() => typeof Ruler === 'function');
      expect(result).toBe(true);
    });

    test('Ruler should have prototype methods', async ({ page }) => {
      const result = await page.evaluate(() => ({
        hasGetPointsString: typeof Ruler.prototype.getPointsString === 'function',
        hasUpdatePoint: typeof Ruler.prototype.updatePoint === 'function',
        hasGetPointId: typeof Ruler.prototype.getPointId === 'function',
        hasPushPoint: typeof Ruler.prototype.pushPoint === 'function',
        hasDraw: typeof Ruler.prototype.draw === 'function',
        hasDrawPoints: typeof Ruler.prototype.drawPoints === 'function',
        hasIsEdge: typeof Ruler.prototype.isEdge === 'function',
        hasUpdateLabel: typeof Ruler.prototype.updateLabel === 'function',
        hasGetLength: typeof Ruler.prototype.getLength === 'function'
      }));
      expect(result.hasGetPointsString).toBe(true);
      expect(result.hasUpdatePoint).toBe(true);
      expect(result.hasGetPointId).toBe(true);
      expect(result.hasPushPoint).toBe(true);
      expect(result.hasDraw).toBe(true);
      expect(result.hasDrawPoints).toBe(true);
      expect(result.hasIsEdge).toBe(true);
      expect(result.hasUpdateLabel).toBe(true);
      expect(result.hasGetLength).toBe(true);
    });
  });

  test.describe('Opisometer class', () => {
    test('should have Opisometer class on window', async ({ page }) => {
      const result = await page.evaluate(() => typeof Opisometer === 'function');
      expect(result).toBe(true);
    });

    test('Opisometer should have prototype methods', async ({ page }) => {
      const result = await page.evaluate(() => ({
        hasDraw: typeof Opisometer.prototype.draw === 'function',
        hasUpdateCurve: typeof Opisometer.prototype.updateCurve === 'function',
        hasUpdateLabel: typeof Opisometer.prototype.updateLabel === 'function'
      }));
      expect(result.hasDraw).toBe(true);
      expect(result.hasUpdateCurve).toBe(true);
      expect(result.hasUpdateLabel).toBe(true);
    });
  });

  test.describe('RouteOpisometer class', () => {
    test('should have RouteOpisometer class on window', async ({ page }) => {
      const result = await page.evaluate(() => typeof RouteOpisometer === 'function');
      expect(result).toBe(true);
    });

    test('RouteOpisometer should have prototype methods', async ({ page }) => {
      const result = await page.evaluate(() => ({
        hasDraw: typeof RouteOpisometer.prototype.draw === 'function',
        hasUpdateCurve: typeof RouteOpisometer.prototype.updateCurve === 'function',
        hasUpdateLabel: typeof RouteOpisometer.prototype.updateLabel === 'function',
        hasTrackCell: typeof RouteOpisometer.prototype.trackCell === 'function'
      }));
      expect(result.hasDraw).toBe(true);
      expect(result.hasUpdateCurve).toBe(true);
      expect(result.hasUpdateLabel).toBe(true);
      expect(result.hasTrackCell).toBe(true);
    });
  });

  test.describe('Planimeter class', () => {
    test('should have Planimeter class on window', async ({ page }) => {
      const result = await page.evaluate(() => typeof Planimeter === 'function');
      expect(result).toBe(true);
    });

    test('Planimeter should have prototype methods', async ({ page }) => {
      const result = await page.evaluate(() => ({
        hasDraw: typeof Planimeter.prototype.draw === 'function',
        hasUpdateCurve: typeof Planimeter.prototype.updateCurve === 'function',
        hasUpdateLabel: typeof Planimeter.prototype.updateLabel === 'function'
      }));
      expect(result.hasDraw).toBe(true);
      expect(result.hasUpdateCurve).toBe(true);
      expect(result.hasUpdateLabel).toBe(true);
    });
  });

  test.describe('createDefaultRuler function', () => {
    test('should have createDefaultRuler function', async ({ page }) => {
      const result = await page.evaluate(() => typeof createDefaultRuler === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('ruler SVG element', () => {
    test('should have ruler SVG group', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('ruler');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('ruler should be a g element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('ruler');
        return element?.tagName.toLowerCase();
      });
      expect(result).toBe('g');
    });
  });

  test.describe('distanceScale global', () => {
    test('should have distanceScale variable', async ({ page }) => {
      const result = await page.evaluate(() => typeof distanceScale === 'number');
      expect(result).toBe(true);
    });

    test('distanceScale should be positive', async ({ page }) => {
      const result = await page.evaluate(() => distanceScale > 0);
      expect(result).toBe(true);
    });
  });

  test.describe('distanceUnitInput element', () => {
    test('should have distanceUnitInput element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('distanceUnitInput');
        return element !== null;
      });
      expect(result).toBe(true);
    });

    test('distanceUnitInput should have value', async ({ page }) => {
      const result = await page.evaluate(() => {
        const element = document.getElementById('distanceUnitInput');
        return element?.value.length > 0;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Measurer base class methods', () => {
    test('Ruler should inherit toString', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 100]]);
        const str = ruler.toString();
        // After bundling, class names may be minified, so check for colon separator and points
        return typeof str === 'string' && str.includes(':') && str.includes('0,0');
      });
      expect(result).toBe(true);
    });

    test('Ruler should have getSize method', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 100]]);
        return typeof ruler.getSize === 'function';
      });
      expect(result).toBe(true);
    });

    test('Ruler should have getDash method', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 100]]);
        return typeof ruler.getDash === 'function';
      });
      expect(result).toBe(true);
    });

    test('Ruler should have addPoint method', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 100]]);
        return typeof ruler.addPoint === 'function';
      });
      expect(result).toBe(true);
    });

    test('Ruler should have optimize method', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 100]]);
        return typeof ruler.optimize === 'function';
      });
      expect(result).toBe(true);
    });

    test('Ruler should have undraw method', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 100]]);
        return typeof ruler.undraw === 'function';
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Ruler getLength calculation', () => {
    test('should calculate length of horizontal line', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 0]]);
        return ruler.getLength();
      });
      expect(result).toBe(100);
    });

    test('should calculate length of vertical line', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [0, 50]]);
        return ruler.getLength();
      });
      expect(result).toBe(50);
    });

    test('should calculate length of diagonal line', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [30, 40]]);
        return ruler.getLength();
      });
      expect(result).toBe(50); // 3-4-5 triangle
    });

    test('should calculate length of multi-segment line', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 0], [100, 100]]);
        return ruler.getLength();
      });
      expect(result).toBe(200);
    });
  });

  test.describe('Ruler isEdge method', () => {
    test('should return true for first point', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [50, 50], [100, 100]]);
        return ruler.isEdge(0);
      });
      expect(result).toBe(true);
    });

    test('should return false for middle point', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [50, 50], [100, 100]]);
        return ruler.isEdge(1);
      });
      expect(result).toBe(false);
    });

    test('should return true for last point', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [50, 50], [100, 100]]);
        return ruler.isEdge(2);
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Ruler getPointId method', () => {
    test('should find point by coordinates', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[10, 20], [50, 60], [100, 100]]);
        return ruler.getPointId(50, 60);
      });
      expect(result).toBe(1);
    });

    test('should return -1 for non-existent point', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[10, 20], [50, 60], [100, 100]]);
        return ruler.getPointId(999, 999);
      });
      expect(result).toBe(-1);
    });
  });

  test.describe('Ruler updatePoint method', () => {
    test('should update point coordinates', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [50, 50], [100, 100]]);
        ruler.updatePoint(1, 75, 75);
        return ruler.points[1];
      });
      expect(result).toEqual([75, 75]);
    });
  });

  test.describe('Ruler pushPoint method', () => {
    test('should push point to end when index > 0', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 100]]);
        ruler.pushPoint(1);
        return ruler.points.length;
      });
      expect(result).toBe(3);
    });

    test('should unshift point to start when index = 0', async ({ page }) => {
      const result = await page.evaluate(() => {
        const ruler = new Ruler([[0, 0], [100, 100]]);
        ruler.pushPoint(0);
        return ruler.points.length;
      });
      expect(result).toBe(3);
    });
  });

  test.describe('Rulers serialization', () => {
    test('toString should return serialized rulers', async ({ page }) => {
      const result = await page.evaluate(() => {
        rulers.data = [];
        rulers.create(Ruler, [[0, 0], [100, 100]]);
        const str = rulers.toString();
        // After bundling, class names may be minified, so check for colon separator and points
        return typeof str === 'string' && str.includes(':') && str.includes('0,0');
      });
      expect(result).toBe(true);
    });

    test('fromString should parse ruler string', async ({ page }) => {
      const result = await page.evaluate(() => {
        rulers.fromString('Ruler: 0,0 100,100');
        return rulers.data.length;
      });
      expect(result).toBe(1);
    });

    test('fromString should handle multiple rulers', async ({ page }) => {
      const result = await page.evaluate(() => {
        rulers.fromString('Ruler: 0,0 100,100; Ruler: 200,200 300,300');
        return rulers.data.length;
      });
      expect(result).toBe(2);
    });
  });

  test.describe('D3 line generator', () => {
    test('should have lineGen function', async ({ page }) => {
      const result = await page.evaluate(() => typeof lineGen === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('Scale global variable', () => {
    test('should have scale variable', async ({ page }) => {
      const result = await page.evaluate(() => typeof scale === 'number');
      expect(result).toBe(true);
    });

    test('scale should be positive', async ({ page }) => {
      const result = await page.evaluate(() => scale > 0);
      expect(result).toBe(true);
    });
  });

  test.describe('D3 polygon area', () => {
    test('should have d3.polygonArea function', async ({ page }) => {
      const result = await page.evaluate(() => typeof d3.polygonArea === 'function');
      expect(result).toBe(true);
    });

    test('should calculate polygon area', async ({ page }) => {
      const result = await page.evaluate(() => {
        const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
        return Math.abs(d3.polygonArea(square));
      });
      expect(result).toBe(10000);
    });
  });

  test.describe('getArea and getAreaUnit functions', () => {
    test('should have getArea function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getArea === 'function');
      expect(result).toBe(true);
    });

    test('should have getAreaUnit function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getAreaUnit === 'function');
      expect(result).toBe(true);
    });

    test('getArea should return number', async ({ page }) => {
      const result = await page.evaluate(() => {
        const area = getArea(10000);
        return typeof area === 'number';
      });
      expect(result).toBe(true);
    });

    test('getAreaUnit should return string', async ({ page }) => {
      const result = await page.evaluate(() => typeof getAreaUnit() === 'string');
      expect(result).toBe(true);
    });
  });

  test.describe('si function for formatting', () => {
    test('should have si function', async ({ page }) => {
      const result = await page.evaluate(() => typeof si === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('polylabel function', () => {
    test('should have polylabel function', async ({ page }) => {
      const result = await page.evaluate(() => typeof polylabel === 'function');
      expect(result).toBe(true);
    });

    test('polylabel should find center of polygon', async ({ page }) => {
      const result = await page.evaluate(() => {
        const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
        const center = polylabel([square], 1.0);
        return Array.isArray(center) && center.length >= 2;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Default ruler presence', () => {
    test('rulers should have at least one ruler after map generation', async ({ page }) => {
      const result = await page.evaluate(() => rulers.data.length);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    test('default ruler should be a Ruler instance', async ({ page }) => {
      const result = await page.evaluate(() => {
        if (rulers.data.length === 0) return false;
        return rulers.data[0] instanceof Ruler;
      });
      expect(result).toBe(true);
    });
  });

  test.describe('parseTransform helper', () => {
    test('should have parseTransform function', async ({ page }) => {
      const result = await page.evaluate(() => typeof parseTransform === 'function');
      expect(result).toBe(true);
    });
  });

  test.describe('last array helper', () => {
    test('should have last function', async ({ page }) => {
      const result = await page.evaluate(() => typeof last === 'function');
      expect(result).toBe(true);
    });

    test('last should return last element', async ({ page }) => {
      const result = await page.evaluate(() => last([1, 2, 3]));
      expect(result).toBe(3);
    });
  });

  test.describe('getSegmentId helper', () => {
    test('should have getSegmentId function', async ({ page }) => {
      const result = await page.evaluate(() => typeof getSegmentId === 'function');
      expect(result).toBe(true);
    });
  });
});
