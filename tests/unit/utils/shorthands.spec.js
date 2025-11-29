import { test, expect } from '@playwright/test';

test.describe('shorthands.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => {
      try {
        const div = document.createElement('div');
        return typeof byId === 'function' &&
               typeof div.on === 'function' &&
               typeof div.off === 'function';
      } catch { return false; }
    }, { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('byId() - Get element by ID', () => {
    test('should get element by ID', async () => {
      const result = await page.evaluate(() => {
        const elem = byId('map');
        return elem !== null && elem.tagName === 'svg';
      });

      expect(result).toBe(true);
    });

    test('should return null for non-existent ID', async () => {
      const result = await page.evaluate(() => {
        const elem = byId('nonexistent-id-12345');
        return elem;
      });

      expect(result).toBe(null);
    });

    test('should be equivalent to document.getElementById', async () => {
      const result = await page.evaluate(() => {
        const elem1 = byId('map');
        const elem2 = document.getElementById('map');
        return elem1 === elem2;
      });

      expect(result).toBe(true);
    });
  });

  test.describe('Node.prototype.on() - Add event listener', () => {
    test('should add event listener', async () => {
      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        let called = false;

        div.on('click', () => { called = true; });
        div.click();

        return called;
      });

      expect(result).toBe(true);
    });

    test('should return this for chaining', async () => {
      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        const returned = div.on('click', () => {});

        return returned === div;
      });

      expect(result).toBe(true);
    });

    test('should allow multiple listeners on same event', async () => {
      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        let count = 0;

        div.on('click', () => count++);
        div.on('click', () => count++);
        div.click();

        return count;
      });

      expect(result).toBe(2);
    });
  });

  test.describe('Node.prototype.off() - Remove event listener', () => {
    test('should remove event listener', async () => {
      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        let called = false;
        const handler = () => { called = true; };

        div.on('click', handler);
        div.off('click', handler);
        div.click();

        return called;
      });

      expect(result).toBe(false);
    });

    test('should return this for chaining', async () => {
      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        const handler = () => {};
        div.on('click', handler);

        const returned = div.off('click', handler);
        return returned === div;
      });

      expect(result).toBe(true);
    });
  });
});
