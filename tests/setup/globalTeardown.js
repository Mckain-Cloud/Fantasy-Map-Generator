/**
 * Global Teardown for Playwright Tests
 * Runs once after all tests complete
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Merge V8 coverage data from multiple test runs.
 * V8 coverage format: { url, source, functions: [{ functionName, ranges: [{ startOffset, endOffset, count }] }] }
 *
 * For each URL, we merge function coverage by taking the maximum count for each range.
 */
function mergeCoverageEntries(entries) {
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0];

  // Use the first entry as base (it has source code)
  const merged = {
    url: entries[0].url,
    source: entries[0].source,
    functions: []
  };

  // Build a map of functionName -> merged function data
  const functionMap = new Map();

  for (const entry of entries) {
    for (const fn of (entry.functions || [])) {
      const key = `${fn.functionName || ''}:${fn.ranges?.[0]?.startOffset || 0}`;

      if (!functionMap.has(key)) {
        // Clone the function with its ranges
        functionMap.set(key, {
          functionName: fn.functionName,
          isBlockCoverage: fn.isBlockCoverage,
          ranges: (fn.ranges || []).map(r => ({ ...r }))
        });
      } else {
        // Merge ranges by taking max count for each range
        const existing = functionMap.get(key);
        for (const range of (fn.ranges || [])) {
          const existingRange = existing.ranges.find(
            r => r.startOffset === range.startOffset && r.endOffset === range.endOffset
          );
          if (existingRange) {
            existingRange.count = Math.max(existingRange.count || 0, range.count || 0);
          } else {
            existing.ranges.push({ ...range });
          }
        }
      }
    }
  }

  merged.functions = Array.from(functionMap.values());
  return merged;
}

export default async function globalTeardown() {
  console.log('\n🏁 Test suite complete!\n');

  // Calculate test duration
  const startTime = parseInt(process.env.TEST_START_TIME || '0');
  const duration = Date.now() - startTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = ((duration % 60000) / 1000).toFixed(1);

  console.log(`⏱️  Total test time: ${minutes}m ${seconds}s`);

  // Check if coverage data exists and merge it
  try {
    const coverageDir = 'coverage';
    const rawDir = path.join(coverageDir, 'raw');
    const files = await fs.readdir(coverageDir);
    const coverageFiles = files.filter(f => f.startsWith('coverage-') && f.endsWith('.json'));

    if (coverageFiles.length > 0) {
      console.log(`\n📊 Merging ${coverageFiles.length} coverage file(s)...`);

      // Save raw coverage files for analysis
      await fs.mkdir(rawDir, { recursive: true });
      for (const file of coverageFiles) {
        await fs.copyFile(
          path.join(coverageDir, file),
          path.join(rawDir, file)
        );
      }
      console.log(`📁 Raw coverage data saved to ${rawDir}/`);

      // Group all coverage entries by URL
      const urlToEntries = new Map();

      for (const file of coverageFiles) {
        const content = await fs.readFile(path.join(coverageDir, file), 'utf-8');
        const data = JSON.parse(content);

        for (const entry of data) {
          if (!entry.url) continue;

          if (!urlToEntries.has(entry.url)) {
            urlToEntries.set(entry.url, []);
          }
          urlToEntries.get(entry.url).push(entry);
        }
      }

      // Merge entries for each URL
      const mergedCoverage = [];
      for (const [url, entries] of urlToEntries) {
        const merged = mergeCoverageEntries(entries);
        if (merged) {
          mergedCoverage.push(merged);
        }
      }

      console.log(`📊 Merged coverage for ${mergedCoverage.length} files from ${urlToEntries.size} unique URLs`);

      // Save merged coverage for analysis
      await fs.writeFile(
        path.join(coverageDir, 'merged-raw.json'),
        JSON.stringify(mergedCoverage, null, 2)
      );
      console.log(`📁 Merged coverage data saved to ${coverageDir}/merged-raw.json`);

      // Import coverage utilities dynamically
      const { generateCoverageReport } = await import('./coverage.js');
      await generateCoverageReport(mergedCoverage, coverageDir);

      console.log(`\n📄 Coverage report generated at: ${coverageDir}/index.html`);
    } else {
      console.log('\n⚠️  No coverage data collected');
    }
  } catch (e) {
    console.log('\n⚠️  Could not generate coverage report:', e.message);
  }

  console.log('\n✅ Teardown complete\n');
}
