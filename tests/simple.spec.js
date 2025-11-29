import { test, expect } from '@playwright/test';
import path from 'path';

const indexPath = `file:///${path.resolve('index.html').replace(/\\/g, '/')}`;

test('simple - no app load', async ({ page }) => {
  console.log('[SIMPLE] Test started');

  // Just go to a blank page
  await page.goto('about:blank');
  console.log('[SIMPLE] Navigated to about:blank');

  expect(true).toBe(true);
  console.log('[SIMPLE] Test completed');
});

test('simple - load index via file://', async ({ page }) => {
  console.log('[SIMPLE2] Test started');
  console.log('[SIMPLE2] Loading:', indexPath);

  // Load directly via file://
  await page.goto(indexPath, { waitUntil: 'domcontentloaded' });
  console.log('[SIMPLE2] DOM loaded');

  // Just check title exists
  const title = await page.title();
  console.log('[SIMPLE2] Title:', title);

  expect(title).toBeTruthy();
  console.log('[SIMPLE2] Test completed');
});
