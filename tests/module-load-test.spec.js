import { test, expect } from '@playwright/test';

test('Application loads without module errors', async ({ page }) => {
  const errors = [];
  const warnings = [];

  // Capture console errors and warnings
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
    if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  // Capture page errors (uncaught exceptions)
  page.on('pageerror', error => {
    errors.push(error.message + '\n' + error.stack);
  });

  await page.goto('http://localhost:8080/index.html', { waitUntil: 'domcontentloaded' });

  // Wait a bit for modules to load
  await page.waitForTimeout(5000);

  // Filter for module/syntax errors
  const moduleErrors = errors.filter(e =>
    e.includes('SyntaxError') ||
    e.includes('does not provide an export') ||
    e.includes('is not defined') ||
    e.includes('Cannot find module')
  );

  // Filter for jQuery Migrate warnings
  const jQueryMigrateWarnings = warnings.filter(w =>
    w.includes('JQMIGRATE')
  );

  console.log('All errors:', errors);
  console.log('Module errors:', moduleErrors);
  console.log('jQuery Migrate warnings:', jQueryMigrateWarnings);

  expect(moduleErrors).toEqual([]);
});
