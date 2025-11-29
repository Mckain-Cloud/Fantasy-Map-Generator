/**
 * Mock Helpers for Testing
 * Provides mocks for AI API calls, storage, and random number generation
 */

import { MOCK_AI_RESPONSES } from './fixtures.js';

/**
 * Mock AI API calls to avoid real API usage in tests
 */
export class MockAI {
  static install(page) {
    return page.addInitScript(() => {
      window.__mockAI = {
        enabled: true,
        responses: {},
        callCount: 0,

        addResponse(promptPattern, response) {
          this.responses[promptPattern] = response;
        },

        getResponse(prompt) {
          // Check for pattern matches
          for (const [pattern, response] of Object.entries(this.responses)) {
            if (prompt.includes(pattern)) {
              this.callCount++;
              return response;
            }
          }
          return null;
        }
      };

      // Override generateWithAi if it exists
      const originalGenerateWithAi = window.generateWithAi;
      window.generateWithAi = function(prompt, callback, entity, preset) {
        if (window.__mockAI && window.__mockAI.enabled) {
          const mockResponse = window.__mockAI.getResponse(prompt);
          if (mockResponse) {
            // Simulate async
            setTimeout(() => callback(mockResponse), 10);
            return;
          }
        }

        // Fall through to original if no mock
        if (originalGenerateWithAi) {
          originalGenerateWithAi(prompt, callback, entity, preset);
        } else {
          callback('No AI available');
        }
      };
    });
  }

  static async addResponse(page, pattern, response) {
    await page.evaluate(([p, r]) => {
      window.__mockAI.addResponse(p, r);
    }, [pattern, response]);
  }

  static async enable(page) {
    await page.evaluate(() => {
      window.__mockAI.enabled = true;
    });
  }

  static async disable(page) {
    await page.evaluate(() => {
      window.__mockAI.enabled = false;
    });
  }

  static async getCallCount(page) {
    return page.evaluate(() => window.__mockAI.callCount);
  }

  static async reset(page) {
    await page.evaluate(() => {
      window.__mockAI.callCount = 0;
      window.__mockAI.responses = {};
    });
  }
}

/**
 * Mock IndexedDB storage to avoid browser persistence in tests
 */
export class MockStorage {
  static install(page) {
    return page.addInitScript(() => {
      window.__mockStorage = {
        storage: new Map(),
        enabled: true
      };

      // Override ldb (indexedDB wrapper)
      window.ldb = {
        async get(key) {
          if (window.__mockStorage.enabled) {
            return window.__mockStorage.storage.get(key);
          }
          throw new Error('Storage disabled');
        },

        async set(key, value) {
          if (window.__mockStorage.enabled) {
            window.__mockStorage.storage.set(key, value);
            return;
          }
          throw new Error('Storage disabled');
        },

        async del(key) {
          if (window.__mockStorage.enabled) {
            window.__mockStorage.storage.delete(key);
            return;
          }
          throw new Error('Storage disabled');
        },

        async clear() {
          if (window.__mockStorage.enabled) {
            window.__mockStorage.storage.clear();
            return;
          }
        }
      };
    });
  }

  static async get(page, key) {
    return page.evaluate((k) => {
      return window.__mockStorage.storage.get(k);
    }, key);
  }

  static async set(page, key, value) {
    await page.evaluate(([k, v]) => {
      window.__mockStorage.storage.set(k, v);
    }, [key, value]);
  }

  static async clear(page) {
    await page.evaluate(() => {
      window.__mockStorage.storage.clear();
    });
  }
}

/**
 * Mock random number generator for deterministic tests
 */
export class MockRandom {
  static install(page, sequence = [0.5]) {
    return page.addInitScript((seq) => {
      window.__mockRandom = {
        sequence: seq,
        index: 0,
        enabled: false,
        original: Math.random
      };

      // Save original
      window.__mockRandom.originalRandom = Math.random;

      // Replace Math.random
      Math.random = function() {
        if (window.__mockRandom.enabled) {
          const value = window.__mockRandom.sequence[window.__mockRandom.index];
          window.__mockRandom.index = (window.__mockRandom.index + 1) % window.__mockRandom.sequence.length;
          return value;
        }
        return window.__mockRandom.originalRandom();
      };
    }, sequence);
  }

  static async enable(page) {
    await page.evaluate(() => {
      window.__mockRandom.enabled = true;
      window.__mockRandom.index = 0;
    });
  }

  static async disable(page) {
    await page.evaluate(() => {
      window.__mockRandom.enabled = false;
    });
  }

  static async setSequence(page, sequence) {
    await page.evaluate((seq) => {
      window.__mockRandom.sequence = seq;
      window.__mockRandom.index = 0;
    }, sequence);
  }
}

/**
 * Mock console to capture errors/warnings in tests
 */
export class MockConsole {
  static async captureErrors(page) {
    const errors = [];
    const warnings = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    return { errors, warnings };
  }
}

/**
 * Mock network requests (for AI API calls if testing without mocks)
 */
export class MockNetwork {
  static async interceptAI(page) {
    await page.route('https://api.openai.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: { content: MOCK_AI_RESPONSES.worldBuild } }]
        })
      });
    });

    await page.route('https://api.anthropic.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ text: MOCK_AI_RESPONSES.worldBuild }]
        })
      });
    });
  }

  static async blockExternal(page) {
    // Block all external requests except localhost
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
        await route.continue();
      } else {
        await route.abort();
      }
    });
  }
}
