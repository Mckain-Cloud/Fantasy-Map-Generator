/**
 * Browser Code Coverage Collection for Playwright
 * Uses V8 coverage APIs to track JavaScript execution in browser context
 */

import { promises as fs } from 'fs';
import path from 'path';

// Coverage data storage
const coverageData = [];

/**
 * Start collecting coverage for a page
 * Call this in test.beforeAll or test.beforeEach
 */
export async function startCoverage(page) {
  // Only collect coverage for Chromium-based browsers (V8 coverage)
  const browserName = page.context().browser()?.browserType()?.name();
  if (browserName !== 'chromium' && browserName !== 'msedge') {
    console.log(`Coverage not available for ${browserName}, skipping...`);
    return;
  }

  await page.coverage.startJSCoverage({
    resetOnNavigation: false,
    reportAnonymousScripts: false
  });
}

/**
 * Stop collecting coverage and store results
 * Call this in test.afterAll or test.afterEach
 */
export async function stopCoverage(page) {
  const browserName = page.context().browser()?.browserType()?.name();
  if (browserName !== 'chromium' && browserName !== 'msedge') {
    return;
  }

  const coverage = await page.coverage.stopJSCoverage();
  coverageData.push(...coverage);
}

/**
 * Get all collected coverage data
 */
export function getCoverageData() {
  return coverageData;
}

/**
 * Clear collected coverage data
 */
export function clearCoverageData() {
  coverageData.length = 0;
}

/**
 * Filter coverage to only include project source files
 */
export function filterProjectCoverage(coverage, baseUrl = 'http://localhost:8080') {
  const projectPatterns = [
    /\/utils\/.*\.js$/,
    /\/modules\/.*\.js$/,
    /\/config\/.*\.js$/,
    /\/main\.js$/,
    /\/versioning\.js$/
  ];

  return coverage.filter(entry => {
    const url = entry.url;
    // Skip external scripts and inline scripts
    if (!url.startsWith(baseUrl)) return false;
    if (url.includes('/libs/')) return false;
    if (url.includes('node_modules')) return false;

    // Check if matches project patterns
    return projectPatterns.some(pattern => pattern.test(url));
  });
}

/**
 * Calculate coverage statistics from V8 coverage data
 * V8 coverage format: { url, source, functions: [{ functionName, ranges: [{ startOffset, endOffset, count }] }] }
 */
export function calculateCoverageStats(coverage) {
  const stats = {
    files: [],
    summary: {
      totalBytes: 0,
      coveredBytes: 0,
      totalFunctions: 0,
      coveredFunctions: 0
    }
  };

  for (const entry of coverage) {
    const fileName = entry.url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');
    const source = entry.source || '';
    const totalBytes = source.length;

    // V8 coverage stores ranges inside functions, not at the top level
    // We need to merge all covered ranges from all functions to calculate byte coverage
    const coveredRanges = [];
    const functions = entry.functions || [];

    for (const fn of functions) {
      for (const range of fn.ranges || []) {
        if (range.count > 0) {
          coveredRanges.push({
            start: range.startOffset,
            end: range.endOffset
          });
        }
      }
    }

    // Merge overlapping ranges and calculate total covered bytes
    const mergedRanges = mergeRanges(coveredRanges);
    let coveredBytes = 0;
    for (const range of mergedRanges) {
      coveredBytes += range.end - range.start;
    }

    // Count functions (exclude the module-level anonymous function which covers everything)
    const namedFunctions = functions.filter(f => f.functionName);
    const functionCount = namedFunctions.length;
    const coveredFunctions = namedFunctions.filter(f =>
      f.ranges && f.ranges.some(r => r.count > 0)
    ).length;

    // Use function coverage as the primary metric since byte coverage
    // shows 100% when modules are loaded (V8 counts module initialization)
    const functionCoverage = functionCount > 0
      ? (coveredFunctions / functionCount * 100).toFixed(2)
      : '100.00'; // If no named functions, consider it fully covered

    const fileStats = {
      file: fileName,
      totalBytes,
      coveredBytes,
      coverage: functionCoverage, // Use function coverage as primary metric
      byteCoverage: totalBytes > 0 ? (coveredBytes / totalBytes * 100).toFixed(2) : '0.00',
      functions: functionCount,
      coveredFunctions
    };

    stats.files.push(fileStats);
    stats.summary.totalBytes += totalBytes;
    stats.summary.coveredBytes += coveredBytes;
    stats.summary.totalFunctions += functionCount;
    stats.summary.coveredFunctions += coveredFunctions;
  }

  stats.summary.lineCoverage = stats.summary.totalBytes > 0
    ? (stats.summary.coveredBytes / stats.summary.totalBytes * 100).toFixed(2)
    : '0.00';

  stats.summary.functionCoverage = stats.summary.totalFunctions > 0
    ? (stats.summary.coveredFunctions / stats.summary.totalFunctions * 100).toFixed(2)
    : '0.00';

  return stats;
}

/**
 * Merge overlapping ranges to avoid double-counting bytes
 */
function mergeRanges(ranges) {
  if (ranges.length === 0) return [];

  // Sort by start position
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      // Overlapping or adjacent - extend the last range
      last.end = Math.max(last.end, current.end);
    } else {
      // No overlap - add new range
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Generate coverage report in multiple formats
 */
export async function generateCoverageReport(coverage, outputDir = 'coverage') {
  const projectCoverage = filterProjectCoverage(coverage);
  const stats = calculateCoverageStats(projectCoverage);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Write JSON report
  await fs.writeFile(
    path.join(outputDir, 'coverage.json'),
    JSON.stringify(stats, null, 2)
  );

  // Write summary text report
  const summaryLines = [
    '═══════════════════════════════════════════════════════════════════════════════',
    '                        CODE COVERAGE REPORT',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    `Total Files: ${stats.files.length}`,
    `Function Coverage: ${stats.summary.functionCoverage}% (${stats.summary.coveredFunctions}/${stats.summary.totalFunctions} functions)`,
    `Byte Coverage: ${stats.summary.lineCoverage}%`,
    '',
    '───────────────────────────────────────────────────────────────────────────────',
    'File Coverage Details (by function coverage):',
    '───────────────────────────────────────────────────────────────────────────────',
    ''
  ];

  // Sort files by coverage (lowest first)
  const sortedFiles = [...stats.files].sort((a, b) => parseFloat(a.coverage) - parseFloat(b.coverage));

  for (const file of sortedFiles) {
    const bar = generateProgressBar(parseFloat(file.coverage), 30);
    summaryLines.push(`${file.file.padEnd(50)} ${bar} ${file.coverage.padStart(6)}%`);
  }

  summaryLines.push('');
  summaryLines.push('═══════════════════════════════════════════════════════════════════════════════');

  const summaryText = summaryLines.join('\n');

  await fs.writeFile(
    path.join(outputDir, 'coverage-summary.txt'),
    summaryText
  );

  // Print summary to console
  console.log('\n' + summaryText);

  // Generate HTML report
  await generateHtmlReport(stats, outputDir);

  return stats;
}

/**
 * Generate a simple progress bar
 */
function generateProgressBar(percentage, width) {
  const filled = Math.round(percentage / 100 * width);
  const empty = width - filled;
  const color = percentage >= 80 ? '🟢' : percentage >= 50 ? '🟡' : '🔴';
  return `${color} [${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * Generate HTML coverage report
 */
async function generateHtmlReport(stats, outputDir) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coverage Report - Fantasy Map Generator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    h1 { color: #00d4ff; margin-bottom: 20px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card { background: #16213e; border-radius: 8px; padding: 20px; }
    .card h3 { color: #888; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; }
    .card .value { font-size: 36px; font-weight: bold; }
    .card .value.high { color: #00ff88; }
    .card .value.medium { color: #ffcc00; }
    .card .value.low { color: #ff4444; }
    table { width: 100%; border-collapse: collapse; background: #16213e; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; }
    th { background: #0f3460; color: #00d4ff; }
    tr:nth-child(even) { background: #1a1a3e; }
    .progress { width: 200px; height: 8px; background: #333; border-radius: 4px; overflow: hidden; }
    .progress-bar { height: 100%; border-radius: 4px; }
    .progress-bar.high { background: linear-gradient(90deg, #00ff88, #00d4ff); }
    .progress-bar.medium { background: linear-gradient(90deg, #ffcc00, #ff9900); }
    .progress-bar.low { background: linear-gradient(90deg, #ff4444, #ff6666); }
    .coverage-value { font-weight: bold; min-width: 60px; display: inline-block; }
  </style>
</head>
<body>
  <h1>📊 Coverage Report - Fantasy Map Generator</h1>

  <div class="summary">
    <div class="card">
      <h3>Total Files</h3>
      <div class="value">${stats.files.length}</div>
    </div>
    <div class="card">
      <h3>Function Coverage</h3>
      <div class="value ${getCoverageClass(stats.summary.functionCoverage)}">${stats.summary.functionCoverage}%</div>
    </div>
    <div class="card">
      <h3>Functions Covered</h3>
      <div class="value">${stats.summary.coveredFunctions} / ${stats.summary.totalFunctions}</div>
    </div>
    <div class="card">
      <h3>Byte Coverage</h3>
      <div class="value">${stats.summary.lineCoverage}%</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>File</th>
        <th>Function Coverage</th>
        <th>Progress</th>
        <th>Functions</th>
      </tr>
    </thead>
    <tbody>
      ${stats.files
        .sort((a, b) => parseFloat(a.coverage) - parseFloat(b.coverage))
        .map(file => `
          <tr>
            <td>${file.file}</td>
            <td><span class="coverage-value ${getCoverageClass(file.coverage)}">${file.coverage}%</span></td>
            <td>
              <div class="progress">
                <div class="progress-bar ${getCoverageClass(file.coverage)}" style="width: ${file.coverage}%"></div>
              </div>
            </td>
            <td>${file.coveredFunctions} / ${file.functions}</td>
          </tr>
        `).join('')}
    </tbody>
  </table>

  <p style="margin-top: 20px; color: #666;">Generated: ${new Date().toISOString()}</p>
</body>
</html>`;

  await fs.writeFile(path.join(outputDir, 'index.html'), html);
}

function getCoverageClass(coverage) {
  const value = parseFloat(coverage);
  if (value >= 80) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
