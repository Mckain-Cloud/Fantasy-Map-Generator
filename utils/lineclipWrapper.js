/**
 * Wrapper for npm 'lineclip' package to provide compatible API
 * Original: https://github.com/mapbox/lineclip
 */
import {clipPolyline, clipPolygon} from "lineclip";

// Re-export with original names used in codebase
export const lineclip = clipPolyline;
export const polygonclip = clipPolygon;

// Expose to window for global access
if (typeof window !== "undefined") {
  window.lineclip = lineclip;
  window.polygonclip = polygonclip;
}
