"use strict";
// FMG utils related to numbers

// round value to d decimals
export function rn(v, d = 0) {
  const m = Math.pow(10, d);
  return Math.round(v * m) / m;
}

export function minmax(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// return value in range [0, 100]
export function lim(v) {
  return minmax(v, 0, 100);
}

// normalization function
export function normalize(val, min, max) {
  return minmax((val - min) / (max - min), 0, 1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Backward compatibility - expose on window during transition
if (typeof window !== "undefined") {
  window.rn = rn;
  window.minmax = minmax;
  window.lim = lim;
  window.normalize = normalize;
  window.lerp = lerp;
}
