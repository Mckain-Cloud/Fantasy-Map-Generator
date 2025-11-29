import { test, expect } from '@playwright/test';

test.describe('nodeUtils.js', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page.waitForFunction(() => typeof window.getNextId === 'function', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('getComposedPath() - Get event path polyfill', () => {
    test('should return path with single node', async () => {
      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        const path = getComposedPath(div);
        return path.length;
      });
      expect(result).toBeGreaterThan(0);
    });

    test('should return path including parent nodes', async () => {
      const result = await page.evaluate(() => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        parent.appendChild(child);
        document.body.appendChild(parent);

        const path = getComposedPath(child);
        const hasChild = path[0] === child;
        const hasParent = path.includes(parent);

        document.body.removeChild(parent);

        return { length: path.length, hasChild, hasParent };
      });
      expect(result.hasChild).toBe(true);
      expect(result.hasParent).toBe(true);
      expect(result.length).toBeGreaterThan(2);
    });

    test('should include document and window', async () => {
      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        document.body.appendChild(div);

        const path = getComposedPath(div);
        const hasDocument = path.some(node => node === document);
        const hasWindow = path.some(node => node === window);

        document.body.removeChild(div);

        return { hasDocument, hasWindow };
      });
      expect(result.hasDocument).toBe(true);
      expect(result.hasWindow).toBe(true);
    });

    test('should handle deeply nested elements', async () => {
      const result = await page.evaluate(() => {
        const root = document.createElement('div');
        const level1 = document.createElement('div');
        const level2 = document.createElement('div');
        const level3 = document.createElement('div');

        root.appendChild(level1);
        level1.appendChild(level2);
        level2.appendChild(level3);
        document.body.appendChild(root);

        const path = getComposedPath(level3);
        const indices = {
          level3: path.indexOf(level3),
          level2: path.indexOf(level2),
          level1: path.indexOf(level1),
          root: path.indexOf(root)
        };

        document.body.removeChild(root);

        return indices;
      });
      expect(result.level3).toBe(0);
      expect(result.level2).toBe(1);
      expect(result.level1).toBe(2);
      expect(result.root).toBe(3);
    });

    test('should handle detached nodes', async () => {
      const result = await page.evaluate(() => {
        const div = document.createElement('div');
        const path = getComposedPath(div);
        return path.length;
      });
      expect(result).toBe(1);
    });
  });

  test.describe('getNextId() - Get next unused ID', () => {
    test('should return core + number if no element exists', async () => {
      const result = await page.evaluate(() => {
        const uniqueCore = 'testElement' + Date.now();
        return getNextId(uniqueCore);
      });
      expect(result).toMatch(/testElement\d+/);
    });

    test('should return next number if element exists', async () => {
      const result = await page.evaluate(() => {
        const elem1 = document.createElement('div');
        elem1.id = 'testElem1';
        document.body.appendChild(elem1);

        const nextId = getNextId('testElem');

        document.body.removeChild(elem1);

        return nextId;
      });
      expect(result).toBe('testElem2');
    });

    test('should skip multiple existing IDs', async () => {
      const result = await page.evaluate(() => {
        const elem1 = document.createElement('div');
        const elem2 = document.createElement('div');
        const elem3 = document.createElement('div');
        elem1.id = 'skipTest1';
        elem2.id = 'skipTest2';
        elem3.id = 'skipTest3';
        document.body.appendChild(elem1);
        document.body.appendChild(elem2);
        document.body.appendChild(elem3);

        const nextId = getNextId('skipTest');

        document.body.removeChild(elem1);
        document.body.removeChild(elem2);
        document.body.removeChild(elem3);

        return nextId;
      });
      expect(result).toBe('skipTest4');
    });

    test('should handle gaps in sequence', async () => {
      const result = await page.evaluate(() => {
        const uniquePrefix = 'gapTest' + Date.now();
        const elem1 = document.createElement('div');
        const elem3 = document.createElement('div');
        elem1.id = uniquePrefix + '1';
        elem3.id = uniquePrefix + '3';
        document.body.appendChild(elem1);
        document.body.appendChild(elem3);

        const nextId = getNextId(uniquePrefix);

        document.body.removeChild(elem1);
        document.body.removeChild(elem3);

        return nextId;
      });
      expect(result).toMatch(/gapTest\d+\d+/);
    });

    test('should handle custom starting index', async () => {
      const result = await page.evaluate(() => {
        return getNextId('customStart', 10);
      });
      expect(result).toBe('customStart10');
    });

    test('should increment from custom starting index', async () => {
      const result = await page.evaluate(() => {
        const elem5 = document.createElement('div');
        elem5.id = 'customInc5';
        document.body.appendChild(elem5);

        const nextId = getNextId('customInc', 5);

        document.body.removeChild(elem5);

        return nextId;
      });
      expect(result).toBe('customInc6');
    });

    test('should handle numeric core names', async () => {
      const result = await page.evaluate(() => {
        return getNextId('123');
      });
      expect(result).toMatch(/^123/);
    });

    test('should handle empty core name', async () => {
      const result = await page.evaluate(() => {
        return getNextId('');
      });
      expect(result).toBe('1');
    });
  });

  test.describe('getAbsolutePath() - Convert to absolute URL', () => {
    test('should return absolute path for relative URL', async () => {
      const result = await page.evaluate(() => {
        return getAbsolutePath('test.html');
      });
      expect(result).toMatch(/^https?:\/\//);
      expect(result).toContain('test.html');
    });

    test('should preserve absolute URLs', async () => {
      const result = await page.evaluate(() => {
        return getAbsolutePath('https://example.com/test.html');
      });
      expect(result).toBe('https://example.com/test.html');
    });

    test('should handle paths with directories', async () => {
      const result = await page.evaluate(() => {
        return getAbsolutePath('path/to/file.html');
      });
      expect(result).toMatch(/^https?:\/\//);
      expect(result).toContain('path/to/file.html');
    });

    test('should handle root-relative paths', async () => {
      const result = await page.evaluate(() => {
        return getAbsolutePath('/absolute/path.html');
      });
      expect(result).toMatch(/^https?:\/\//);
      expect(result).toContain('/absolute/path.html');
    });

    test('should handle empty string', async () => {
      const result = await page.evaluate(() => {
        return getAbsolutePath('');
      });
      expect(typeof result).toBe('string');
    });

    test('should handle null/undefined', async () => {
      const result = await page.evaluate(() => {
        return {
          fromNull: getAbsolutePath(null),
          fromUndefined: getAbsolutePath(undefined)
        };
      });
      expect(result.fromNull).toBe('');
      expect(result.fromUndefined).toBe('');
    });

    test('should handle query strings', async () => {
      const result = await page.evaluate(() => {
        return getAbsolutePath('test.html?param=value');
      });
      expect(result).toMatch(/^https?:\/\//);
      expect(result).toContain('test.html?param=value');
    });

    test('should handle URL fragments', async () => {
      const result = await page.evaluate(() => {
        return getAbsolutePath('test.html#section');
      });
      expect(result).toMatch(/^https?:\/\//);
      expect(result).toContain('test.html#section');
    });

    test('should handle protocol-relative URLs', async () => {
      const result = await page.evaluate(() => {
        return getAbsolutePath('//example.com/test.html');
      });
      expect(result).toMatch(/^https?:\/\/example\.com\/test\.html/);
    });

    test('should handle data URLs', async () => {
      const result = await page.evaluate(() => {
        return getAbsolutePath('data:text/plain;base64,SGVsbG8=');
      });
      expect(result).toBe('data:text/plain;base64,SGVsbG8=');
    });
  });

  test.describe('removeParent() - Remove parent element', () => {
    test('should remove parent element when called on child', async () => {
      const result = await page.evaluate(() => {
        const parent = document.createElement('div');
        const child = document.createElement('button');
        parent.appendChild(child);
        document.body.appendChild(parent);

        removeParent.call(child);

        const parentExists = document.body.contains(parent);
        return parentExists;
      });
      expect(result).toBe(false);
    });

    test('should handle nested structure', async () => {
      const result = await page.evaluate(() => {
        const grandparent = document.createElement('div');
        const parent = document.createElement('div');
        const child = document.createElement('span');

        grandparent.appendChild(parent);
        parent.appendChild(child);
        document.body.appendChild(grandparent);

        removeParent.call(child);

        const grandparentExists = document.body.contains(grandparent);
        const parentExists = document.body.contains(parent);

        if (grandparentExists) document.body.removeChild(grandparent);

        return { grandparentExists, parentExists };
      });
      expect(result.grandparentExists).toBe(true);
      expect(result.parentExists).toBe(false);
    });

    test('should remove correct parent with multiple siblings', async () => {
      const result = await page.evaluate(() => {
        const container = document.createElement('div');
        const parent1 = document.createElement('div');
        const parent2 = document.createElement('div');
        const child1 = document.createElement('button');
        const child2 = document.createElement('button');

        parent1.appendChild(child1);
        parent2.appendChild(child2);
        container.appendChild(parent1);
        container.appendChild(parent2);
        document.body.appendChild(container);

        removeParent.call(child1);

        const parent1Exists = container.contains(parent1);
        const parent2Exists = container.contains(parent2);

        document.body.removeChild(container);

        return { parent1Exists, parent2Exists };
      });
      expect(result.parent1Exists).toBe(false);
      expect(result.parent2Exists).toBe(true);
    });
  });
});
