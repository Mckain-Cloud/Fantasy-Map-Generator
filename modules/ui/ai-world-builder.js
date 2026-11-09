"use strict";

import {byId} from "../../utils/shorthands.js";
import {DataLayer} from "../ai/data-layer.js";

const API_BASE = "/api/ai";
let models = null;
let currentStep = 1;
let worldBuildResult = null;
let selectedChanges = {
  states: new Set(),
  cultures: new Set(),
  diplomacy: new Set(),
  markers: new Set(),
  notes: new Set()
};
let mapSnapshot = null;

// Initialize the AI World Builder
async function initAIWorldBuilder() {
  const dialog = byId("aiWorldBuilderDialog");
  if (!dialog) return;

  // Load available models
  try {
    const response = await fetch(`${API_BASE}/models`);
    if (response.ok) {
      const data = await response.json();
      models = data.models;
      populateModelSelector();
    }
  } catch (error) {
    console.error("Failed to load AI models:", error);
  }

  // Add event listeners
  byId("aiWorldBuilderClose").addEventListener("click", closeAIWorldBuilder);
  byId("wizardPrev").addEventListener("click", goToPreviousStep);
  byId("wizardNext").addEventListener("click", handleNextStep);
  byId("wizardUndo").addEventListener("click", undoChanges);

  // Tab click handlers
  document.querySelectorAll(".review-tab").forEach(tab => {
    tab.addEventListener("click", () => switchReviewTab(tab.dataset.tab));
  });

  // Select all/none handlers
  byId("reviewSelectAll").addEventListener("click", () => selectAllInCurrentTab(true));
  byId("reviewSelectNone").addEventListener("click", () => selectAllInCurrentTab(false));

  // Close on backdrop click
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeAIWorldBuilder();
  });
}

function populateModelSelector() {
  const select = byId("aiWorldBuilderModel");
  select.innerHTML = "";

  if (!models) return;

  Object.entries(models).forEach(([id, info]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${info.name} (${info.provider})`;
    select.appendChild(option);
  });

  // Restore saved model preference
  const savedModel = localStorage.getItem("fmg-world-builder-model");
  if (savedModel && models[savedModel]) {
    select.value = savedModel;
  }
}

function openAIWorldBuilder() {
  const dialog = byId("aiWorldBuilderDialog");
  if (!dialog) return;

  // Reset state
  currentStep = 1;
  worldBuildResult = null;
  selectedChanges = {
    states: new Set(),
    cultures: new Set(),
    diplomacy: new Set(),
    markers: new Set(),
    notes: new Set()
  };
  mapSnapshot = null;

  // Update UI to step 1
  updateWizardStep(1);
  updateMapStats();

  dialog.showModal();
}

function closeAIWorldBuilder() {
  const dialog = byId("aiWorldBuilderDialog");
  if (dialog) dialog.close();
}

function updateMapStats() {
  const statesCount = pack.states?.filter(s => s && !s.removed && s.i !== 0).length || 0;
  const burgsCount = pack.burgs?.filter(b => b && !b.removed && b.i !== 0).length || 0;
  const culturesCount = pack.cultures?.filter(c => c && !c.removed && c.i !== 0).length || 0;

  byId("statStates").textContent = statesCount;
  byId("statBurgs").textContent = burgsCount;
  byId("statCultures").textContent = culturesCount;
}

function updateWizardStep(step) {
  currentStep = step;

  // Update progress indicators
  document.querySelectorAll(".wizard-progress .wizard-step").forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove("active", "completed");
    if (s === step) el.classList.add("active");
    else if (s < step) el.classList.add("completed");
  });

  // Update step content visibility
  document.querySelectorAll(".wizard-step-content").forEach(el => {
    el.classList.remove("active");
  });
  byId(`wizardStep${step}`)?.classList.add("active");

  // Update navigation buttons
  const prevBtn = byId("wizardPrev");
  const nextBtn = byId("wizardNext");
  const undoBtn = byId("wizardUndo");

  prevBtn.style.display = step > 1 && step < 4 ? "block" : "none";
  undoBtn.style.display = "none";

  switch (step) {
    case 1:
      nextBtn.textContent = "Start Analysis";
      nextBtn.style.display = "block";
      break;
    case 2:
      nextBtn.textContent = "Review Changes";
      nextBtn.style.display = worldBuildResult ? "block" : "none";
      break;
    case 3:
      nextBtn.textContent = "Apply Changes";
      nextBtn.style.display = "block";
      updateApplySummary();
      break;
    case 4:
      nextBtn.textContent = "Close";
      nextBtn.style.display = "block";
      undoBtn.style.display = mapSnapshot ? "block" : "none";
      break;
  }
}

function goToPreviousStep() {
  if (currentStep > 1) {
    updateWizardStep(currentStep - 1);
  }
}

async function handleNextStep() {
  switch (currentStep) {
    case 1:
      await startAnalysis();
      break;
    case 2:
      prepareReviewStep();
      updateWizardStep(3);
      break;
    case 3:
      applyChanges();
      updateWizardStep(4);
      break;
    case 4:
      closeAIWorldBuilder();
      break;
  }
}

async function startAnalysis() {
  const worldConcept = byId("worldConcept").value.trim();
  if (!worldConcept) {
    tip("Please enter a world concept", true, "error", 3000);
    return;
  }

  const model = byId("aiWorldBuilderModel").value;
  localStorage.setItem("fmg-world-builder-model", model);

  // Move to step 2 and show loading
  updateWizardStep(2);
  byId("analysisLoading").style.display = "block";
  byId("analysisResult").style.display = "none";
  byId("wizardNext").style.display = "none";

  try {
    // Encode map context
    const context = DataLayer.encode.fullContext(pack, {
      includeRoutes: false,
      includeZones: false
    });

    // Add map dimensions
    context.mapWidth = graphWidth;
    context.mapHeight = graphHeight;

    const response = await fetch(`${API_BASE}/world-build`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        model,
        worldConcept,
        theme: byId("worldTheme").value,
        tone: byId("worldTone").value,
        techLevel: byId("worldTech").value,
        magicLevel: byId("worldMagic").value,
        context
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    worldBuildResult = data.worldBuild;
    displayAnalysisResult();

    // Update status
    if (data.usage) {
      const tokens = (data.usage.prompt_tokens || data.usage.promptTokens || 0) +
                     (data.usage.completion_tokens || data.usage.completionTokens || 0);
      byId("wizardStatus").textContent = `Analysis complete (${tokens} tokens)`;
    }

  } catch (error) {
    byId("analysisLoading").innerHTML = `<p class="change-error">${escapeHtml(error.message)}</p>`;
  }
}

function displayAnalysisResult() {
  byId("analysisLoading").style.display = "none";
  byId("analysisResult").style.display = "block";
  byId("wizardNext").style.display = "block";

  const analysis = worldBuildResult.geographicAnalysis || {};
  byId("analysisSummary").textContent = analysis.summary || "No summary available";

  // Major features
  const featuresEl = byId("analysisMajorFeatures");
  featuresEl.innerHTML = "";
  (analysis.majorFeatures || []).forEach(f => {
    const li = document.createElement("li");
    li.textContent = f;
    featuresEl.appendChild(li);
  });

  // Strategic locations
  const locationsEl = byId("analysisStrategicLocations");
  locationsEl.innerHTML = "";
  (analysis.strategicLocations || []).forEach(l => {
    const li = document.createElement("li");
    li.textContent = l;
    locationsEl.appendChild(li);
  });

  // Change counts
  byId("countStates").textContent = worldBuildResult.stateChanges?.length || 0;
  byId("countCultures").textContent = worldBuildResult.cultureChanges?.length || 0;
  byId("countDiplomacy").textContent = worldBuildResult.diplomacyChanges?.length || 0;
  byId("countMarkers").textContent = worldBuildResult.markersToAdd?.length || 0;
  byId("countNotes").textContent = worldBuildResult.notesToAdd?.length || 0;

  // Pre-select all changes
  worldBuildResult.stateChanges?.forEach((_, i) => selectedChanges.states.add(i));
  worldBuildResult.cultureChanges?.forEach((_, i) => selectedChanges.cultures.add(i));
  worldBuildResult.diplomacyChanges?.forEach((_, i) => selectedChanges.diplomacy.add(i));
  worldBuildResult.markersToAdd?.forEach((_, i) => selectedChanges.markers.add(i));
  worldBuildResult.notesToAdd?.forEach((_, i) => selectedChanges.notes.add(i));
}

function prepareReviewStep() {
  // Render first tab by default
  switchReviewTab("states");
}

function switchReviewTab(tabName) {
  // Update tab active state
  document.querySelectorAll(".review-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  // Render tab content
  const container = byId("reviewTabContent");
  container.innerHTML = "";

  switch (tabName) {
    case "states":
      renderStateChanges(container);
      break;
    case "cultures":
      renderCultureChanges(container);
      break;
    case "diplomacy":
      renderDiplomacyChanges(container);
      break;
    case "markers":
      renderMarkerChanges(container);
      break;
    case "notes":
      renderNoteChanges(container);
      break;
  }
}

function renderStateChanges(container) {
  const changes = worldBuildResult?.stateChanges || [];
  if (changes.length === 0) {
    container.innerHTML = '<div class="no-changes">No state changes proposed</div>';
    return;
  }

  changes.forEach((change, idx) => {
    const state = pack.states[change.stateId];
    if (!state) return;

    const item = createReviewItem(
      idx,
      "states",
      `${state.name} → ${change.newName}`,
      change.form ? `Form: ${change.form}` : "",
      change.reasoning || change.description
    );
    container.appendChild(item);
  });
}

function renderCultureChanges(container) {
  const changes = worldBuildResult?.cultureChanges || [];
  if (changes.length === 0) {
    container.innerHTML = '<div class="no-changes">No culture changes proposed</div>';
    return;
  }

  changes.forEach((change, idx) => {
    const culture = pack.cultures[change.cultureId];
    if (!culture) return;

    const item = createReviewItem(
      idx,
      "cultures",
      `${culture.name} → ${change.newName}`,
      change.type ? `Type: ${change.type}` : "",
      change.description
    );
    container.appendChild(item);
  });
}

function renderDiplomacyChanges(container) {
  const changes = worldBuildResult?.diplomacyChanges || [];
  if (changes.length === 0) {
    container.innerHTML = '<div class="no-changes">No diplomacy changes proposed</div>';
    return;
  }

  changes.forEach((change, idx) => {
    const state1 = pack.states[change.state1Id];
    const state2 = pack.states[change.state2Id];
    if (!state1 || !state2) return;

    const item = createReviewItem(
      idx,
      "diplomacy",
      `${state1.name} ↔ ${state2.name}`,
      `Relation: ${change.relation}`,
      change.reasoning
    );
    container.appendChild(item);
  });
}

function renderMarkerChanges(container) {
  const markers = worldBuildResult?.markersToAdd || [];
  if (markers.length === 0) {
    container.innerHTML = '<div class="no-changes">No new markers proposed</div>';
    return;
  }

  markers.forEach((marker, idx) => {
    const state = marker.nearStateId ? pack.states[marker.nearStateId] : null;
    const item = createReviewItem(
      idx,
      "markers",
      marker.name,
      `Type: ${marker.type}${state ? ` (near ${state.name})` : ""}`,
      marker.noteContent
    );
    container.appendChild(item);
  });
}

function renderNoteChanges(container) {
  const notes = worldBuildResult?.notesToAdd || [];
  if (notes.length === 0) {
    container.innerHTML = '<div class="no-changes">No new notes proposed</div>';
    return;
  }

  notes.forEach((note, idx) => {
    const item = createReviewItem(
      idx,
      "notes",
      note.name,
      `ID: ${note.id}`,
      note.legend?.substring(0, 100) + (note.legend?.length > 100 ? "..." : "")
    );
    container.appendChild(item);
  });
}

function createReviewItem(idx, category, title, detail, reason) {
  const div = document.createElement("div");
  div.className = "review-item";
  div.dataset.category = category;
  div.dataset.index = idx;

  const isSelected = selectedChanges[category].has(idx);

  div.innerHTML = `
    <input type="checkbox" ${isSelected ? "checked" : ""} id="${category}-${idx}">
    <div class="review-item-content">
      <div class="review-item-title">${escapeHtml(title)}</div>
      ${detail ? `<div class="review-item-detail">${escapeHtml(detail)}</div>` : ""}
      ${reason ? `<div class="review-item-reason">${escapeHtml(reason)}</div>` : ""}
    </div>
  `;

  const checkbox = div.querySelector("input");
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      selectedChanges[category].add(idx);
    } else {
      selectedChanges[category].delete(idx);
    }
    updateApplySummary();
  });

  // Click on item toggles checkbox
  div.addEventListener("click", (e) => {
    if (e.target !== checkbox) {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    }
  });

  return div;
}

function selectAllInCurrentTab(selectAll) {
  const activeTab = document.querySelector(".review-tab.active");
  if (!activeTab) return;

  const category = activeTab.dataset.tab;
  const container = byId("reviewTabContent");
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach(cb => {
    cb.checked = selectAll;
    const idx = parseInt(cb.id.split("-")[1]);
    if (selectAll) {
      selectedChanges[category].add(idx);
    } else {
      selectedChanges[category].delete(idx);
    }
  });

  updateApplySummary();
}

function updateApplySummary() {
  const list = byId("applySummaryList");
  if (!list) return;

  list.innerHTML = "";

  const counts = {
    states: selectedChanges.states.size,
    cultures: selectedChanges.cultures.size,
    diplomacy: selectedChanges.diplomacy.size,
    markers: selectedChanges.markers.size,
    notes: selectedChanges.notes.size
  };

  if (counts.states > 0) {
    list.innerHTML += `<li>${counts.states} state rename(s)</li>`;
  }
  if (counts.cultures > 0) {
    list.innerHTML += `<li>${counts.cultures} culture rename(s)</li>`;
  }
  if (counts.diplomacy > 0) {
    list.innerHTML += `<li>${counts.diplomacy} diplomacy change(s)</li>`;
  }
  if (counts.markers > 0) {
    list.innerHTML += `<li>${counts.markers} new marker(s)</li>`;
  }
  if (counts.notes > 0) {
    list.innerHTML += `<li>${counts.notes} new note(s)</li>`;
  }

  if (list.innerHTML === "") {
    list.innerHTML = "<li>No changes selected</li>";
  }
}

function applyChanges() {
  // Take snapshot for undo
  mapSnapshot = {
    states: JSON.parse(JSON.stringify(pack.states)),
    cultures: JSON.parse(JSON.stringify(pack.cultures)),
    notes: typeof notes !== "undefined" ? JSON.parse(JSON.stringify(notes)) : [],
    markers: pack.markers ? JSON.parse(JSON.stringify(pack.markers)) : []
  };

  let changesApplied = 0;

  // Apply state changes
  selectedChanges.states.forEach(idx => {
    const change = worldBuildResult.stateChanges[idx];
    if (change && pack.states[change.stateId]) {
      pack.states[change.stateId].name = change.newName;
      if (change.form) pack.states[change.stateId].form = change.form;
      changesApplied++;
    }
  });

  // Apply culture changes
  selectedChanges.cultures.forEach(idx => {
    const change = worldBuildResult.cultureChanges[idx];
    if (change && pack.cultures[change.cultureId]) {
      pack.cultures[change.cultureId].name = change.newName;
      if (change.type) pack.cultures[change.cultureId].type = change.type;
      changesApplied++;
    }
  });

  // Apply diplomacy changes
  selectedChanges.diplomacy.forEach(idx => {
    const change = worldBuildResult.diplomacyChanges[idx];
    if (change) {
      const state1 = pack.states[change.state1Id];
      const state2 = pack.states[change.state2Id];
      if (state1 && state2) {
        const relationCode = getDiplomacyCode(change.relation);
        if (state1.diplomacy && state2.diplomacy) {
          state1.diplomacy[change.state2Id] = relationCode;
          state2.diplomacy[change.state1Id] = getSymmetricRelation(relationCode);
          changesApplied++;
        }
      }
    }
  });

  // Add markers
  selectedChanges.markers.forEach(idx => {
    const marker = worldBuildResult.markersToAdd[idx];
    if (marker) {
      if (!pack.markers) pack.markers = [];
      const newId = pack.markers.length > 0 ? Math.max(...pack.markers.map(m => m.i)) + 1 : 1;

      // Find position near the state's capital
      let x = graphWidth / 2, y = graphHeight / 2;
      if (marker.nearStateId && pack.states[marker.nearStateId]) {
        const state = pack.states[marker.nearStateId];
        if (state.capital && pack.burgs[state.capital]) {
          const burg = pack.burgs[state.capital];
          x = burg.x + (Math.random() - 0.5) * 20;
          y = burg.y + (Math.random() - 0.5) * 20;
        }
      }

      pack.markers.push({
        i: newId,
        type: marker.type,
        x,
        y,
        cell: findCell(x, y),
        icon: getMarkerIcon(marker.type)
      });
      changesApplied++;
    }
  });

  // Add notes
  selectedChanges.notes.forEach(idx => {
    const note = worldBuildResult.notesToAdd[idx];
    if (note) {
      if (typeof notes === "undefined") window.notes = [];
      notes.push({
        id: note.id,
        name: note.name,
        legend: note.legend
      });
      changesApplied++;
    }
  });

  // Show completion state
  byId("applyPreview").style.display = "none";
  byId("applyComplete").style.display = "block";

  // Trigger map redraw
  if (typeof refreshAllData === "function") {
    refreshAllData();
  }

  tip(`Applied ${changesApplied} changes to the map`, true, "success", 3000);
}

function undoChanges() {
  if (!mapSnapshot) {
    tip("No snapshot available for undo", true, "error", 3000);
    return;
  }

  // Restore from snapshot
  pack.states = mapSnapshot.states;
  pack.cultures = mapSnapshot.cultures;
  pack.markers = mapSnapshot.markers;
  if (typeof notes !== "undefined") {
    window.notes = mapSnapshot.notes;
  }

  mapSnapshot = null;
  byId("wizardUndo").style.display = "none";

  // Show preview again
  byId("applyComplete").style.display = "none";
  byId("applyPreview").style.display = "block";

  // Trigger map redraw
  if (typeof refreshAllData === "function") {
    refreshAllData();
  }

  tip("Changes undone successfully", true, "success", 3000);
}

function getDiplomacyCode(relation) {
  const map = {
    "Ally": "A",
    "Friendly": "F",
    "Neutral": "N",
    "Suspicion": "S",
    "Enemy": "E",
    "Rival": "R",
    "Vassal": "V",
    "Suzerain": "Z",
    "Unknown": "U"
  };
  return map[relation] || "N";
}

function getSymmetricRelation(code) {
  // Vassal <-> Suzerain are reversed, others are same
  if (code === "V") return "Z";
  if (code === "Z") return "V";
  return code;
}

function getMarkerIcon(type) {
  const icons = {
    capital: "star",
    city: "circle",
    ruins: "ruin",
    battlefield: "crossed-swords",
    dungeon: "dungeon",
    cave: "cave-entrance",
    temple: "temple",
    lighthouse: "lighthouse",
    volcano: "volcano",
    bridge: "bridge",
    tower: "tower",
    portal: "portal",
    mine: "mine"
  };
  return icons[type] || "marker";
}

function findCell(x, y) {
  // Simple cell lookup - find nearest cell to coordinates
  if (typeof grid !== "undefined" && grid.cells) {
    let minDist = Infinity;
    let nearestCell = 0;
    grid.cells.p.forEach((p, i) => {
      const dist = (p[0] - x) ** 2 + (p[1] - y) ** 2;
      if (dist < minDist) {
        minDist = dist;
        nearestCell = i;
      }
    });
    return nearestCell;
  }
  return 0;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Export functions
if (typeof window !== "undefined") {
  window.initAIWorldBuilder = initAIWorldBuilder;
  window.openAIWorldBuilder = openAIWorldBuilder;
  window.closeAIWorldBuilder = closeAIWorldBuilder;
}

export {initAIWorldBuilder, openAIWorldBuilder, closeAIWorldBuilder};
