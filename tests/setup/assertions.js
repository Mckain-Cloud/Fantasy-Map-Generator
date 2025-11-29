/**
 * Custom Assertions for Fantasy Map Generator
 * Provides domain-specific assertion helpers
 */

import { expect } from '@playwright/test';

/**
 * Assert entity has valid ID and is not removed
 */
export function assertValidEntity(entity, entityType) {
  expect(entity, `${entityType} should exist`).toBeTruthy();
  expect(entity.i, `${entityType} should have ID`).toBeGreaterThan(0);
  expect(entity.removed, `${entityType} should not be removed`).toBeFalsy();
}

/**
 * Assert state has all required fields
 */
export function assertValidState(state) {
  assertValidEntity(state, 'State');
  expect(state.name, 'State should have name').toBeTruthy();
  expect(state.form, 'State should have form').toBeTruthy();
  expect(state.capital, 'State should have capital').toBeGreaterThanOrEqual(0);
  expect(state.culture, 'State should have culture').toBeGreaterThanOrEqual(0);
  expect(state.cells, 'State should have cells').toBeGreaterThan(0);
  expect(state.area, 'State should have area').toBeGreaterThan(0);
}

/**
 * Assert burg has all required fields
 */
export function assertValidBurg(burg) {
  assertValidEntity(burg, 'Burg');
  expect(burg.name, 'Burg should have name').toBeTruthy();
  expect(burg.cell, 'Burg should have cell').toBeGreaterThanOrEqual(0);
  expect(burg.state, 'Burg should have state').toBeGreaterThanOrEqual(0);
  expect(burg.culture, 'Burg should have culture').toBeGreaterThanOrEqual(0);
  expect(burg.population, 'Burg should have population').toBeGreaterThan(0);
  expect(burg.type, 'Burg should have type').toBeTruthy();
}

/**
 * Assert map has minimum entities
 */
export function assertMinimumEntities(stats, minimums) {
  if (minimums.states) {
    expect(stats.states, 'Minimum states').toBeGreaterThanOrEqual(minimums.states);
  }
  if (minimums.burgs) {
    expect(stats.burgs, 'Minimum burgs').toBeGreaterThanOrEqual(minimums.burgs);
  }
  if (minimums.cultures) {
    expect(stats.cultures, 'Minimum cultures').toBeGreaterThanOrEqual(minimums.cultures);
  }
  if (minimums.religions) {
    expect(stats.religions, 'Minimum religions').toBeGreaterThanOrEqual(minimums.religions);
  }
}

/**
 * Assert referential integrity is valid
 */
export function assertReferentialIntegrity(integrityCheck) {
  expect(integrityCheck.valid, `Referential integrity should be valid. Errors: ${integrityCheck.errors.join(', ')}`).toBe(true);
  expect(integrityCheck.errors, 'Should have no integrity errors').toHaveLength(0);
}

/**
 * Assert compression ratio
 */
export function assertCompressionRatio(original, compressed, minRatio = 0.85) {
  const ratio = compressed.length / original.length;
  const compressionPercent = (1 - ratio) * 100;

  expect(ratio, `Compression should achieve ${minRatio * 100}% reduction`).toBeLessThan(1 - minRatio);
  expect(compressionPercent, 'Compression percentage').toBeGreaterThan(minRatio * 100);
}

/**
 * Assert token budget
 */
export function assertTokenBudget(tokens, maxTokens) {
  expect(tokens, `Tokens (${tokens}) should be under budget (${maxTokens})`).toBeLessThan(maxTokens);
}

/**
 * Assert coordinates in bounds
 */
export function assertCoordinatesInBounds(x, y, maxX = 1920, maxY = 1080) {
  expect(x, 'X coordinate').toBeGreaterThanOrEqual(0);
  expect(x, 'X coordinate').toBeLessThanOrEqual(maxX);
  expect(y, 'Y coordinate').toBeGreaterThanOrEqual(0);
  expect(y, 'Y coordinate').toBeLessThanOrEqual(maxY);
}

/**
 * Assert AI response is valid structured output
 */
export function assertValidAIResponse(response) {
  expect(response, 'AI response should exist').toBeTruthy();
  expect(response.version, 'Should have version').toBe('1.0');
  expect(response.operation, 'Should have operation').toBeTruthy();
  expect(response.confidence, 'Should have confidence').toBeGreaterThanOrEqual(0);
  expect(response.confidence, 'Confidence should be <=1').toBeLessThanOrEqual(1);
  expect(response.changes, 'Should have changes array').toBeInstanceOf(Array);
}

/**
 * Assert performance metric
 */
export function assertPerformance(duration, maxDuration, operation) {
  expect(duration, `${operation} should complete in < ${maxDuration}ms (took ${Math.round(duration)}ms)`).toBeLessThan(maxDuration);
}

/**
 * Assert diplomacy is reciprocal
 */
export function assertReciprocalDiplomacy(state1, state2, relation) {
  const reciprocal = {
    'Ally': 'Ally',
    'Enemy': 'Enemy',
    'Rival': 'Rival',
    'Neutral': 'Neutral',
    'Friendly': 'Friendly',
    'Vassal': 'Suzerain',
    'Suzerain': 'Vassal'
  };

  const expected = reciprocal[relation] || relation;

  expect(state1.diplomacy?.[state2.i], `State ${state1.i} -> State ${state2.i} diplomacy`).toBe(relation);
  expect(state2.diplomacy?.[state1.i], `State ${state2.i} -> State ${state1.i} diplomacy (reciprocal)`).toBe(expected);
}

/**
 * Assert no console errors occurred
 */
export function assertNoConsoleErrors(errors) {
  const filtered = errors.filter(e => !e.includes('DevTools')); // Filter out DevTools messages
  expect(filtered, `Console errors: ${filtered.join(', ')}`).toHaveLength(0);
}
