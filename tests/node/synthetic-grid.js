/**
 * Synthetic grid for Node-side (vitest) terrain tests.
 *
 * FMG's real grid is a jittered Voronoi mesh; for painting and fidelity
 * checks we only need point positions and a neighbour list, so a regular
 * lattice is sufficient and keeps the tests fast and deterministic.
 */
export function createSyntheticGrid({width = 800, height = 600, cells = 3000} = {}) {
  const spacing = Math.sqrt((width * height) / cells);
  const cellsX = Math.floor(width / spacing);
  const cellsY = Math.floor(height / spacing);
  const points = [];
  for (let y = 0; y < cellsY; y++) {
    for (let x = 0; x < cellsX; x++) {
      points.push([(x + 0.5) * spacing, (y + 0.5) * spacing]);
    }
  }
  const c = points.map((_, i) => {
    const x = i % cellsX;
    const y = Math.floor(i / cellsX);
    const neighbors = [];
    if (x > 0) neighbors.push(i - 1);
    if (x < cellsX - 1) neighbors.push(i + 1);
    if (y > 0) neighbors.push(i - cellsX);
    if (y < cellsY - 1) neighbors.push(i + cellsX);
    return neighbors;
  });
  return {points, cellsX, cellsY, spacing, cells: {c}, width, height};
}

/** Index of the lattice point nearest to normalized coordinates. */
export function cellAt(grid, nx, ny) {
  const x = Math.min(grid.cellsX - 1, Math.floor((nx * grid.width) / grid.spacing));
  const y = Math.min(grid.cellsY - 1, Math.floor((ny * grid.height) / grid.spacing));
  return y * grid.cellsX + x;
}

/** Fraction of points inside a normalized box that satisfy `test`. */
export function ratioInBox(grid, heights, [x0, y0, x1, y1], test) {
  let n = 0;
  let ok = 0;
  grid.points.forEach(([px, py], i) => {
    const nx = px / grid.width;
    const ny = py / grid.height;
    if (nx < x0 || nx > x1 || ny < y0 || ny > y1) return;
    n++;
    if (test(heights[i])) ok++;
  });
  return n ? ok / n : 0;
}
