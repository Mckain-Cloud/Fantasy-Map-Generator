/**
 * Global Setup for Playwright Tests
 * Runs once before all tests
 */

import { promises as fs } from 'fs';

export default async function globalSetup() {
  console.log('\n🚀 Starting Fantasy Map Generator Test Suite...\n');

  // Clean up previous coverage data
  try {
    await fs.rm('coverage', { recursive: true, force: true });
    console.log('📁 Cleaned previous coverage data');
  } catch (e) {
    // Directory might not exist, that's fine
  }

  // Create coverage directory
  await fs.mkdir('coverage', { recursive: true });

  // Store start time for reporting
  process.env.TEST_START_TIME = Date.now().toString();

  console.log('✅ Global setup complete\n');
}
