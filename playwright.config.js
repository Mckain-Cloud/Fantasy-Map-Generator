import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Fantasy Map Generator
 * Primary browser: Microsoft Edge (Chromium-based for V8 coverage)
 * Coverage target: 90%
 */
export default defineConfig({
  testDir: './tests',

  // Files run in parallel across workers, but a file's tests run in order in
  // one worker. Shared-page specs (tests/setup/shared-test.js) depend on this:
  // with fullyParallel the page would be loaded once per worker *per file*.
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Global setup and teardown for coverage
  globalSetup: './tests/setup/globalSetup.js',
  globalTeardown: './tests/setup/globalTeardown.js',

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL - served by local web server
    baseURL: 'http://localhost:8080',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1920, height: 1080 },

    // Timeouts
    actionTimeout: 30000, // 30 seconds for actions
    navigationTimeout: 60000 // 60 seconds for page load
  },

  // Configure projects for browsers
  projects: [
    {
      // Set PW_BROWSER=chromium to use Playwright's bundled Chromium instead of Edge
      name: process.env.PW_BROWSER === 'chromium' ? 'Chromium' : 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: process.env.PW_BROWSER === 'chromium' ? undefined : 'msedge',
        // Ensure sufficient memory for large maps
        launchOptions: {
          headless: true,
          args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
        }
      }
    }
  ],

  // Run local dev server before starting tests
  // Serve from dist folder (build output)
  webServer: {
    // Set PW_SKIP_BUILD=1 to serve the existing dist/ without rebuilding (saves ~15s per run)
    command: process.env.PW_SKIP_BUILD
      ? 'npx http-server dist -p 8080 -c-1 --silent'
      : 'npm run build && npx http-server dist -p 8080 -c-1 --silent',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000 // Allow time for build
  },

  // Test timeouts
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  // Global setup/teardown
  // globalSetup: require.resolve('./tests/setup/globalSetup.js'),
  // globalTeardown: require.resolve('./tests/setup/globalTeardown.js')
});
