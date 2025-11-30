"use strict";

/**
 * Native dialog utilities to replace jQuery UI dialogs
 * Provides similar API to minimize migration effort
 */

// Store dialog state and options
const dialogStates = new Map();

/**
 * Initialize or update a dialog element
 * @param {HTMLDialogElement} dialog - The dialog element
 * @param {Object} options - Dialog options (title, width, position, buttons, etc.)
 */
export function initDialog(dialog, options = {}) {
  if (!dialog) return;

  const state = dialogStates.get(dialog.id) || {
    initialized: false,
    draggable: false,
    resizable: false
  };

  // Set title
  if (options.title) {
    const header = dialog.querySelector(".dialog-header, header");
    if (header) {
      const titleEl = header.querySelector(".dialog-title, h2, span");
      if (titleEl) titleEl.textContent = options.title;
    }
  }

  // Set width
  if (options.width) {
    dialog.style.width = typeof options.width === "number" ? `${options.width}px` : options.width;
  }

  // Set position
  if (options.position) {
    applyPosition(dialog, options.position);
  }

  // Setup buttons
  if (options.buttons && !state.initialized) {
    setupButtons(dialog, options.buttons);
  }

  // Setup close behavior
  if (options.close && !state.initialized) {
    dialog.addEventListener("close", () => options.close.call(dialog));
  }

  // Make draggable
  if (!state.draggable) {
    makeDraggable(dialog);
    state.draggable = true;
  }

  // Make resizable if needed
  if (options.resizable !== false && !state.resizable) {
    makeResizable(dialog);
    state.resizable = true;
  }

  state.initialized = true;
  dialogStates.set(dialog.id, state);

  // Show the dialog
  if (!dialog.open) {
    dialog.show();
  }
}

/**
 * Close a dialog
 * @param {HTMLDialogElement} dialog - The dialog element
 */
export function closeDialog(dialog) {
  if (dialog && dialog.open) {
    dialog.close();
  }
}

/**
 * Destroy a dialog (reset state)
 * @param {HTMLDialogElement} dialog - The dialog element
 */
export function destroyDialog(dialog) {
  if (dialog) {
    closeDialog(dialog);
    dialogStates.delete(dialog.id);
  }
}

/**
 * Apply positioning to dialog
 * Supports jQuery UI style position objects: {my, at, of, collision}
 */
function applyPosition(dialog, position) {
  if (!position) return;

  const {my = "center", at = "center", of = window} = position;

  // Get reference element
  const refElement = typeof of === "string" ? document.querySelector(of) : of;
  if (!refElement) return;

  const refRect = refElement === window
    ? {left: 0, top: 0, width: window.innerWidth, height: window.innerHeight}
    : refElement.getBoundingClientRect();

  const dialogRect = dialog.getBoundingClientRect();

  // Parse position strings (e.g., "right top", "center", "left+10 top+10")
  const parsePos = (str, dimension) => {
    const match = str.match(/(left|center|right|top|bottom)([+-]\d+)?/i);
    if (!match) return dimension === "x" ? refRect.width / 2 : refRect.height / 2;

    const [, align, offset] = match;
    const offsetVal = offset ? parseInt(offset) : 0;

    if (dimension === "x") {
      if (align === "left") return offsetVal;
      if (align === "right") return refRect.width + offsetVal;
      return refRect.width / 2 + offsetVal;
    } else {
      if (align === "top") return offsetVal;
      if (align === "bottom") return refRect.height + offsetVal;
      return refRect.height / 2 + offsetVal;
    }
  };

  const myParts = my.split(" ");
  const atParts = at.split(" ");

  const atX = parsePos(atParts[0] || "center", "x");
  const atY = parsePos(atParts[1] || atParts[0] || "center", "y");

  const myX = parsePos(myParts[0] || "center", "x");
  const myY = parsePos(myParts[1] || myParts[0] || "center", "y");

  // Calculate final position
  let left = refRect.left + atX - (myX / refRect.width) * dialogRect.width;
  let top = refRect.top + atY - (myY / refRect.height) * dialogRect.height;

  // Collision handling - keep within viewport
  if (position.collision !== "none") {
    left = Math.max(0, Math.min(left, window.innerWidth - dialogRect.width));
    top = Math.max(0, Math.min(top, window.innerHeight - dialogRect.height));
  }

  dialog.style.position = "fixed";
  dialog.style.left = `${left}px`;
  dialog.style.top = `${top}px`;
  dialog.style.margin = "0";
}

/**
 * Setup dialog buttons
 */
function setupButtons(dialog, buttons) {
  let buttonContainer = dialog.querySelector(".dialog-buttons");
  if (!buttonContainer) {
    buttonContainer = document.createElement("div");
    buttonContainer.className = "dialog-buttons";
    dialog.appendChild(buttonContainer);
  }

  buttonContainer.innerHTML = "";

  for (const [label, handler] of Object.entries(buttons)) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.addEventListener("click", function() {
      handler.call(dialog);
    });
    buttonContainer.appendChild(btn);
  }
}

/**
 * Make element draggable with mouse and touch support
 */
export function makeDraggable(element, handleSelector = ".dialog-header, header") {
  const handle = element.querySelector(handleSelector) || element;

  let isDragging = false;
  let startX, startY, startLeft, startTop;

  const getCoords = (e) => {
    if (e.touches && e.touches.length) {
      return {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }
    return {x: e.clientX, y: e.clientY};
  };

  const startDrag = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;

    isDragging = true;
    const coords = getCoords(e);
    startX = coords.x;
    startY = coords.y;

    const rect = element.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    element.style.position = "fixed";
    element.style.margin = "0";

    handle.style.cursor = "grabbing";

    if (e.type === "touchstart") {
      e.preventDefault();
    }
  };

  const onDrag = (e) => {
    if (!isDragging) return;

    const coords = getCoords(e);
    const dx = coords.x - startX;
    const dy = coords.y - startY;

    let newLeft = startLeft + dx;
    let newTop = startTop + dy;

    // Keep within viewport
    const rect = element.getBoundingClientRect();
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));

    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;

    if (e.type === "touchmove") {
      e.preventDefault();
    }
  };

  const endDrag = () => {
    isDragging = false;
    handle.style.cursor = "grab";
  };

  // Mouse events
  handle.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", endDrag);

  // Touch events
  handle.addEventListener("touchstart", startDrag, {passive: false});
  document.addEventListener("touchmove", onDrag, {passive: false});
  document.addEventListener("touchend", endDrag);

  handle.style.cursor = "grab";
}

/**
 * Make element resizable
 */
export function makeResizable(element) {
  // Add resize handle if not exists
  let resizeHandle = element.querySelector(".resize-handle");
  if (!resizeHandle) {
    resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";
    resizeHandle.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
      width: 16px;
      height: 16px;
      cursor: se-resize;
    `;
    element.appendChild(resizeHandle);
  }

  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  const getCoords = (e) => {
    if (e.touches && e.touches.length) {
      return {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }
    return {x: e.clientX, y: e.clientY};
  };

  const startResize = (e) => {
    isResizing = true;
    const coords = getCoords(e);
    startX = coords.x;
    startY = coords.y;
    startWidth = element.offsetWidth;
    startHeight = element.offsetHeight;

    if (e.type === "touchstart") {
      e.preventDefault();
    }
  };

  const onResize = (e) => {
    if (!isResizing) return;

    const coords = getCoords(e);
    const newWidth = Math.max(200, startWidth + (coords.x - startX));
    const newHeight = Math.max(100, startHeight + (coords.y - startY));

    element.style.width = `${newWidth}px`;
    element.style.height = `${newHeight}px`;

    if (e.type === "touchmove") {
      e.preventDefault();
    }
  };

  const endResize = () => {
    isResizing = false;
  };

  // Mouse events
  resizeHandle.addEventListener("mousedown", startResize);
  document.addEventListener("mousemove", onResize);
  document.addEventListener("mouseup", endResize);

  // Touch events
  resizeHandle.addEventListener("touchstart", startResize, {passive: false});
  document.addEventListener("touchmove", onResize, {passive: false});
  document.addEventListener("touchend", endResize);
}

/**
 * Close all visible dialogs except specified ones
 * @param {string} except - Selector for dialogs to keep open
 */
export function closeAllDialogs(except = "") {
  document.querySelectorAll("dialog[open]").forEach(dialog => {
    if (except && dialog.matches(except)) return;
    dialog.close();
  });
}

// jQuery-like wrapper for easier migration
export function $dialog(selector) {
  const element = typeof selector === "string"
    ? document.querySelector(selector)
    : selector;

  return {
    dialog: function(options) {
      if (typeof options === "string") {
        if (options === "close") closeDialog(element);
        else if (options === "destroy") destroyDialog(element);
        else if (options === "open") openEditorDialog(element);
        return this;
      }
      initDialog(element, options);
      return this;
    },

    // For chaining
    get: () => element
  };
}

/**
 * Open an editor dialog (persistent panel dialog)
 * Converts div.dialog to dialog element if needed and opens it
 * @param {string|HTMLElement} selector - Dialog element or selector
 * @param {Object} options - Dialog options
 */
export function openEditorDialog(selector, options = {}) {
  const element = typeof selector === "string"
    ? document.querySelector(selector)
    : selector;

  if (!element) return null;

  // Convert div to dialog if needed
  let dialog = element;
  if (element.tagName !== "DIALOG") {
    dialog = convertToDialog(element);
  }

  // Get or create state
  const state = dialogStates.get(dialog.id) || {
    initialized: false,
    draggable: false,
    resizable: false,
    closeCallback: null
  };

  // Update title
  if (options.title !== undefined) {
    const titleEl = dialog.querySelector(".dialog-title");
    if (titleEl) titleEl.textContent = options.title;
  }

  // Update width
  if (options.width !== undefined) {
    dialog.style.width = typeof options.width === "number" ? `${options.width}px` : options.width;
  }

  // Update position
  if (options.position) {
    // Need to show dialog first to get accurate dimensions
    if (!dialog.open) {
      dialog.style.visibility = "hidden";
      dialog.show();
    }
    applyPosition(dialog, options.position);
    dialog.style.visibility = "";
  }

  // Setup close callback (can be updated)
  if (options.close) {
    // Remove old listener if exists
    if (state.closeCallback) {
      dialog.removeEventListener("close", state.closeCallback);
    }
    state.closeCallback = () => options.close.call(dialog);
    dialog.addEventListener("close", state.closeCallback);
  }

  // Make draggable (once)
  if (!state.draggable) {
    makeDraggable(dialog, ".dialog-header");
    state.draggable = true;
  }

  // Make resizable if not disabled
  if (options.resizable !== false && !state.resizable) {
    makeResizable(dialog);
    state.resizable = true;
  }

  // Setup buttons if provided
  if (options.buttons) {
    setupButtons(dialog, options.buttons);
  }

  state.initialized = true;
  dialogStates.set(dialog.id, state);

  // Show the dialog
  if (!dialog.open) {
    dialog.show();
  }

  return dialog;
}

/**
 * Update an open editor dialog's options
 * @param {string|HTMLElement} selector - Dialog element or selector
 * @param {Object} options - Options to update (title, width, position)
 */
export function updateEditorDialog(selector, options = {}) {
  const element = typeof selector === "string"
    ? document.querySelector(selector)
    : selector;

  if (!element) return;

  // Find the dialog (might be converted)
  const dialog = element.tagName === "DIALOG" ? element : element;

  if (options.title !== undefined) {
    const titleEl = dialog.querySelector(".dialog-title");
    if (titleEl) titleEl.textContent = options.title;
  }

  if (options.width !== undefined) {
    dialog.style.width = typeof options.width === "number" ? `${options.width}px` : options.width;
  }

  if (options.position) {
    applyPosition(dialog, options.position);
  }
}

/**
 * Close an editor dialog
 * @param {string|HTMLElement} selector - Dialog element or selector
 */
export function closeEditorDialog(selector) {
  const element = typeof selector === "string"
    ? document.querySelector(selector)
    : selector;

  if (element && element.open) {
    element.close();
  }
}

/**
 * Convert a div.dialog to a native dialog element
 * Preserves the original content and adds header structure
 * @param {HTMLElement} div - The div element to convert
 * @returns {HTMLDialogElement} The converted dialog element
 */
function convertToDialog(div) {
  // Check if already converted
  if (div._convertedDialog) {
    return div._convertedDialog;
  }

  // Create dialog element
  const dialog = document.createElement("dialog");
  dialog.id = div.id;
  dialog.className = div.className + " native-editor-dialog";

  // Create header
  const header = document.createElement("header");
  header.className = "dialog-header";
  header.innerHTML = `
    <span class="dialog-title"></span>
    <button type="button" class="dialog-close" data-tip="Close">&times;</button>
  `;

  // Create content wrapper
  const content = document.createElement("div");
  content.className = "dialog-content";

  // Move all children to content
  while (div.firstChild) {
    content.appendChild(div.firstChild);
  }

  dialog.appendChild(header);
  dialog.appendChild(content);

  // Close button handler
  header.querySelector(".dialog-close").addEventListener("click", () => {
    dialog.close();
  });

  // Replace div with dialog
  div.parentNode.replaceChild(dialog, div);

  // Store reference
  div._convertedDialog = dialog;

  return dialog;
}

/**
 * Make a container's children sortable via drag and drop
 * @param {HTMLElement} container - The container element
 * @param {Object} options - Sortable options
 * @param {string} options.items - Selector for sortable items (default: "> *")
 * @param {string} options.handle - Selector for drag handle within item (optional)
 * @param {string} options.cancel - Selector for non-draggable items (optional)
 * @param {string} options.axis - Restrict to "x" or "y" axis (optional)
 * @param {Function} options.update - Callback when order changes (item, oldIndex, newIndex)
 */
export function makeSortable(container, options = {}) {
  const {
    items = "> *",
    handle = null,
    cancel = null,
    axis = null,
    update = null
  } = options;

  let draggedItem = null;
  let placeholder = null;
  let startIndex = -1;

  const getItems = () => Array.from(container.querySelectorAll(items));

  const getCoords = (e) => {
    if (e.touches && e.touches.length) {
      return {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }
    return {x: e.clientX, y: e.clientY};
  };

  const isValidTarget = (target, item) => {
    // Check if target is within a cancel element
    if (cancel && target.closest(cancel)) return false;
    // Check if handle is required and target is within handle
    if (handle && !target.closest(handle)) return false;
    return true;
  };

  const createPlaceholder = (item) => {
    const ph = document.createElement(item.tagName);
    ph.className = item.className + " sortable-placeholder";
    ph.style.height = item.offsetHeight + "px";
    ph.style.opacity = "0.3";
    ph.style.border = "2px dashed #666";
    ph.style.background = "transparent";
    return ph;
  };

  const startDrag = (e) => {
    const target = e.target;
    const item = target.closest(items);
    if (!item || !container.contains(item)) return;
    if (!isValidTarget(target, item)) return;

    e.preventDefault();
    draggedItem = item;
    startIndex = getItems().indexOf(item);

    // Create placeholder
    placeholder = createPlaceholder(item);
    item.parentNode.insertBefore(placeholder, item);

    // Style dragged item
    const rect = item.getBoundingClientRect();
    item.style.position = "fixed";
    item.style.zIndex = "10000";
    item.style.width = rect.width + "px";
    item.style.left = rect.left + "px";
    item.style.top = rect.top + "px";
    item.style.opacity = "0.8";
    item.style.pointerEvents = "none";
    item.classList.add("sortable-dragging");
  };

  const onDrag = (e) => {
    if (!draggedItem) return;
    e.preventDefault();

    const coords = getCoords(e);

    // Move dragged item
    if (axis !== "x") {
      draggedItem.style.top = coords.y - draggedItem.offsetHeight / 2 + "px";
    }
    if (axis !== "y") {
      draggedItem.style.left = coords.x - draggedItem.offsetWidth / 2 + "px";
    }

    // Find item under cursor and move placeholder
    const itemsArray = getItems().filter(i => i !== draggedItem);
    for (const item of itemsArray) {
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const midX = rect.left + rect.width / 2;

      if (axis === "y" || axis === null) {
        if (coords.y < midY && placeholder.nextElementSibling !== item) {
          item.parentNode.insertBefore(placeholder, item);
          break;
        } else if (coords.y >= midY && placeholder.previousElementSibling !== item) {
          item.parentNode.insertBefore(placeholder, item.nextElementSibling);
        }
      }
    }
  };

  const endDrag = () => {
    if (!draggedItem) return;

    // Reset styles
    draggedItem.style.position = "";
    draggedItem.style.zIndex = "";
    draggedItem.style.width = "";
    draggedItem.style.left = "";
    draggedItem.style.top = "";
    draggedItem.style.opacity = "";
    draggedItem.style.pointerEvents = "";
    draggedItem.classList.remove("sortable-dragging");

    // Insert item where placeholder is
    placeholder.parentNode.insertBefore(draggedItem, placeholder);
    placeholder.remove();

    // Calculate new index and call update callback
    const newIndex = getItems().indexOf(draggedItem);
    if (update && startIndex !== newIndex) {
      update(draggedItem, startIndex, newIndex);
    }

    draggedItem = null;
    placeholder = null;
    startIndex = -1;
  };

  // Mouse events
  container.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", endDrag);

  // Touch events
  container.addEventListener("touchstart", startDrag, {passive: false});
  document.addEventListener("touchmove", onDrag, {passive: false});
  document.addEventListener("touchend", endDrag);

  // Return cleanup function
  return () => {
    container.removeEventListener("mousedown", startDrag);
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", endDrag);
    container.removeEventListener("touchstart", startDrag);
    document.removeEventListener("touchmove", onDrag);
    document.removeEventListener("touchend", endDrag);
  };
}

/**
 * Show an alert dialog with custom title, message and buttons
 * Replaces jQuery UI's $("#alert").dialog({...}) pattern
 * @param {Object} options - Dialog options
 * @param {string} options.message - HTML message content
 * @param {string} options.title - Dialog title (default: "Alert")
 * @param {Object} options.buttons - Button label -> callback pairs
 * @param {string} options.width - Dialog width (default: "auto")
 * @param {Function} options.close - Callback when dialog closes
 * @param {Function} options.open - Callback when dialog opens
 * @returns {HTMLDialogElement} The dialog element
 */
export function alertDialog(options = {}) {
  const {
    message = "",
    title = "Alert",
    buttons = {Ok: null},
    width = "auto",
    close = null,
    open = null
  } = options;

  // Get or create the alert dialog
  let dialog = document.getElementById("nativeAlertDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "nativeAlertDialog";
    dialog.className = "dialog native-dialog";
    dialog.innerHTML = `
      <header class="dialog-header">
        <span class="dialog-title"></span>
        <button type="button" class="dialog-close" aria-label="Close">&times;</button>
      </header>
      <div class="dialog-content">
        <p class="dialog-message"></p>
      </div>
      <div class="dialog-buttons"></div>
    `;
    document.body.appendChild(dialog);

    // Make it draggable
    makeDraggable(dialog, ".dialog-header");

    // Close button
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());

    // Close on backdrop click
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });

    // Handle escape key
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "Escape") dialog.close();
    });
  }

  // Set title
  dialog.querySelector(".dialog-title").textContent = title;

  // Set message (supports HTML)
  dialog.querySelector(".dialog-message").innerHTML = message;

  // Set width
  dialog.style.width = typeof width === "number" ? `${width}px` : width;

  // Setup buttons
  const buttonContainer = dialog.querySelector(".dialog-buttons");
  buttonContainer.innerHTML = "";

  // Store close callback for this invocation
  const currentClose = close;

  // Remove previous close listener and add new one
  const closeHandler = () => {
    if (currentClose) currentClose.call(dialog);
  };
  dialog.removeEventListener("close", dialog._closeHandler);
  dialog._closeHandler = closeHandler;
  dialog.addEventListener("close", closeHandler);

  for (const [label, handler] of Object.entries(buttons)) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = "dialog-btn";
    btn.addEventListener("click", function() {
      if (handler) handler.call(dialog);
      else dialog.close();
    });
    buttonContainer.appendChild(btn);
  }

  // Show the dialog
  if (!dialog.open) {
    dialog.show();
    if (open) open.call(dialog, buttonContainer);
  }

  return dialog;
}

/**
 * Show a confirmation dialog with Yes/No or custom buttons
 * @param {Object} options - Dialog options
 * @param {string} options.message - HTML message content
 * @param {string} options.title - Dialog title (default: "Confirm")
 * @param {Function} options.onConfirm - Callback when confirmed
 * @param {Function} options.onCancel - Callback when cancelled
 * @param {string} options.confirmText - Confirm button text (default: "Confirm")
 * @param {string} options.cancelText - Cancel button text (default: "Cancel")
 * @returns {HTMLDialogElement} The dialog element
 */
export function confirmDialog(options = {}) {
  const {
    message = "Are you sure?",
    title = "Confirm",
    onConfirm = null,
    onCancel = null,
    confirmText = "Confirm",
    cancelText = "Cancel",
    width = "auto"
  } = options;

  const buttons = {};
  buttons[confirmText] = function() {
    this.close();
    if (onConfirm) onConfirm();
  };
  buttons[cancelText] = function() {
    this.close();
    if (onCancel) onCancel();
  };

  return alertDialog({
    message,
    title,
    buttons,
    width,
    close: onCancel
  });
}

/**
 * Show a prompt dialog with input field
 * @param {Object} options - Dialog options
 * @param {string} options.message - HTML message content
 * @param {string} options.title - Dialog title (default: "Input")
 * @param {string} options.defaultValue - Default input value
 * @param {string} options.inputType - Input type (default: "text")
 * @param {Function} options.onConfirm - Callback with input value when confirmed
 * @param {Function} options.onCancel - Callback when cancelled
 * @returns {HTMLDialogElement} The dialog element
 */
export function promptDialog(options = {}) {
  const {
    message = "",
    title = "Input",
    defaultValue = "",
    inputType = "text",
    placeholder = "",
    onConfirm = null,
    onCancel = null,
    width = "auto"
  } = options;

  // Get or create the prompt dialog
  let dialog = document.getElementById("nativePromptDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "nativePromptDialog";
    dialog.className = "dialog native-dialog";
    dialog.innerHTML = `
      <header class="dialog-header">
        <span class="dialog-title"></span>
        <button type="button" class="dialog-close" aria-label="Close">&times;</button>
      </header>
      <form class="dialog-content" method="dialog">
        <div class="dialog-message"></div>
        <input type="text" class="dialog-input" autocomplete="off" />
        <div class="dialog-buttons">
          <button type="submit" class="dialog-btn confirm-btn">Confirm</button>
          <button type="button" class="dialog-btn cancel-btn">Cancel</button>
        </div>
      </form>
    `;
    document.body.appendChild(dialog);

    // Make it draggable
    makeDraggable(dialog, ".dialog-header");

    // Close button
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());

    // Close on backdrop click
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  // Set title
  dialog.querySelector(".dialog-title").textContent = title;

  // Set message
  dialog.querySelector(".dialog-message").innerHTML = message;

  // Setup input
  const input = dialog.querySelector(".dialog-input");
  input.type = inputType;
  input.value = defaultValue;
  input.placeholder = placeholder;

  // Set width
  dialog.style.width = typeof width === "number" ? `${width}px` : width;

  // Setup form submission
  const form = dialog.querySelector("form");
  const confirmBtn = dialog.querySelector(".confirm-btn");
  const cancelBtn = dialog.querySelector(".cancel-btn");

  // Remove old listeners
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  const newInput = newForm.querySelector(".dialog-input");
  const newConfirmBtn = newForm.querySelector(".confirm-btn");
  const newCancelBtn = newForm.querySelector(".cancel-btn");

  newForm.addEventListener("submit", (e) => {
    e.preventDefault();
    dialog.close();
    if (onConfirm) onConfirm(newInput.value);
  });

  newCancelBtn.addEventListener("click", () => {
    dialog.close();
    if (onCancel) onCancel();
  });

  // Show the dialog
  if (!dialog.open) {
    dialog.show();
    newInput.focus();
    newInput.select();
  }

  return dialog;
}

/**
 * Close the native alert dialog
 */
export function closeAlertDialog() {
  const dialog = document.getElementById("nativeAlertDialog");
  if (dialog && dialog.open) dialog.close();
}

/**
 * Close the native prompt dialog
 */
export function closePromptDialog() {
  const dialog = document.getElementById("nativePromptDialog");
  if (dialog && dialog.open) dialog.close();
}

// Expose globally for gradual migration
if (typeof window !== "undefined") {
  window.initDialog = initDialog;
  window.closeDialog = closeDialog;
  window.destroyDialog = destroyDialog;
  window.closeAllDialogs = closeAllDialogs;
  window.$dialog = $dialog;
  window.makeDraggable = makeDraggable;
  window.makeResizable = makeResizable;
  window.makeSortable = makeSortable;
  window.alertDialog = alertDialog;
  window.confirmDialog = confirmDialog;
  window.promptDialog = promptDialog;
  window.closeAlertDialog = closeAlertDialog;
  window.closePromptDialog = closePromptDialog;
  window.openEditorDialog = openEditorDialog;
  window.updateEditorDialog = updateEditorDialog;
  window.closeEditorDialog = closeEditorDialog;
}
