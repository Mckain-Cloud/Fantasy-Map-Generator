"use strict";

import {byId} from "../../utils/shorthands.js";
import {DataLayer} from "../ai/data-layer.js";

const API_BASE = "/api/ai";
let models = null;
let isOpen = false;

// Initialize the AI Map Editor
async function initAIMapEditor() {
  const panel = byId("aiMapEditorPanel");
  if (!panel) return;

  // Load available models
  try {
    const response = await fetch(`${API_BASE}/models`);
    if (response.ok) {
      const data = await response.json();
      models = data.models;
      populateModelSelector();
      byId("aiMapEditorStatus").textContent = "Ready";
      byId("aiMapEditorStatus").className = "ready";
    } else {
      const error = await response.json();
      byId("aiMapEditorStatus").textContent = error.error || "AI unavailable";
      byId("aiMapEditorStatus").className = "error";
      byId("aiMapEditorSend").disabled = true;
    }
  } catch (error) {
    byId("aiMapEditorStatus").textContent = "Server not running";
    byId("aiMapEditorStatus").className = "error";
    byId("aiMapEditorSend").disabled = true;
  }

  // Add event listeners
  byId("aiMapEditorClose").addEventListener("click", closeAIMapEditor);
  byId("aiMapEditorSend").addEventListener("click", sendRequest);
  byId("aiMapEditorApply").addEventListener("click", applyChanges);
  byId("aiMapEditorPrompt").addEventListener("keydown", handleKeydown);
  byId("aiMapEditorMinimize").addEventListener("click", toggleMinimize);

  // Make panel draggable
  makeDraggable(panel);
}

function populateModelSelector() {
  const select = byId("aiMapEditorModel");
  select.innerHTML = "";

  if (!models) return;

  Object.entries(models).forEach(([id, info]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${info.name} (${info.provider})`;
    select.appendChild(option);
  });

  // Restore saved model preference
  const savedModel = localStorage.getItem("fmg-ai-map-editor-model");
  if (savedModel && models[savedModel]) {
    select.value = savedModel;
  }
}

function openAIMapEditor() {
  const panel = byId("aiMapEditorPanel");
  if (!panel) return;

  panel.style.display = "flex";
  isOpen = true;
  byId("aiMapEditorPrompt").focus();
}

function closeAIMapEditor() {
  const panel = byId("aiMapEditorPanel");
  if (!panel) return;

  panel.style.display = "none";
  isOpen = false;
}

function toggleAIMapEditor() {
  if (isOpen) {
    closeAIMapEditor();
  } else {
    openAIMapEditor();
  }
}

function toggleMinimize() {
  const panel = byId("aiMapEditorPanel");
  const body = byId("aiMapEditorBody");
  const btn = byId("aiMapEditorMinimize");

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
    sendRequest();
  }
}

async function sendRequest() {
  const prompt = byId("aiMapEditorPrompt").value.trim();
  if (!prompt) {
    tip("Please enter a request", true, "error", 3000);
    return;
  }

  const model = byId("aiMapEditorModel").value;
  localStorage.setItem("fmg-ai-map-editor-model", model);

  const sendBtn = byId("aiMapEditorSend");
  const statusEl = byId("aiMapEditorStatus");
  const responseEl = byId("aiMapEditorResponse");
  const applyBtn = byId("aiMapEditorApply");

  // Disable UI during request
  sendBtn.disabled = true;
  applyBtn.disabled = true;
  statusEl.textContent = "Encoding map...";
  statusEl.className = "loading";
  responseEl.textContent = "";

  try {
    // Encode current map context
    const context = DataLayer.encode.fullContext(pack, {
      includeRoutes: false,
      includeZones: false
    });

    statusEl.textContent = "Sending to AI...";

    const response = await fetch(`${API_BASE}/map-edit`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({model, prompt, context})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    if (data.raw) {
      // AI returned non-JSON, show the raw response
      responseEl.textContent = `AI response (not valid JSON):\n\n${data.raw}`;
      statusEl.textContent = "Invalid response";
      statusEl.className = "error";
      return;
    }

    // Validate the ChangeSet
    const validation = DataLayer.batch.validate(data.changeSet, pack);

    // Store the changeSet for applying
    byId("aiMapEditorPanel").dataset.changeSet = JSON.stringify(data.changeSet);

    // Display the response
    let responseText = JSON.stringify(data.changeSet, null, 2);

    if (validation.errors.length > 0) {
      responseText += "\n\n--- Validation Errors ---\n";
      validation.errors.forEach(e => {
        responseText += `${e.field}: ${e.message}\n`;
      });
      statusEl.textContent = "Has errors";
      statusEl.className = "error";
    } else if (validation.warnings.length > 0) {
      responseText += "\n\n--- Warnings ---\n";
      validation.warnings.forEach(w => {
        responseText += `${w.field}: ${w.message}\n`;
      });
      statusEl.textContent = "Ready (with warnings)";
      statusEl.className = "warning";
      applyBtn.disabled = false;
    } else {
      statusEl.textContent = "Ready to apply";
      statusEl.className = "ready";
      applyBtn.disabled = false;
    }

    responseEl.textContent = responseText;

    // Show usage info
    if (data.usage) {
      const promptTokens = data.usage.prompt_tokens || data.usage.promptTokens || 0;
      const completionTokens = data.usage.completion_tokens || data.usage.completionTokens || 0;
      const tokens = promptTokens + completionTokens;
      if (tokens > 0) {
        statusEl.textContent += ` (${tokens} tokens)`;
      }
    }

  } catch (error) {
    statusEl.textContent = "Error";
    statusEl.className = "error";
    responseEl.textContent = error.message;
  } finally {
    sendBtn.disabled = false;
  }
}

function applyChanges() {
  const panel = byId("aiMapEditorPanel");
  const changeSetJson = panel.dataset.changeSet;

  if (!changeSetJson) {
    tip("No changes to apply", true, "error", 3000);
    return;
  }

  try {
    const changeSet = JSON.parse(changeSetJson);

    // Apply creates
    if (changeSet.create) {
      applyCreates(changeSet.create);
    }

    // Apply updates
    if (changeSet.update) {
      applyUpdates(changeSet.update);
    }

    // Apply deletes
    if (changeSet.delete) {
      applyDeletes(changeSet.delete);
    }

    // Clear the stored changeSet
    delete panel.dataset.changeSet;
    byId("aiMapEditorApply").disabled = true;
    byId("aiMapEditorStatus").textContent = "Applied!";
    byId("aiMapEditorStatus").className = "ready";

    // Trigger map redraw
    if (typeof refreshAllData === "function") {
      refreshAllData();
    }

    tip("Changes applied successfully", true, "success", 3000);

  } catch (error) {
    tip(`Failed to apply changes: ${error.message}`, true, "error", 5000);
  }
}

function applyCreates(creates) {
  // Apply state creates
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

  // Apply burg creates
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

  // Apply marker creates
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

  // Apply military creates
  if (creates.military?.length) {
    creates.military.forEach(unit => {
      const stateId = unit.state;
      const state = pack.states[stateId];
      if (state && !state.removed) {
        if (!state.military) state.military = [];
        const existingIdx = state.military.findIndex(m => m.i === unit.i);
        if (existingIdx === -1) {
          // Build unit composition from explicit fields
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

  // Apply culture creates
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

  // Apply religion creates
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

  // Apply province creates
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
  // Apply state updates
  if (updates.states?.length) {
    updates.states.forEach(update => {
      const state = pack.states[update.i];
      if (state && !state.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") {
            state[key] = update[key];
          }
        });
      }
    });
  }

  // Apply burg updates
  if (updates.burgs?.length) {
    updates.burgs.forEach(update => {
      const burg = pack.burgs[update.i];
      if (burg && !burg.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") {
            burg[key] = update[key];
          }
        });
      }
    });
  }

  // Apply marker updates
  if (updates.markers?.length) {
    updates.markers.forEach(update => {
      const marker = pack.markers?.find(m => m.i === update.i);
      if (marker) {
        Object.keys(update).forEach(key => {
          if (key !== "i") {
            marker[key] = update[key];
          }
        });
      }
    });
  }

  // Apply military updates
  if (updates.military?.length) {
    updates.military.forEach(update => {
      for (const state of pack.states) {
        if (!state?.military) continue;
        const unit = state.military.find(m => m.i === update.i);
        if (unit) {
          Object.keys(update).forEach(key => {
            if (key !== "i") {
              unit[key] = update[key];
            }
          });
          break;
        }
      }
    });
  }

  // Apply culture updates
  if (updates.cultures?.length) {
    updates.cultures.forEach(update => {
      const culture = pack.cultures[update.i];
      if (culture && !culture.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") {
            culture[key] = update[key];
          }
        });
      }
    });
  }

  // Apply religion updates
  if (updates.religions?.length) {
    updates.religions.forEach(update => {
      const religion = pack.religions[update.i];
      if (religion && !religion.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") {
            religion[key] = update[key];
          }
        });
      }
    });
  }

  // Apply province updates
  if (updates.provinces?.length) {
    updates.provinces.forEach(update => {
      const province = pack.provinces[update.i];
      if (province && !province.removed) {
        Object.keys(update).forEach(key => {
          if (key !== "i") {
            province[key] = update[key];
          }
        });
      }
    });
  }
}

function applyDeletes(deletes) {
  // Delete states (mark as removed)
  if (deletes.states?.length) {
    deletes.states.forEach(id => {
      if (pack.states[id]) {
        pack.states[id].removed = true;
      }
    });
  }

  // Delete burgs (mark as removed)
  if (deletes.burgs?.length) {
    deletes.burgs.forEach(id => {
      if (pack.burgs[id]) {
        pack.burgs[id].removed = true;
      }
    });
  }

  // Delete markers
  if (deletes.markers?.length) {
    deletes.markers.forEach(id => {
      const idx = pack.markers?.findIndex(m => m.i === id);
      if (idx >= 0) {
        pack.markers.splice(idx, 1);
      }
    });
  }

  // Delete military units
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

  // Delete cultures (mark as removed)
  if (deletes.cultures?.length) {
    deletes.cultures.forEach(id => {
      if (pack.cultures[id]) {
        pack.cultures[id].removed = true;
      }
    });
  }

  // Delete religions (mark as removed)
  if (deletes.religions?.length) {
    deletes.religions.forEach(id => {
      if (pack.religions[id]) {
        pack.religions[id].removed = true;
      }
    });
  }

  // Delete provinces (mark as removed)
  if (deletes.provinces?.length) {
    deletes.provinces.forEach(id => {
      if (pack.provinces[id]) {
        pack.provinces[id].removed = true;
      }
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

// Export functions
if (typeof window !== "undefined") {
  window.initAIMapEditor = initAIMapEditor;
  window.openAIMapEditor = openAIMapEditor;
  window.closeAIMapEditor = closeAIMapEditor;
  window.toggleAIMapEditor = toggleAIMapEditor;
}

export {initAIMapEditor, openAIMapEditor, closeAIMapEditor, toggleAIMapEditor};
