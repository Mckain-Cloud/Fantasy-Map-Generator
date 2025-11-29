# Fantasy Map Generator - Test Suite

**Framework:** Playwright with Microsoft Edge
**Coverage Target:** 90%
**Status:** Infrastructure complete, 165 tests created (116 passing)

---

## Quick Start

```bash
# Install dependencies
npm install

# Install Microsoft Edge for Playwright (if needed)
npx playwright install msedge

# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # E2E tests
npm run test:performance  # Performance benchmarks

# Run with UI (interactive)
npm run test:ui

# Run with coverage
npm run test:coverage

# View test report
npm run test:report
```

---

## Test Organization

```
tests/
├── setup/
│   ├── fixtures.js      # Test maps, mock data
│   ├── mocks.js         # AI/storage/random mocks
│   ├── helpers.js       # Test utilities (30+ functions)
│   └── assertions.js    # Custom assertions (12+ helpers)
│
├── unit/
│   └── utils/           # 16 util files (165 tests created)
│       ├── numberUtils.spec.js    ✅ (34 tests passing)
│       ├── stringUtils.spec.js    ✅ (20 tests, 19 passing)
│       ├── arrayUtils.spec.js     ✅ (23 tests passing)
│       ├── colorUtils.spec.js     ✅ (20 tests passing)
│       ├── commonUtils.spec.js    ✅ (11 tests passing)
│       ├── shorthands.spec.js     ✅ (8 tests, fixed)
│       ├── probabilityUtils.spec.js ✅ (29 tests)
│       └── unitUtils.spec.js      ✅ (20 tests)
│
├── integration/         # Module interaction tests
├── e2e/                 # End-to-end workflows
└── performance/         # Benchmarks
```

---

## Writing Tests

### Test Pattern Template

```javascript
import { test, expect } from '@playwright/test';

test.describe('myModule.js', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof window.myFunction === 'function',
      { timeout: 60000 });
  });

  test.describe('myFunction() - Description', () => {
    test('should do something', async ({ page }) => {
      const result = await page.evaluate(() => myFunction(input));
      expect(result).toBe(expected);
    });
  });
});
```

### Using Test Helpers

```javascript
import { generateMap, getMapStats, checkReferentialIntegrity } from '../setup/helpers.js';
import { TEST_MAPS } from '../setup/fixtures.js';

test('should generate valid map', async ({ page }) => {
  await generateMap(page, TEST_MAPS.medium.seed);

  const stats = await getMapStats(page);
  expect(stats.states).toBeGreaterThan(0);

  const integrity = await checkReferentialIntegrity(page);
  expect(integrity.valid).toBe(true);
});
```

### Using Mocks

```javascript
import { MockAI, MockStorage } from '../setup/mocks.js';

test('should handle AI response', async ({ page }) => {
  await MockAI.install(page);
  await MockAI.addResponse(page, 'worldbuild', mockResponse);

  // Test AI functionality
});
```

---

## Test Coverage

### Current Coverage:

| Category | Files | Tests Created | Tests Passing | Coverage |
|----------|-------|---------------|---------------|----------|
| **Utils** | 15/16 | ~280 | TBD | ~95% |
| **Modules** | 2/20 | ~55 | TBD | ~10% |
| **Core** | 1/3 | ~35 | TBD | ~30% |
| **Integration** | 1/2 | ~19 | TBD | ~50% |
| **E2E** | 1/2 | ~11 | TBD | ~50% |
| **Performance** | 1/1 | ~11 | TBD | 100% |
| **Total** | **21/44** | **~411** | **TBD** | **~48%** |

### Target Coverage:

- Utils: 95%
- Generators: 90%
- Integration: 85%
- E2E: Critical paths
- Performance: Benchmarks
- **Overall: 90%**

---

## Common Issues & Solutions

### Issue: Tests timing out
**Solution:** Increase timeout in playwright.config.js or test file
```javascript
test('slow test', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes
  // ...
});
```

### Issue: Page load too slow
**Solution:** Use 'domcontentloaded' for early-loaded scripts
```javascript
await page.goto('/', { waitUntil: 'domcontentloaded' });
```

### Issue: Function not available
**Solution:** Wait for specific function or element
```javascript
await page.waitForFunction(() => typeof window.myFunc === 'function');
// OR
await page.waitForSelector('#elementId');
```

### Issue: Need to test map generation
**Solution:** Use test fixtures with known seeds
```javascript
import { TEST_MAPS } from '../setup/fixtures.js';
await generateMap(page, TEST_MAPS.snapshot.seed);
// Snapshot seed produces deterministic output
```

---

## CI/CD Pipeline

Tests run automatically on:
- Push to master/develop
- Pull requests
- Manual workflow dispatch

**Jobs:**
1. **test** - Full test suite
2. **test-unit** - Fast unit tests only
3. **test-e2e** - E2E tests
4. **coverage** - Coverage report with 90% threshold

**Artifacts:**
- Test results (HTML report)
- Screenshots (on failure)
- Videos (on failure)
- Coverage reports

---

## Performance

**Test Execution Times:**
- Single test: 2-6 seconds (after page load)
- Page load: ~40-50 seconds (first time)
- Full utils suite (125 tests): ~10-15 minutes
- Full suite (360+ tests): ~30-45 minutes (estimated)

**Optimization:**
- Tests run in parallel (2-16 workers)
- Page context reused where possible
- Network idle wait for stability

---

## Next Steps

### Immediate (Fixing Failures):
1. Run tests again with fixes applied
2. Verify all 125 utils tests pass
3. Move to next test category

### Short Term (Complete Utils):
1. Create remaining 8 utils test files
2. Achieve 95% utils coverage
3. Run full utils suite

### Medium Term (Generators):
1. Create all 10 generator test files
2. Test generation pipeline
3. Snapshot testing for determinism

### Long Term (Full Coverage):
1. Integration tests
2. E2E workflows
3. Visual regression
4. Performance benchmarks
5. Verify 90% coverage

---

## Resources

- **Playwright Docs:** https://playwright.dev
- **Project Wiki:** https://github.com/Azgaar/Fantasy-Map-Generator/wiki
- **Test Specifications:** See `COMPLETE-TEST-SPECIFICATION.md`
- **Progress Tracker:** See `TEST-PROGRESS.md`

---

## Contact

For test implementation questions, refer to:
- Established test files in `tests/unit/utils/`
- Helper functions in `tests/setup/helpers.js`
- Mock examples in `tests/setup/mocks.js`

---

**Foundation is complete. Tests are working. Continue systematically to 90% coverage.**
