"use strict";
// FMG utils related to nodes

// remove parent element (usually if child is clicked)
export function removeParent() {
  this.parentNode.parentNode.removeChild(this.parentNode);
}

// polyfill for composedPath
export function getComposedPath(node) {
  let parent;
  if (node.parentNode) parent = node.parentNode;
  else if (node.host) parent = node.host;
  else if (node.defaultView) parent = node.defaultView;
  if (parent !== undefined) return [node].concat(getComposedPath(parent));
  return [node];
}

// get next unused id
export function getNextId(core, i = 1) {
  while (document.getElementById(core + i)) i++;
  return core + i;
}

export function getAbsolutePath(href) {
  if (!href) return "";
  const link = document.createElement("a");
  link.href = href;
  return link.href;
}

// Backward compatibility - expose on window during transition
if (typeof window !== "undefined") {
  window.removeParent = removeParent;
  window.getComposedPath = getComposedPath;
  window.getNextId = getNextId;
  window.getAbsolutePath = getAbsolutePath;
}
