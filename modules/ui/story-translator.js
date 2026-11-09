"use strict";

import {byId} from "../../utils/shorthands.js";
import {DataLayer} from "../ai/data-layer.js";

const API_BASE = "/api/ai";
let models = null;
let isOpen = false;
let pendingChangeSet = null;
let selectedChanges = new Set();

// Initialize the Story Translator
async function initStoryTranslator() {
  const panel = byId("storyTranslatorPanel");
  if (!panel) return;

  // Load available models
  try {
    const response = await fetch(`${API_BASE}/models`);
    if (response.ok) {
      const data = await response.json();
      models = data.models;
      populateModelSelector();
      setStatus("Ready", "ready");
    } else {
      const error = await response.json();
      setStatus(error.error || "AI unavailable", "error");
      byId("storyTranslatorTranslate").disabled = true;
    }
  } catch (error) {
    setStatus("Server not running", "error");
    byId("storyTranslatorTranslate").disabled = true;
  }

  // Add event listeners
  byId("storyTranslatorClose").addEventListener("click", closeStoryTranslator);
  byId("storyTranslatorTranslate").addEventListener("click", translateNarrative);
  byId("storyTranslatorApply").addEventListener("click", applySelectedChanges);
  byId("storyTranslatorNarrative").addEventListener("keydown", handleKeydown);
  byId("storyTranslatorMinimize").addEventListener("click", toggleMinimize);
  byId("storyTranslatorSelectAll").addEventListener("click", selectAllChanges);
  byId("storyTranslatorSelectNone").addEventListener("click", selectNoChanges);

  // Make panel draggable
  makeDraggable(panel);
}

function populateModelSelector() {
  const select = byId("storyTranslatorModel");
  select.innerHTML = "";

  if (!models) return;

  Object.entries(models).forEach(([id, info]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${info.name} (${info.provider})`;
    select.appendChild(option);
  });

  // Restore saved model preference
  const savedModel = localStorage.getItem("fmg-story-translator-model");
  if (savedModel && models[savedModel]) {
    select.value = savedModel;
  }
}

function openStoryTranslator() {
  const panel = byId("storyTranslatorPanel");
  if (!panel) return;

  panel.style.display = "flex";
  isOpen = true;
  byId("storyTranslatorNarrative").focus();
}

function closeStoryTranslator() {
  const panel = byId("storyTranslatorPanel");
  if (!panel) return;

  panel.style.display = "none";
  isOpen = false;
}

function toggleStoryTranslator() {
  if (isOpen) {
    closeStoryTranslator();
  } else {
    openStoryTranslator();
  }
}

function toggleMinimize() {
  const panel = byId("storyTranslatorPanel");
  const body = byId("storyTranslatorBody");
  const btn = byId("storyTranslatorMinimize");

  if (body.style.display === "none") {
    body.style.display = "flex";
    btn.textContent = "_";
    panel.style.height = "";
  } else {
    body.style.display = "none";
    btn.textContent = "+";
    panel.style.height = "auto";
  }
}

function handleKeydown(e) {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    translateNarrative();
  }
}

function setStatus(text, className) {
  const statusEl = byId("storyTranslatorStatus");
  statusEl.textContent = text;
  statusEl.className = "ai-status " + className;
}

async function translateNarrative() {
  const narrative = byId("storyTranslatorNarrative").value.trim();
  if (!narrative) {
    tip("Please enter a narrative event", true, "error", 3000);
    return;
  }

  const model = byId("storyTranslatorModel").value;
  localStorage.setItem("fmg-story-translator-model", model);

  const translateBtn = byId("storyTranslatorTranslate");
  const applyBtn = byId("storyTranslatorApply");
  const changesContainer = byId("storyTranslatorChanges");

  // Disable UI during request
  translateBtn.disabled = true;
  applyBtn.disabled = true;
  setStatus("Encoding map...", "loading");
  changesContainer.innerHTML = "";
  pendingChangeSet = null;
  selectedChanges.clear();

  try {
    // Encode current map context
    const context = DataLayer.encode.fullContext(pack, {
      includeRoutes: false,
      includeZones: false
    });

    setStatus("Translating narrative...", "loading");

    // Add story-specific prefix to prompt
    const storyPrompt = `NARRATIVE EVENT: "${narrative}"

Translate this narrative event into map changes. Consider:
- Which states, cities, or regions are affected?
- What markers should be added (ruins, battlefields, monuments)?
- What diplomatic changes occur (wars, alliances, treaties)?
- Should any notes be created to document the event?

Make changes that reflect the narrative authentically.`;

    const response = await fetch(`${API_BASE}/map-edit`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({model, prompt: storyPrompt, context})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    if (data.raw) {
      setStatus("Invalid response", "error");
      changesContainer.innerHTML = `<div class="change-error">AI response was not valid JSON:<br><pre>${escapeHtml(data.raw)}</pre></div>`;
      return;
    }

    // Validate the ChangeSet
    const validation = DataLayer.batch.validate(data.changeSet, pack);
    pendingChangeSet = data.changeSet;

    // Display proposed changes as checkboxes
    displayProposedChanges(data.changeSet, validation);

    if (validation.errors.length > 0) {
      setStatus("Has errors", "error");
    } else if (validation.warnings.length > 0) {
      setStatus("Ready (with warnings)", "warning");
      applyBtn.disabled = false;
    } else {
      setStatus("Ready to apply", "ready");
      applyBtn.disabled = false;
    }

    // Show usage info
    if (data.usage) {
      const promptTokens = data.usage.prompt_tokens || data.usage.promptTokens || 0;
      const completionTokens = data.usage.completion_tokens || data.usage.completionTokens || 0;
      const tokens = promptTokens + completionTokens;
      if (tokens > 0) {
        const statusEl = byId("storyTranslatorStatus");
        statusEl.textContent += ` (${tokens} tokens)`;
      }
    }

  } catch (error) {
    setStatus("Error", "error");
    changesContainer.innerHTML = `<div class="change-error">${escapeHtml(error.message)}</div>`;
  } finally {
    translateBtn.disabled = false;
  }
}

function displayProposedChanges(changeSet, validation) {
  const container = byId("storyTranslatorChanges");
  container.innerHTML = "";

  const changes = [];

  // Process creates
  if (changeSet.create) {
    Object.entries(changeSet.create).forEach(([type, items]) => {
      if (Array.isArray(items)) {
        items.forEach((item, idx) => {
          const id = `create-${type}-${idx}`;
          changes.push({
            id,
            type: "create",
            entityType: type,
            item,
            label: formatChangeLabel("Create", type, item)
          });
        });
      }
    });
  }

  // Process updates
  if (changeSet.update) {
    Object.entries(changeSet.update).forEach(([type, items]) => {
      if (Array.isArray(items)) {
        items.forEach((item, idx) => {
          const id = `update-${type}-${idx}`;
          changes.push({
            id,
            type: "update",
            entityType: type,
            item,
            label: formatChangeLabel("Update", type, item)
          });
        });
      }
    });
  }

  // Process deletes
  if (changeSet.delete) {
    Object.entries(changeSet.delete).forEach(([type, ids]) => {
      if (Array.isArray(ids)) {
        ids.forEach((itemId, idx) => {
          const id = `delete-${type}-${idx}`;
          changes.push({
            id,
            type: "delete",
            entityType: type,
            itemId,
            label: formatDeleteLabel(type, itemId)
          });
        });
      }
    });
  }

  if (changes.length === 0) {
    container.innerHTML = '<div class="no-changes">No changes proposed</div>';
    return;
  }

  // Create validation lookup
  const errorMap = new Map();
  const warningMap = new Map();
  validation.errors.forEach(e => {
    const key = e.field || "unknown";
    if (!errorMap.has(key)) errorMap.set(key, []);
    errorMap.get(key).push(e.message);
  });
  validation.warnings.forEach(w => {
    const key = w.field || "unknown";
    if (!warningMap.has(key)) warningMap.set(key, []);
    warningMap.get(key).push(w.message);
  });

  // Render each change as a checkbox row
  changes.forEach(change => {
    const row = document.createElement("div");
    row.className = "change-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = change.id;
    checkbox.checked = true;
    selectedChanges.add(change.id);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedChanges.add(change.id);
      } else {
        selectedChanges.delete(change.id);
      }
      updateApplyButtonState();
    });

    const label = document.createElement("label");
    label.htmlFor = change.id;
    label.innerHTML = change.label;

    // Add error/warning indicators
    const fieldKey = `${change.type}.${change.entityType}`;
    if (errorMap.has(fieldKey)) {
      label.innerHTML += ` <span class="change-error-badge" title="${escapeHtml(errorMap.get(fieldKey).join("; "))}">!</span>`;
      checkbox.disabled = true;
      checkbox.checked = false;
      selectedChanges.delete(change.id);
    } else if (warningMap.has(fieldKey)) {
      label.innerHTML += ` <span class="change-warning-badge" title="${escapeHtml(warningMap.get(fieldKey).join("; "))}">?</span>`;
    }

    row.appendChild(checkbox);
    row.appendChild(label);
    row.dataset.changeId = change.id;
    row.dataset.changeData = JSON.stringify(change);
    container.appendChild(row);
  });
}

function formatChangeLabel(action, type, item) {
  const typeSingular = type.replace(/s$/, "");
  let name = item.name || item.i || "unknown";

  if (type === "states") {
    const existing = pack.states[item.i];
    if (existing && action === "Update") {
      return `<strong>${typeSingular} "${existing.name}"</strong> → Update to "${item.name || existing.name}"${item.form ? `, form: ${item.form}` : ""}`;
    }
    return `<strong>${typeSingular}</strong> → Create "${name}"${item.form ? ` (${item.form})` : ""}`;
  }

  if (type === "burgs") {
    return `<strong>${typeSingular}</strong> → ${action} "${name}"`;
  }

  if (type === "markers") {
    return `<strong>Marker</strong> → ${action} "${item.type || "marker"}"${item.x && item.y ? ` at (${Math.round(item.x)}, ${Math.round(item.y)})` : ""}`;
  }

  if (type === "notes") {
    return `<strong>Note</strong> → ${action} "${name}"`;
  }

  if (type === "military") {
    const total = (item.infantry || 0) + (item.cavalry || 0) + (item.artillery || 0) + (item.archers || 0);
    return `<strong>Military</strong> → ${action} "${item.name || "unit"}"${total ? ` (${total} troops)` : ""}`;
  }

  return `<strong>${typeSingular}</strong> → ${action} #${item.i || "new"}`;
}

function formatDeleteLabel(type, itemId) {
  const typeSingular = type.replace(/s$/, "");

  if (type === "states") {
    const existing = pack.states[itemId];
    return `<strong>${typeSingular}</strong> → Delete "${existing?.name || itemId}"`;
  }

  if (type === "burgs") {
    const existing = pack.burgs[itemId];
    return `<strong>${typeSingular}</strong> → Delete "${existing?.name || itemId}"`;
  }

  if (type === "markers") {
    const existing = pack.markers?.find(m => m.i === itemId);
    return `<strong>Marker</strong> → Delete "${existing?.type || itemId}"`;
  }

  return `<strong>${typeSingular}</strong> → Delete #${itemId}`;
}

function selectAllChanges() {
  const checkboxes = byId("storyTranslatorChanges").querySelectorAll('input[type="checkbox"]:not(:disabled)');
  checkboxes.forEach(cb => {
    cb.checked = true;
    selectedChanges.add(cb.id);
  });
  updateApplyButtonState();
}

function selectNoChanges() {
  const checkboxes = byId("storyTranslatorChanges").querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = false;
    selectedChanges.delete(cb.id);
  });
  updateApplyButtonState();
}

function updateApplyButtonState() {
  byId("storyTranslatorApply").disabled = selectedChanges.size === 0;
}

function applySelectedChanges() {
  if (!pendingChangeSet || selectedChanges.size === 0) {
    tip("No changes selected", true, "error", 3000);
    return;
  }

  try {
    // Build filtered changeSet based on selected checkboxes
    const filteredChangeSet = {create: {}, update: {}, delete: {}};

    // Get all change rows
    const rows = byId("storyTranslatorChanges").querySelectorAll(".change-row");
    rows.forEach(row => {
      const changeId = row.dataset.changeId;
      if (!selectedChanges.has(changeId)) return;

      const changeData = JSON.parse(row.dataset.changeData);
      const {type, entityType, item, itemId} = changeData;

      if (type === "create") {
        if (!filteredChangeSet.create[entityType]) filteredChangeSet.create[entityType] = [];
        filteredChangeSet.create[entityType].push(item);
      } else if (type === "update") {
        if (!filteredChangeSet.update[entityType]) filteredChangeSet.update[entityType] = [];
        filteredChangeSet.update[entityType].push(item);
      } else if (type === "delete") {
        if (!filteredChangeSet.delete[entityType]) filteredChangeSet.delete[entityType] = [];
        filteredChangeSet.delete[entityType].push(itemId);
      }
    });

    // Apply using the same logic as AI Map Editor
    applyCreates(filteredChangeSet.create);
    applyUpdates(filteredChangeSet.update);
    applyDeletes(filteredChangeSet.delete);

    // Clear state
    pendingChangeSet = null;
    selectedChanges.clear();
    byId("storyTranslatorApply").disabled = true;
    setStatus("Applied!", "ready");

    // Trigger map redraw
    if (typeof refreshAllData === "function") {
      refreshAllData();
    }

    tip("Changes applied successfully", true, "success", 3000);

  } catch (error) {
    tip(`Failed to apply changes: ${error.message}`, true, "error", 5000);
  }
}

// Apply functions (reused from ai-map-editor.js)
function applyCreates(creates) {
  if (creates.states?.length) {
    creates.states.forEach(state => {
      const id = state.i;
      if (!pack.states[id]) {
        pack.states[id] = {
          i: id,
          name: state.name || "New State",
          form: state.form || "Monarchy",
          color: state.color || getRandomColor(),
          capital: state.capital || 0,
          culture: state.culture || 0,
          cells: 0,
          burgs: 0,
          area: 0,
          urban: 0,
          rural: 0,
          neighbors: state.neighbors || [],
          diplomacy: state.diplomacy || []
        };
      }
    });
  }

  if (creates.burgs?.length) {
    creates.burgs.forEach(burg => {
      const id = burg.i;
      if (!pack.burgs[id]) {
        pack.burgs[id] = {
          i: id,
          name: burg.name || "New Burg",
          cell: burg.cell,
          x: burg.x,
          y: burg.y,
          state: burg.state || 0,
          population: burg.population || 1,
          capital: burg.capital || 0,
          port: burg.port || 0,
          walls: burg.walls || 0,
          temple: burg.temple || 0,
          shanty: burg.shanty || 0,
          citadel: burg.citadel || 0,
          plaza: burg.plaza || 0
        };
      }
    });
  }

  if (creates.markers?.length) {
    creates.markers.forEach(marker => {
      const id = marker.i;
      const existing = pack.markers?.find(m => m.i === id);
      if (!existing) {
        if (!pack.markers) pack.markers = [];
        pack.markers.push({
          i: id,
          type: marker.type,
          x: marker.x,
          y: marker.y,
          cell: marker.cell,
          icon: marker.icon || ""
        });
      }
    });
  }

  if (creates.notes?.length) {
    creates.notes.forEach(note => {
      const id = note.id;
      const existing = notes?.find(n => n.id === id);
      if (!existing) {
        if (!notes) window.notes = [];
        notes.push({
          id: id,
          name: note.name || "New Note",
          legend: note.legend || ""
        });
      }
    });
  }

  if (creates.military?.length) {
    creates.military.forEach(unit => {
      const stateId = unit.state;
      const state = pack.states[stateId];
      if (state && !state.removed) {
        if (!state.military) state.military = [];
        const existingIdx = state.military.findIndex(m => m.i === unit.i);
        if (existingIdx === -1) {
          const u = {};
          if (unit.infantry) u.infantry = unit.infantry;
          if (unit.cavalry) u.cavalry = unit.cavalry;
          if (unit.artillery) u.artillery = unit.artillery;
          if (unit.archers) u.archers = unit.archers;
          if (unit.fleet) u.fleet = unit.fleet;

          const totalStrength = unit.n || Object.values(u).reduce((sum, v) => sum + v, 0);

          state.military.push({
            i: unit.i,
            a: totalStrength,
            cell: unit.cell,
            x: unit.x,
            y: unit.y,
            bx: unit.x,
            by: unit.y,
            u,
            n: 1,
            name: unit.name || "Regiment",
            state: stateId
          });
        }
      }
    });
  }

  if (creates.cultures?.length) {
    creates.cultures.forEach(culture => {
      const id = culture.i;
      if (!pack.cultures[id]) {
        pack.cultures[id] = {
          i: id,
          name: culture.name || "New Culture",
          type: culture.type || "Generic",
          base: culture.base || 0,
          code: culture.code || "xx"
        };
      }
    });
  }

  if (creates.religions?.length) {
    creates.religions.forEach(religion => {
      const id = religion.i;
      if (!pack.religions[id]) {
        pack.religions[id] = {
          i: id,
          name: religion.name || "New Religion",
          type: religion.type || "Folk",
          form: religion.form || "Spirits",
          culture: religion.culture || 0
        };
      }
    });
  }

  if (creates.provinces?.length) {
    creates.provinces.forEach(province => {
      const id = province.i;
      if (!pack.provinces[id]) {
        pack.provinces[id] = {
          i: id,
          name: province.name || "New Province",
          state: province.state || 0,
          burg: province.burg || 0,
          formName: province.formName || "Province"
        };
      }
    });
  }
}

function applyUpdates(updates) {
  if (updates.states?.length) {
    updates.states.forEach(update => {
      const state = pack.states[update.i];
      if (state && !state.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") state[key] = update[key];
        });
      }
    });
  }

  if (updates.burgs?.length) {
    updates.burgs.forEach(update => {
      const burg = pack.burgs[update.i];
      if (burg && !burg.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") burg[key] = update[key];
        });
      }
    });
  }

  if (updates.markers?.length) {
    updates.markers.forEach(update => {
      const marker = pack.markers?.find(m => m.i === update.i);
      if (marker) {
        Object.keys(update).forEach(key => {
          if (key !== "i") marker[key] = update[key];
        });
      }
    });
  }

  if (updates.notes?.length) {
    updates.notes.forEach(update => {
      const note = notes?.find(n => n.id === update.id);
      if (note) {
        Object.keys(update).forEach(key => {
          if (key !== "id") note[key] = update[key];
        });
      }
    });
  }

  if (updates.military?.length) {
    updates.military.forEach(update => {
      for (const state of pack.states) {
        if (!state?.military) continue;
        const unit = state.military.find(m => m.i === update.i);
        if (unit) {
          Object.keys(update).forEach(key => {
            if (key !== "i") unit[key] = update[key];
          });
          break;
        }
      }
    });
  }

  if (updates.cultures?.length) {
    updates.cultures.forEach(update => {
      const culture = pack.cultures[update.i];
      if (culture && !culture.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") culture[key] = update[key];
        });
      }
    });
  }

  if (updates.religions?.length) {
    updates.religions.forEach(update => {
      const religion = pack.religions[update.i];
      if (religion && !religion.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") religion[key] = update[key];
        });
      }
    });
  }

  if (updates.provinces?.length) {
    updates.provinces.forEach(update => {
      const province = pack.provinces[update.i];
      if (province && !province.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") province[key] = update[key];
        });
      }
    });
  }
}

function applyDeletes(deletes) {
  if (deletes.states?.length) {
    deletes.states.forEach(id => {
      if (pack.states[id]) pack.states[id].removed = true;
    });
  }

  if (deletes.burgs?.length) {
    deletes.burgs.forEach(id => {
      if (pack.burgs[id]) pack.burgs[id].removed = true;
    });
  }

  if (deletes.markers?.length) {
    deletes.markers.forEach(id => {
      const idx = pack.markers?.findIndex(m => m.i === id);
      if (idx >= 0) pack.markers.splice(idx, 1);
    });
  }

  if (deletes.notes?.length) {
    deletes.notes.forEach(id => {
      const idx = notes?.findIndex(n => n.id === id);
      if (idx >= 0) notes.splice(idx, 1);
    });
  }

  if (deletes.military?.length) {
    deletes.military.forEach(id => {
      for (const state of pack.states) {
        if (!state?.military) continue;
        const idx = state.military.findIndex(m => m.i === id);
        if (idx >= 0) {
          state.military.splice(idx, 1);
          break;
        }
      }
    });
  }

  if (deletes.cultures?.length) {
    deletes.cultures.forEach(id => {
      if (pack.cultures[id]) pack.cultures[id].removed = true;
    });
  }

  if (deletes.religions?.length) {
    deletes.religions.forEach(id => {
      if (pack.religions[id]) pack.religions[id].removed = true;
    });
  }

  if (deletes.provinces?.length) {
    deletes.provinces.forEach(id => {
      if (pack.provinces[id]) pack.provinces[id].removed = true;
    });
  }
}

function makeDraggable(element) {
  const header = element.querySelector(".ai-panel-header");
  if (!header) return;

  let isDragging = false;
  let offsetX, offsetY;

  header.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    offsetX = e.clientX - element.offsetLeft;
    offsetY = e.clientY - element.offsetTop;
    header.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    element.style.left = (e.clientX - offsetX) + "px";
    element.style.top = (e.clientY - offsetY) + "px";
    element.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    header.style.cursor = "grab";
  });
}

function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Export functions
if (typeof window !== "undefined") {
  window.initStoryTranslator = initStoryTranslator;
  window.openStoryTranslator = openStoryTranslator;
  window.closeStoryTranslator = closeStoryTranslator;
  window.toggleStoryTranslator = toggleStoryTranslator;
}

export {initStoryTranslator, openStoryTranslator, closeStoryTranslator, toggleStoryTranslator};
