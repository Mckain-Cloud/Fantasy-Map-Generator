"use strict";

import {byId} from "../../utils/shorthands.js";
import {fetchAiModels} from "../ai/ai-models-client.js";
import {DataLayer} from "../ai/data-layer.js";

const API_BASE = "/api/ai";
let models = null;
let currentStep = 1;
let rawAdventure = null;
let preprocessedData = null;
let importResult = null;
let selectedChanges = {
  states: new Set(),
  cultures: new Set(),
  religions: new Set(),
  markers: new Set(),
  notes: new Set(),
  military: new Set(),
  diplomacy: new Set()
};
let mapSnapshot = null;
let currentTab = "states";

// Initialize the AI Dungeon Importer
async function initAIDungeonImporter() {
  const dialog = byId("aiDungeonImporterDialog");
  if (!dialog) return;

  // Load available models
  try {
    const response = await fetchAiModels();
    if (response.ok) {
      const data = await response.json();
      models = data.models;
      populateModelSelector();
    }
  } catch (error) {
    console.error("Failed to load AI models:", error);
  }

  // Add event listeners
  byId("aiDungeonImporterClose").addEventListener("click", closeAIDungeonImporter);
  byId("dungeonWizardPrev").addEventListener("click", goToPreviousStep);
  byId("dungeonWizardNext").addEventListener("click", handleNextStep);
  byId("dungeonWizardUndo").addEventListener("click", undoChanges);

  // File upload handlers
  setupFileUpload();

  // Tab click handlers for step 4
  byId("aiDungeonImporterDialog").querySelectorAll(".review-tab").forEach(tab => {
    tab.addEventListener("click", () => switchReviewTab(tab.dataset.tab));
  });

  // Select all/none handlers
  byId("dungeonReviewSelectAll").addEventListener("click", () => selectAllInCurrentTab(true));
  byId("dungeonReviewSelectNone").addEventListener("click", () => selectAllInCurrentTab(false));

  // Close on backdrop click
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeAIDungeonImporter();
  });
}

function setupFileUpload() {
  const uploadArea = byId("dungeonUploadArea");
  const browseBtn = byId("dungeonBrowseBtn");
  const fileInput = byId("dungeonAdventureToLoad");

  // Click to browse
  browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  // Drag and drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });

  // File input change
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  });
}

async function handleFileSelect(file) {
  if (!file.name.endsWith(".json")) {
    tip("Please select a JSON file", true, "error", 3000);
    return;
  }

  try {
    const text = await file.text();
    rawAdventure = JSON.parse(text);

    // Quick validation
    const adventure = rawAdventure?.data?.adventure || rawAdventure?.adventure || rawAdventure;
    if (!adventure || (!adventure.actionWindow && !adventure.storyCards)) {
      throw new Error("Invalid AI Dungeon adventure format");
    }

    // Show preview
    showFilePreview(file, adventure);
    byId("dungeonWizardNext").disabled = false;

  } catch (error) {
    tip(`Failed to load file: ${error.message}`, true, "error", 4000);
    rawAdventure = null;
    byId("dungeonFilePreview").style.display = "none";
  }
}

function showFilePreview(file, adventure) {
  byId("dungeonFilePreview").style.display = "block";
  byId("dungeonPreviewTitle").textContent = adventure.title || "Untitled";
  byId("dungeonPreviewActions").textContent = adventure.actionWindow?.length || 0;
  byId("dungeonPreviewCards").textContent = adventure.storyCards?.length || 0;
  byId("dungeonPreviewSize").textContent = formatFileSize(file.size);

  const description = adventure.description || adventure.details?.instructions?.scenario;
  byId("dungeonPreviewDescription").textContent = description ?
    (description.substring(0, 200) + (description.length > 200 ? "..." : "")) : "";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function populateModelSelector() {
  const select = byId("dungeonImporterModel");
  select.innerHTML = "";

  if (!models) return;

  Object.entries(models).forEach(([id, info]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${info.name} (${info.provider})`;
    select.appendChild(option);
  });

  // Restore saved model preference
  const savedModel = localStorage.getItem("fmg-dungeon-importer-model");
  if (savedModel && models[savedModel]) {
    select.value = savedModel;
  }
}

function openAIDungeonImporter() {
  const dialog = byId("aiDungeonImporterDialog");
  if (!dialog) return;

  // Reset state
  currentStep = 1;
  rawAdventure = null;
  preprocessedData = null;
  importResult = null;
  selectedChanges = {
    states: new Set(),
    cultures: new Set(),
    religions: new Set(),
    markers: new Set(),
    notes: new Set(),
    military: new Set(),
    diplomacy: new Set()
  };
  mapSnapshot = null;
  currentTab = "states";

  // Reset UI
  byId("dungeonFilePreview").style.display = "none";
  byId("dungeonAdventureToLoad").value = "";
  byId("dungeonWizardNext").disabled = true;

  // Reset entity type checkboxes to checked
  byId("dungeonIncludeStates").checked = true;
  byId("dungeonIncludeCultures").checked = true;
  byId("dungeonIncludeReligions").checked = true;
  byId("dungeonIncludeMarkers").checked = true;
  byId("dungeonIncludeNotes").checked = true;
  byId("dungeonIncludeMilitary").checked = true;
  byId("dungeonIncludeDiplomacy").checked = true;

  // Update UI to step 1
  updateWizardStep(1);

  dialog.showModal();
}

function closeAIDungeonImporter() {
  const dialog = byId("aiDungeonImporterDialog");
  if (dialog) dialog.close();
}

function updateWizardStep(step) {
  currentStep = step;
  const dialog = byId("aiDungeonImporterDialog");

  // Update progress indicators
  dialog.querySelectorAll(".wizard-progress .wizard-step").forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove("active", "completed");
    if (s === step) el.classList.add("active");
    else if (s < step) el.classList.add("completed");
  });

  // Update step content visibility
  for (let i = 1; i <= 5; i++) {
    const stepEl = byId(`dungeonWizardStep${i}`);
    if (stepEl) stepEl.classList.toggle("active", i === step);
  }

  // Update navigation buttons
  const prevBtn = byId("dungeonWizardPrev");
  const nextBtn = byId("dungeonWizardNext");
  const undoBtn = byId("dungeonWizardUndo");

  prevBtn.style.display = step > 1 && step < 5 ? "block" : "none";
  undoBtn.style.display = "none";

  switch (step) {
    case 1:
      nextBtn.textContent = "Start Preprocessing";
      nextBtn.style.display = "block";
      nextBtn.disabled = !rawAdventure;
      break;
    case 2:
      nextBtn.textContent = "Configure Analysis";
      nextBtn.style.display = preprocessedData ? "block" : "none";
      nextBtn.disabled = false;
      break;
    case 3:
      nextBtn.textContent = "Start AI Analysis";
      nextBtn.style.display = "block";
      nextBtn.disabled = false;
      break;
    case 4:
      nextBtn.textContent = "Apply Changes";
      nextBtn.style.display = "block";
      nextBtn.disabled = false;
      updateApplySummary();
      break;
    case 5:
      nextBtn.textContent = "Close";
      nextBtn.style.display = "block";
      nextBtn.disabled = false;
      undoBtn.style.display = mapSnapshot ? "block" : "none";
      break;
  }
}

function goToPreviousStep() {
  if (currentStep > 1) {
    // Special case: going back from step 4 to 3 needs to show the options again
    if (currentStep === 4) {
      byId("dungeonAnalysisLoading").style.display = "none";
    }
    updateWizardStep(currentStep - 1);
  }
}

async function handleNextStep() {
  switch (currentStep) {
    case 1:
      await startPreprocessing();
      break;
    case 2:
      updateWizardStep(3);
      break;
    case 3:
      await startAIAnalysis();
      break;
    case 4:
      applyChanges();
      updateWizardStep(5);
      break;
    case 5:
      closeAIDungeonImporter();
      break;
  }
}

async function startPreprocessing() {
  if (!rawAdventure) return;

  // Move to step 2 and show loading
  updateWizardStep(2);
  byId("preprocessLoading").style.display = "block";
  byId("preprocessResult").style.display = "none";
  byId("dungeonWizardNext").style.display = "none";

  try {
    const response = await fetch(`${API_BASE}/dungeon-preprocess`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({adventure: rawAdventure})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    preprocessedData = data.preprocessed;
    displayPreprocessResult();

  } catch (error) {
    byId("preprocessLoading").innerHTML = `<p class="change-error">${escapeHtml(error.message)}</p>`;
  }
}

function displayPreprocessResult() {
  byId("preprocessLoading").style.display = "none";
  byId("preprocessResult").style.display = "block";
  byId("dungeonWizardNext").style.display = "block";

  const meta = preprocessedData.meta || {};
  byId("preprocessValidActions").textContent = meta.validActions || 0;
  byId("preprocessTotalActions").textContent = meta.totalActions || 0;
  byId("preprocessStoryCards").textContent = meta.storyCardCount || 0;
  byId("preprocessTokens").textContent = meta.estimatedTokens?.toLocaleString() || 0;

  const worldData = preprocessedData.worldData || {};
  byId("preprocessCharacters").textContent = worldData.characters?.length || 0;
  byId("preprocessLocations").textContent = worldData.locations?.length || 0;
  byId("preprocessFactions").textContent = worldData.factions?.length || 0;
  byId("preprocessItems").textContent = worldData.items?.length || 0;
}

async function startAIAnalysis() {
  const model = byId("dungeonImporterModel").value;
  localStorage.setItem("fmg-dungeon-importer-model", model);

  // Show loading in step 3
  byId("dungeonAnalysisLoading").style.display = "block";
  byId("dungeonWizardNext").style.display = "none";
  byId("dungeonWizardPrev").style.display = "none";

  try {
    // Encode map context
    const context = DataLayer.encode.fullContext(pack, {
      includeRoutes: false,
      includeZones: false
    });

    context.mapWidth = graphWidth;
    context.mapHeight = graphHeight;

    // Get options
    const options = {
      expansionLevel: byId("dungeonExpansionLevel").value,
      includeStates: byId("dungeonIncludeStates").checked,
      includeCultures: byId("dungeonIncludeCultures").checked,
      includeReligions: byId("dungeonIncludeReligions").checked,
      includeMarkers: byId("dungeonIncludeMarkers").checked,
      includeNotes: byId("dungeonIncludeNotes").checked,
      includeMilitary: byId("dungeonIncludeMilitary").checked,
      includeDiplomacy: byId("dungeonIncludeDiplomacy").checked
    };

    const response = await fetch(`${API_BASE}/dungeon-import`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        model,
        preprocessedAdventure: preprocessedData,
        context,
        options
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    importResult = data.importResult;
    displayImportResult();

    // Update status
    if (data.usage) {
      const tokens = (data.usage.prompt_tokens || data.usage.promptTokens || 0) +
                     (data.usage.completion_tokens || data.usage.completionTokens || 0);
      byId("dungeonWizardStatus").textContent = `Analysis complete (${tokens} tokens)`;
    }

    updateWizardStep(4);

  } catch (error) {
    byId("dungeonAnalysisLoading").innerHTML = `<p class="change-error">${escapeHtml(error.message)}</p>`;
    byId("dungeonWizardPrev").style.display = "block";
  }
}

function displayImportResult() {
  // Display world analysis
  const analysis = importResult.worldAnalysis || {};
  byId("dungeonAnalysisSummary").textContent = analysis.summary || "No summary available";
  byId("dungeonAnalysisSetting").textContent = analysis.setting || "-";
  byId("dungeonAnalysisTimeframe").textContent = analysis.timeframe || "-";

  // Display themes
  const themesEl = byId("dungeonAnalysisThemes");
  themesEl.innerHTML = "";
  (analysis.themes || []).forEach(theme => {
    const span = document.createElement("span");
    span.textContent = theme;
    themesEl.appendChild(span);
  });

  // Pre-select all changes
  importResult.states?.forEach((_, i) => selectedChanges.states.add(i));
  importResult.cultures?.forEach((_, i) => selectedChanges.cultures.add(i));
  importResult.religions?.forEach((_, i) => selectedChanges.religions.add(i));
  importResult.markers?.forEach((_, i) => selectedChanges.markers.add(i));
  importResult.notes?.forEach((_, i) => selectedChanges.notes.add(i));
  importResult.military?.forEach((_, i) => selectedChanges.military.add(i));
  importResult.diplomacy?.forEach((_, i) => selectedChanges.diplomacy.add(i));

  // Render first tab
  switchReviewTab("states");
}

function switchReviewTab(tabName) {
  currentTab = tabName;
  const dialog = byId("aiDungeonImporterDialog");

  // Update tab active state
  dialog.querySelectorAll(".review-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  // Render tab content
  const container = byId("dungeonReviewTabContent");
  container.innerHTML = "";

  switch (tabName) {
    case "states":
      renderStateChanges(container);
      break;
    case "cultures":
      renderCultureChanges(container);
      break;
    case "religions":
      renderReligionChanges(container);
      break;
    case "markers":
      renderMarkerChanges(container);
      break;
    case "notes":
      renderNoteChanges(container);
      break;
    case "military":
      renderMilitaryChanges(container);
      break;
    case "diplomacy":
      renderDiplomacyChanges(container);
      break;
  }
}

function renderStateChanges(container) {
  const changes = importResult?.states || [];
  if (changes.length === 0) {
    container.innerHTML = '<div class="no-changes">No state changes proposed</div>';
    return;
  }

  changes.forEach((change, idx) => {
    const actionLabel = change.action === "create" ? "Create" : "Update";
    const item = createReviewItem(
      idx,
      "states",
      `[${actionLabel}] ${change.name}`,
      change.form ? `Form: ${change.form}` : "",
      change.reasoning
    );
    container.appendChild(item);
  });
}

function renderCultureChanges(container) {
  const changes = importResult?.cultures || [];
  if (changes.length === 0) {
    container.innerHTML = '<div class="no-changes">No culture changes proposed</div>';
    return;
  }

  changes.forEach((change, idx) => {
    const actionLabel = change.action === "create" ? "Create" : "Update";
    const item = createReviewItem(
      idx,
      "cultures",
      `[${actionLabel}] ${change.name}`,
      change.type ? `Type: ${change.type}` : "",
      change.reasoning
    );
    container.appendChild(item);
  });
}

function renderReligionChanges(container) {
  const changes = importResult?.religions || [];
  if (changes.length === 0) {
    container.innerHTML = '<div class="no-changes">No religion changes proposed</div>';
    return;
  }

  changes.forEach((change, idx) => {
    const actionLabel = change.action === "create" ? "Create" : "Update";
    const item = createReviewItem(
      idx,
      "religions",
      `[${actionLabel}] ${change.name}`,
      change.type ? `Type: ${change.type}` : "",
      change.reasoning
    );
    container.appendChild(item);
  });
}

function renderMarkerChanges(container) {
  const markers = importResult?.markers || [];
  if (markers.length === 0) {
    container.innerHTML = '<div class="no-changes">No markers proposed</div>';
    return;
  }

  markers.forEach((marker, idx) => {
    const item = createReviewItem(
      idx,
      "markers",
      marker.name,
      `Type: ${marker.type}${marker.icon ? `, Icon: ${marker.icon}` : ""}`,
      marker.reasoning
    );
    container.appendChild(item);
  });
}

function renderNoteChanges(container) {
  const notes = importResult?.notes || [];
  if (notes.length === 0) {
    container.innerHTML = '<div class="no-changes">No notes proposed</div>';
    return;
  }

  notes.forEach((note, idx) => {
    const item = createReviewItem(
      idx,
      "notes",
      note.name,
      `ID: ${note.id}${note.category ? `, Category: ${note.category}` : ""}`,
      note.legend?.substring(0, 100) + (note.legend?.length > 100 ? "..." : "")
    );
    container.appendChild(item);
  });
}

function renderMilitaryChanges(container) {
  const military = importResult?.military || [];
  if (military.length === 0) {
    container.innerHTML = '<div class="no-changes">No military units proposed</div>';
    return;
  }

  military.forEach((unit, idx) => {
    const item = createReviewItem(
      idx,
      "military",
      unit.name,
      unit.strength ? `Strength: ${unit.strength}` : "",
      unit.reasoning
    );
    container.appendChild(item);
  });
}

function renderDiplomacyChanges(container) {
  const diplomacy = importResult?.diplomacy || [];
  if (diplomacy.length === 0) {
    container.innerHTML = '<div class="no-changes">No diplomacy changes proposed</div>';
    return;
  }

  diplomacy.forEach((change, idx) => {
    const item = createReviewItem(
      idx,
      "diplomacy",
      `${change.state1Name} ↔ ${change.state2Name}`,
      `Relation: ${change.relation}`,
      change.reasoning
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
    <input type="checkbox" ${isSelected ? "checked" : ""} id="dungeon-${category}-${idx}">
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
  const container = byId("dungeonReviewTabContent");
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach(cb => {
    cb.checked = selectAll;
    const idx = parseInt(cb.id.split("-").pop());
    if (selectAll) {
      selectedChanges[currentTab].add(idx);
    } else {
      selectedChanges[currentTab].delete(idx);
    }
  });

  updateApplySummary();
}

function updateApplySummary() {
  const list = byId("dungeonApplySummaryList");
  if (!list) return;

  list.innerHTML = "";

  const counts = {
    states: selectedChanges.states.size,
    cultures: selectedChanges.cultures.size,
    religions: selectedChanges.religions.size,
    markers: selectedChanges.markers.size,
    notes: selectedChanges.notes.size,
    military: selectedChanges.military.size,
    diplomacy: selectedChanges.diplomacy.size
  };

  if (counts.states > 0) {
    list.innerHTML += `<li>${counts.states} state change(s)</li>`;
  }
  if (counts.cultures > 0) {
    list.innerHTML += `<li>${counts.cultures} culture change(s)</li>`;
  }
  if (counts.religions > 0) {
    list.innerHTML += `<li>${counts.religions} religion change(s)</li>`;
  }
  if (counts.markers > 0) {
    list.innerHTML += `<li>${counts.markers} new marker(s)</li>`;
  }
  if (counts.notes > 0) {
    list.innerHTML += `<li>${counts.notes} new note(s)</li>`;
  }
  if (counts.military > 0) {
    list.innerHTML += `<li>${counts.military} military unit(s)</li>`;
  }
  if (counts.diplomacy > 0) {
    list.innerHTML += `<li>${counts.diplomacy} diplomacy change(s)</li>`;
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
    religions: JSON.parse(JSON.stringify(pack.religions || [])),
    notes: typeof notes !== "undefined" ? JSON.parse(JSON.stringify(notes)) : [],
    markers: pack.markers ? JSON.parse(JSON.stringify(pack.markers)) : [],
    military: pack.military ? JSON.parse(JSON.stringify(pack.military)) : []
  };

  let changesApplied = 0;

  // Apply state changes
  selectedChanges.states.forEach(idx => {
    const change = importResult.states[idx];
    if (!change) return;

    if (change.action === "create") {
      // Create new state
      const newId = pack.states.length;
      pack.states.push({
        i: newId,
        name: change.name,
        form: change.form || "Monarchy",
        color: getRandomColor(),
        diplomacy: [],
        provinces: [],
        military: []
      });
      changesApplied++;
    } else if (change.action === "update" && change.i !== undefined) {
      // Update existing state
      if (pack.states[change.i]) {
        pack.states[change.i].name = change.name;
        if (change.form) pack.states[change.i].form = change.form;
        changesApplied++;
      }
    }
  });

  // Apply culture changes
  selectedChanges.cultures.forEach(idx => {
    const change = importResult.cultures[idx];
    if (!change) return;

    if (change.action === "create") {
      const newId = pack.cultures.length;
      pack.cultures.push({
        i: newId,
        name: change.name,
        type: change.type || "Generic",
        color: getRandomColor()
      });
      changesApplied++;
    } else if (change.action === "update" && change.i !== undefined) {
      if (pack.cultures[change.i]) {
        pack.cultures[change.i].name = change.name;
        if (change.type) pack.cultures[change.i].type = change.type;
        changesApplied++;
      }
    }
  });

  // Apply religion changes
  selectedChanges.religions.forEach(idx => {
    const change = importResult.religions[idx];
    if (!change) return;

    if (!pack.religions) pack.religions = [{i: 0, name: "No religion"}];

    if (change.action === "create") {
      const newId = pack.religions.length;
      pack.religions.push({
        i: newId,
        name: change.name,
        type: change.type || "Folk",
        form: change.form || "Polytheism",
        color: getRandomColor()
      });
      changesApplied++;
    } else if (change.action === "update" && change.i !== undefined) {
      if (pack.religions[change.i]) {
        pack.religions[change.i].name = change.name;
        if (change.type) pack.religions[change.i].type = change.type;
        if (change.form) pack.religions[change.i].form = change.form;
        changesApplied++;
      }
    }
  });

  // Add markers
  selectedChanges.markers.forEach(idx => {
    const marker = importResult.markers[idx];
    if (!marker) return;

    if (!pack.markers) pack.markers = [];
    const newId = pack.markers.length > 0 ? Math.max(...pack.markers.map(m => m.i)) + 1 : 1;

    // Find position near the state's capital or random
    let x = graphWidth / 2 + (Math.random() - 0.5) * graphWidth * 0.5;
    let y = graphHeight / 2 + (Math.random() - 0.5) * graphHeight * 0.5;

    if (marker.nearStateId && pack.states[marker.nearStateId]) {
      const state = pack.states[marker.nearStateId];
      if (state.capital && pack.burgs[state.capital]) {
        const burg = pack.burgs[state.capital];
        x = burg.x + (Math.random() - 0.5) * 40;
        y = burg.y + (Math.random() - 0.5) * 40;
      }
    }

    pack.markers.push({
      i: newId,
      type: marker.type,
      x,
      y,
      cell: findCell(x, y),
      icon: marker.icon || getMarkerIcon(marker.type)
    });
    changesApplied++;
  });

  // Add notes
  selectedChanges.notes.forEach(idx => {
    const note = importResult.notes[idx];
    if (!note) return;

    if (typeof notes === "undefined") window.notes = [];
    notes.push({
      id: note.id,
      name: note.name,
      legend: note.legend
    });
    changesApplied++;
  });

  // Apply diplomacy changes
  selectedChanges.diplomacy.forEach(idx => {
    const change = importResult.diplomacy[idx];
    if (!change) return;

    // Find states by name
    const state1 = pack.states.find(s => s && s.name === change.state1Name);
    const state2 = pack.states.find(s => s && s.name === change.state2Name);

    if (state1 && state2 && state1.diplomacy && state2.diplomacy) {
      const relationCode = getDiplomacyCode(change.relation);
      state1.diplomacy[state2.i] = relationCode;
      state2.diplomacy[state1.i] = getSymmetricRelation(relationCode);
      changesApplied++;
    }
  });

  // Show completion state
  byId("dungeonApplyPreview").style.display = "none";
  byId("dungeonApplyComplete").style.display = "block";

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
  pack.religions = mapSnapshot.religions;
  pack.markers = mapSnapshot.markers;
  pack.military = mapSnapshot.military;
  if (typeof notes !== "undefined") {
    window.notes = mapSnapshot.notes;
  }

  mapSnapshot = null;
  byId("dungeonWizardUndo").style.display = "none";

  // Show preview again
  byId("dungeonApplyComplete").style.display = "none";
  byId("dungeonApplyPreview").style.display = "block";

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
    "Unknown": "U",
    "War": "W"
  };
  return map[relation] || "N";
}

function getSymmetricRelation(code) {
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
    mine: "mine",
    castle: "castle",
    fortress: "fortress",
    village: "village"
  };
  return icons[type?.toLowerCase()] || "marker";
}

function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 60%, 50%)`;
}

function findCell(x, y) {
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
  window.initAIDungeonImporter = initAIDungeonImporter;
  window.openAIDungeonImporter = openAIDungeonImporter;
  window.closeAIDungeonImporter = closeAIDungeonImporter;
}

export {initAIDungeonImporter, openAIDungeonImporter, closeAIDungeonImporter};
