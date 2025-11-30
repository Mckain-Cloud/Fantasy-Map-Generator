/**
 * Wrapper for npm 'alea' package to provide aleaPRNG compatible API
 * Original: https://github.com/macmcmeans/aleaPRNG
 */
import Alea from "alea";

/**
 * Creates a seedable pseudo-random number generator
 * @param {...any} args - Seeds for the PRNG
 * @returns {Function} Random number generator function with additional methods
 */
export function aleaPRNG(...args) {
  // Use current time if no seed provided
  if (args.length === 0) {
    args = [Date.now()];
  }

  const rng = new Alea(...args);

  // The base random function
  const random = () => rng();

  // Add compatibility methods
  random.fract53 = () => rng.fract53 ? rng.fract53() : rng();
  random.int32 = () => rng.uint32 ? rng.uint32() : Math.floor(rng() * 0x100000000);

  // range function for getting random numbers in a range
  random.range = function (...rangeArgs) {
    let min, max;
    if (rangeArgs.length === 1) {
      min = 0;
      max = rangeArgs[0];
    } else {
      min = rangeArgs[0];
      max = rangeArgs[1];
    }
    if (min > max) [min, max] = [max, min];

    const isInt = Number.isInteger(min) && Number.isInteger(max);
    return isInt ? Math.floor(rng() * (max - min + 1)) + min : rng() * (max - min) + min;
  };

  // restart with original seed
  random.restart = () => {
    const newRng = new Alea(...args);
    Object.assign(rng, newRng);
  };

  // reseed with new values
  random.seed = (...newArgs) => {
    const newRng = new Alea(...newArgs);
    Object.assign(rng, newRng);
  };

  // cycle through n iterations
  random.cycle = (n = 1) => {
    for (let i = 0; i < n; i++) rng();
  };

  return random;
}

// Expose to window for global access
if (typeof window !== "undefined") {
  window.aleaPRNG = aleaPRNG;
}
