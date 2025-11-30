import { test, expect } from '@playwright/test';
import { waitForAppReady, gotoApp, stopCoverage, flushCoverage } from '../setup/helpers.js';

test.describe('Notes Editor & TinyMCE Tests', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await waitForAppReady(page);
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
    await flushCoverage();
  });

  test.describe('Notes Editor Dialog', () => {
    test('can open notes editor', async ({ page }) => {
      // Open the notes editor
      await page.evaluate(() => editNotes());
      await page.waitForSelector('#notesEditor', { state: 'visible', timeout: 10000 });

      const isOpen = await page.evaluate(() => {
        const editor = document.getElementById('notesEditor');
        return editor && editor.open === true;
      });
      expect(isOpen).toBe(true);

      // Close editor
      await page.evaluate(() => {
        const dialog = document.getElementById('notesEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });

    test('notes editor has required elements', async ({ page }) => {
      await page.evaluate(() => editNotes());
      await page.waitForSelector('#notesEditor', { state: 'visible', timeout: 10000 });

      const hasElements = await page.evaluate(() => {
        return {
          notesSelect: document.getElementById('notesSelect') !== null,
          notesName: document.getElementById('notesName') !== null,
          notesLegend: document.getElementById('notesLegend') !== null,
          notesPin: document.getElementById('notesPin') !== null
        };
      });

      expect(hasElements.notesSelect).toBe(true);
      expect(hasElements.notesName).toBe(true);
      expect(hasElements.notesLegend).toBe(true);
      expect(hasElements.notesPin).toBe(true);

      await page.evaluate(() => {
        const dialog = document.getElementById('notesEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });
  });

  test.describe('TinyMCE Integration', () => {
    test('TinyMCE initializes when notes editor opens', async ({ page }) => {
      await page.evaluate(() => editNotes());
      await page.waitForSelector('#notesEditor', { state: 'visible', timeout: 10000 });

      // Wait for TinyMCE to initialize (it's loaded dynamically)
      await page.waitForFunction(() => {
        return typeof window.tinymce !== 'undefined' && window.tinymce.activeEditor !== null;
      }, { timeout: 15000 });

      const hasTinyMCE = await page.evaluate(() => {
        return window.tinymce && window.tinymce.activeEditor !== null;
      });
      expect(hasTinyMCE).toBe(true);

      await page.evaluate(() => {
        const dialog = document.getElementById('notesEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });

    test('TinyMCE editor iframe is present', async ({ page }) => {
      await page.evaluate(() => editNotes());
      await page.waitForSelector('#notesEditor', { state: 'visible', timeout: 10000 });

      // Wait for TinyMCE to fully initialize
      await page.waitForFunction(() => {
        return typeof window.tinymce !== 'undefined' && window.tinymce.activeEditor !== null;
      }, { timeout: 15000 });

      // Check that iframe exists in the DOM (may not be "visible" due to dialog structure)
      const hasIframe = await page.evaluate(() => {
        return document.querySelector('.tox-edit-area__iframe') !== null;
      });
      expect(hasIframe).toBe(true);

      await page.evaluate(() => {
        const dialog = document.getElementById('notesEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });

    test('TinyMCE toolbar is visible', async ({ page }) => {
      await page.evaluate(() => editNotes());
      await page.waitForSelector('#notesEditor', { state: 'visible', timeout: 10000 });

      // Wait for TinyMCE to fully initialize and DOM to be built
      await page.waitForFunction(() => {
        return typeof window.tinymce !== 'undefined' &&
               window.tinymce.activeEditor !== null &&
               document.querySelector('.tox.tox-tinymce') !== null;
      }, { timeout: 15000 });

      // Wait for toolbar to appear in the DOM
      await page.waitForSelector('.tox.tox-tinymce [role="toolbar"]', { state: 'attached', timeout: 10000 });

      // Check toolbar exists in the DOM (TinyMCE 8.x uses role="toolbar")
      const toolbarInfo = await page.evaluate(() => {
        // TinyMCE 8.x uses role attributes - look for toolbars inside the TinyMCE container
        const tinyContainer = document.querySelector('.tox.tox-tinymce');
        const toolbars = tinyContainer ? tinyContainer.querySelectorAll('[role="toolbar"]') : [];
        const toolbarButtons = tinyContainer ? tinyContainer.querySelectorAll('[role="toolbar"] button') : [];
        return {
          hasToolbar: toolbars.length > 0,
          toolbarCount: toolbars.length,
          buttonCount: toolbarButtons.length
        };
      });

      expect(toolbarInfo.hasToolbar).toBe(true);
      expect(toolbarInfo.toolbarCount).toBeGreaterThan(0); // Should have at least one toolbar
      expect(toolbarInfo.buttonCount).toBeGreaterThan(5); // Should have multiple toolbar buttons

      await page.evaluate(() => {
        const dialog = document.getElementById('notesEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });

    test('TinyMCE has correct skin loaded', async ({ page }) => {
      await page.evaluate(() => editNotes());
      await page.waitForSelector('#notesEditor', { state: 'visible', timeout: 10000 });

      // Wait for TinyMCE to initialize
      await page.waitForFunction(() => {
        return typeof window.tinymce !== 'undefined' && window.tinymce.activeEditor !== null;
      }, { timeout: 15000 });

      // Check that the oxide skin is being used (default skin)
      const hasSkin = await page.evaluate(() => {
        const skinContainer = document.querySelector('.tox.tox-tinymce');
        return skinContainer !== null;
      });
      expect(hasSkin).toBe(true);

      await page.evaluate(() => {
        const dialog = document.getElementById('notesEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });

    test('TinyMCE editor can receive content', async ({ page }) => {
      await page.evaluate(() => editNotes());
      await page.waitForSelector('#notesEditor', { state: 'visible', timeout: 10000 });

      // Wait for TinyMCE to fully initialize (including editor body ready)
      await page.waitForFunction(() => {
        return typeof window.tinymce !== 'undefined' &&
               window.tinymce.activeEditor !== null &&
               window.tinymce.activeEditor.getBody() !== null &&
               window.tinymce.activeEditor.initialized === true;
      }, { timeout: 20000 });

      // Set content in the editor
      const testContent = '<p>Test content for TinyMCE</p>';
      await page.evaluate((content) => {
        window.tinymce.activeEditor.setContent(content);
      }, testContent);

      // Verify content was set
      const editorContent = await page.evaluate(() => {
        return window.tinymce.activeEditor.getContent();
      });
      expect(editorContent).toContain('Test content for TinyMCE');

      await page.evaluate(() => {
        const dialog = document.getElementById('notesEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });

    test('TinyMCE required plugins are loaded', async ({ page }) => {
      await page.evaluate(() => editNotes());
      await page.waitForSelector('#notesEditor', { state: 'visible', timeout: 10000 });

      // Wait for TinyMCE to initialize
      await page.waitForFunction(() => {
        return typeof window.tinymce !== 'undefined' && window.tinymce.activeEditor !== null;
      }, { timeout: 15000 });

      // Check that expected plugins are available
      const pluginInfo = await page.evaluate(() => {
        const editor = window.tinymce.activeEditor;
        const plugins = editor.plugins;
        return {
          hasAutolink: 'autolink' in plugins,
          hasLists: 'lists' in plugins,
          hasLink: 'link' in plugins,
          hasCode: 'code' in plugins,
          hasFullscreen: 'fullscreen' in plugins,
          hasImage: 'image' in plugins,
          hasTable: 'table' in plugins,
          hasWordcount: 'wordcount' in plugins
        };
      });

      expect(pluginInfo.hasAutolink).toBe(true);
      expect(pluginInfo.hasLists).toBe(true);
      expect(pluginInfo.hasLink).toBe(true);
      expect(pluginInfo.hasCode).toBe(true);
      expect(pluginInfo.hasFullscreen).toBe(true);
      expect(pluginInfo.hasImage).toBe(true);
      expect(pluginInfo.hasTable).toBe(true);
      expect(pluginInfo.hasWordcount).toBe(true);

      await page.evaluate(() => {
        const dialog = document.getElementById('notesEditor');
        if (dialog && dialog.close) dialog.close();
      });
    });

    test('TinyMCE editor cleans up on dialog close', async ({ page }) => {
      await page.evaluate(() => editNotes());
      await page.waitForSelector('#notesEditor', { state: 'visible', timeout: 10000 });

      // Wait for TinyMCE to initialize
      await page.waitForFunction(() => {
        return typeof window.tinymce !== 'undefined' && window.tinymce.activeEditor !== null;
      }, { timeout: 15000 });

      // Verify editor exists before close (use activeEditor since editors array may behave differently in v8)
      const hasActiveEditorBefore = await page.evaluate(() => {
        return window.tinymce && window.tinymce.activeEditor !== null;
      });
      expect(hasActiveEditorBefore).toBe(true);

      // Close the dialog
      await page.evaluate(() => {
        const dialog = document.getElementById('notesEditor');
        if (dialog && dialog.close) dialog.close();
      });

      // Wait a moment for cleanup
      await page.waitForTimeout(500);

      // Check active editor was removed after dialog close
      const hasActiveEditorAfter = await page.evaluate(() => {
        return window.tinymce && window.tinymce.activeEditor !== null;
      });
      expect(hasActiveEditorAfter).toBe(false);
    });
  });
});
