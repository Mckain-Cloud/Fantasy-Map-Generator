"use strict";

import {byId} from "../../utils/shorthands.js";
import {WorldSpecApplicator} from "../ai/world-spec-applicator.js";

const API_BASE = "/api/ai";
let models = null;
let currentStep = 1;
let rawAdventure = null;
let preprocessedData = null;
let worldSpec = null;
let currentTab = "terrain";
let isImportedSpec = false; // Track if we imported a spec directly

// Initialize the AI World Spec Generator
async function initAIWorldSpecGenerator() {
  const dialog = byId("aiWorldSpecDialog");
  if (!dialog) return;

  // Load available models for world-spec
  try {
    const response = await fetch(`${API_BASE}/models`);
    if (response.ok) {
      const data = await response.json();
      models = data["world-spec"] || [];
      populateModelSelector();
    }
  } catch (error) {
    console.error("Failed to load AI models:", error);
  }

  // Add event listeners
  byId("aiWorldSpecClose").addEventListener("click", closeAIWorldSpecGenerator);
  byId("worldSpecWizardPrev").addEventListener("click", goToPreviousStep);
  byId("worldSpecWizardNext").addEventListener("click", handleNextStep);

  // File upload handlers
  setupFileUpload();

  // Tab click handlers for step 4
  dialog.querySelectorAll(".review-tab").forEach(tab => {
    tab.addEventListener("click", () => switchReviewTab(tab.dataset.tab));
  });

  // Close on backdrop click
  dialog.addEventListener("click", e => {
    if (e.target === dialog) closeAIWorldSpecGenerator();
  });
}

function setupFileUpload() {
  const uploadArea = byId("worldSpecUploadArea");
  const browseBtn = byId("worldSpecBrowseBtn");
  const fileInput = byId("worldSpecAdventureToLoad");

  // Click to browse
  browseBtn.addEventListener("click", e => {
    e.stopPropagation();
    fileInput.click();
  });

  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  // Drag and drop
  uploadArea.addEventListener("dragover", e => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });

  // File input change
  fileInput.addEventListener("change", e => {
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
    const parsed = JSON.parse(text);

    // Check if this is a world spec file (has terrain, locations, states)
    if (parsed.terrain && parsed.locations && parsed.states) {
      // This is a world spec file - import directly
      await handleWorldSpecImport(parsed, file);
      return;
    }

    // Otherwise treat as AI Dungeon adventure
    rawAdventure = parsed;

    // Quick validation
    const adventure = rawAdventure?.data?.adventure || rawAdventure?.adventure || rawAdventure;
    if (!adventure || (!adventure.actionWindow && !adventure.storyCards)) {
      throw new Error("Invalid file format. Expected AI Dungeon adventure or World Spec JSON.");
    }

    // Show preview
    isImportedSpec = false;
    showFilePreview(file, adventure);
    byId("worldSpecWizardNext").disabled = false;
  } catch (error) {
    tip(`Failed to load file: ${error.message}`, true, "error", 4000);
    rawAdventure = null;
    worldSpec = null;
    isImportedSpec = false;
    byId("worldSpecFilePreview").style.display = "none";
  }
}

/**
 * Handle import of a world spec file directly
 */
async function handleWorldSpecImport(spec, file) {
  // Validate the spec
  const validation = WorldSpecApplicator.validateSpec(spec);

  if (!validation.valid) {
    throw new Error(`Invalid world spec: ${validation.errors.join(", ")}`);
  }

  // Show warnings if any
  for (const warning of validation.warnings) {
    console.warn(`[WorldSpec Import] ${warning}`);
  }

  // Store the spec and mark as imported
  worldSpec = spec;
  isImportedSpec = true;

  // Show preview for world spec
  showWorldSpecPreview(file, spec);
  byId("worldSpecWizardNext").disabled = false;
}

/**
 * Show preview for an imported world spec file
 */
function showWorldSpecPreview(file, spec) {
  byId("worldSpecFilePreview").style.display = "block";
  byId("worldSpecPreviewTitle").textContent = spec.worldAnalysis?.summary?.substring(0, 50) || "World Specification";
  byId("worldSpecPreviewActions").textContent = spec.locations?.length || 0;
  byId("worldSpecPreviewCards").textContent = spec.states?.length || 0;
  byId("worldSpecPreviewSize").textContent = formatFileSize(file.size);

  const description = `World spec with ${spec.locations?.length || 0} locations, ${spec.states?.length || 0} states, ${spec.cultures?.length || 0} cultures`;
  byId("worldSpecPreviewDescription").textContent = description;

  // Update labels for world spec context
  const previewEl = byId("worldSpecFilePreview");
  const labels = previewEl.querySelectorAll("strong");
  if (labels.length >= 2) {
    labels[1].textContent = "Locations:";
    labels[2].textContent = "States:";
  }
}

function showFilePreview(file, adventure) {
  byId("worldSpecFilePreview").style.display = "block";
  byId("worldSpecPreviewTitle").textContent = adventure.title || "Untitled";
  byId("worldSpecPreviewActions").textContent = adventure.actionWindow?.length || 0;
  byId("worldSpecPreviewCards").textContent = adventure.storyCards?.length || 0;
  byId("worldSpecPreviewSize").textContent = formatFileSize(file.size);

  const description = adventure.description || adventure.details?.instructions?.scenario;
  byId("worldSpecPreviewDescription").textContent = description
    ? description.substring(0, 200) + (description.length > 200 ? "..." : "")
    : "";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function populateModelSelector() {
  const select = byId("worldSpecModel");
  select.innerHTML = "";

  if (!models || models.length === 0) {
    const option = document.createElement("option");
    option.textContent = "No models available";
    option.disabled = true;
    select.appendChild(option);
    return;
  }

  models.forEach(model => {
    const option = document.createElement("option");
    option.value = model.id;
    const price = model.pricing ? ` · $${model.pricing.input}/$${model.pricing.output} per M` : "";
    option.textContent = `${model.name} — ${model.vendor || ""} ${model.tier || ""}${price}`.replace(/\s+/g, " ").trim();
    select.appendChild(option);
  });

  // Restore saved model preference
  const savedModel = localStorage.getItem("fmg-world-spec-model");
  if (savedModel && models.some(m => m.id === savedModel)) {
    select.value = savedModel;
  } else {
    const preferred = models.find(m => m.id === "anthropic/claude-opus-5-5") || models[0];
    if (preferred) select.value = preferred.id;
  }
}

function openAIWorldSpecGenerator() {
  const dialog = byId("aiWorldSpecDialog");
  if (!dialog) return;

  // Reset state
  currentStep = 1;
  rawAdventure = null;
  preprocessedData = null;
  worldSpec = null;
  currentTab = "terrain";
  isImportedSpec = false;

  // Reset UI
  byId("worldSpecFilePreview").style.display = "none";
  byId("worldSpecAdventureToLoad").value = "";
  byId("worldSpecWizardNext").disabled = true;

  // Update UI to step 1
  updateWizardStep(1);

  dialog.showModal();
}

function closeAIWorldSpecGenerator() {
  const dialog = byId("aiWorldSpecDialog");
  if (dialog) dialog.close();
}

function updateWizardStep(step) {
  currentStep = step;
  const dialog = byId("aiWorldSpecDialog");

  // Update progress indicators
  dialog.querySelectorAll(".wizard-progress .wizard-step").forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove("active", "completed");
    if (s === step) el.classList.add("active");
    else if (s < step) el.classList.add("completed");
  });

  // Update step content visibility
  for (let i = 1; i <= 5; i++) {
    const stepEl = byId(`worldSpecWizardStep${i}`);
    if (stepEl) stepEl.classList.toggle("active", i === step);
  }

  // Update navigation buttons
  const prevBtn = byId("worldSpecWizardPrev");
  const nextBtn = byId("worldSpecWizardNext");

  prevBtn.style.display = step > 1 && step < 5 ? "block" : "none";

  switch (step) {
    case 1:
      // Adjust button text based on whether a world spec was imported
      if (isImportedSpec && worldSpec) {
        nextBtn.textContent = "Review Spec";
        nextBtn.disabled = false;
      } else {
        nextBtn.textContent = "Start Preprocessing";
        nextBtn.disabled = !rawAdventure;
      }
      nextBtn.style.display = "block";
      break;
    case 2:
      nextBtn.textContent = "Configure Generation";
      nextBtn.style.display = preprocessedData ? "block" : "none";
      nextBtn.disabled = false;
      break;
    case 3:
      nextBtn.textContent = "Generate World Spec";
      nextBtn.style.display = "block";
      nextBtn.disabled = false;
      break;
    case 4:
      nextBtn.textContent = "Generate New Map";
      nextBtn.style.display = "block";
      nextBtn.disabled = false;
      break;
    case 5:
      nextBtn.textContent = "Close";
      nextBtn.style.display = "block";
      nextBtn.disabled = false;
      break;
  }
}

function goToPreviousStep() {
  if (currentStep > 1) {
    if (currentStep === 4) {
      byId("worldSpecGenerateLoading").style.display = "none";
    }
    updateWizardStep(currentStep - 1);
  }
}

async function handleNextStep() {
  switch (currentStep) {
    case 1:
      // If we imported a world spec directly, skip to review
      if (isImportedSpec && worldSpec) {
        displayWorldSpec({
          worldSpec,
          analysis: WorldSpecApplicator.validateSpec(worldSpec),
          stats: {
            locations: worldSpec.locations?.length || 0,
            states: worldSpec.states?.length || 0,
            cultures: worldSpec.cultures?.length || 0,
            zones: worldSpec.zones?.length || 0,
            terrainFeatures: worldSpec.terrain?.features?.length || 0,
            validCmds: worldSpec.terrain?.heightmapCommands?.length || 0,
            invalidCmds: 0
          }
        });
        updateWizardStep(4);
      } else {
        await startPreprocessing();
      }
      break;
    case 2:
      updateWizardStep(3);
      break;
    case 3:
      await generateWorldSpec();
      break;
    case 4:
      await generateNewMap();
      break;
    case 5:
      closeAIWorldSpecGenerator();
      break;
  }
}

async function startPreprocessing() {
  if (!rawAdventure) return;

  // Move to step 2 and show loading
  updateWizardStep(2);
  byId("worldSpecPreprocessLoading").style.display = "block";
  byId("worldSpecPreprocessResult").style.display = "none";
  byId("worldSpecWizardNext").style.display = "none";

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
    byId("worldSpecPreprocessLoading").innerHTML = `<p class="change-error">${escapeHtml(error.message)}</p>`;
  }
}

function displayPreprocessResult() {
  byId("worldSpecPreprocessLoading").style.display = "none";
  byId("worldSpecPreprocessResult").style.display = "block";
  byId("worldSpecWizardNext").style.display = "block";

  const meta = preprocessedData.meta || {};
  byId("worldSpecValidActions").textContent = meta.validActions || 0;
  byId("worldSpecTotalActions").textContent = meta.totalActions || 0;
  byId("worldSpecStoryCards").textContent = meta.storyCardCount || 0;
  byId("worldSpecTokens").textContent = meta.estimatedTokens?.toLocaleString() || 0;

  const worldData = preprocessedData.worldData || {};
  byId("worldSpecCharacters").textContent = worldData.characters?.length || 0;
  byId("worldSpecLocations").textContent = worldData.locations?.length || 0;
  byId("worldSpecFactions").textContent = worldData.factions?.length || 0;
  byId("worldSpecItems").textContent = worldData.items?.length || 0;
}

async function generateWorldSpec() {
  const model = byId("worldSpecModel").value;
  const expansionLevel = byId("worldSpecExpansionLevel").value;

  localStorage.setItem("fmg-world-spec-model", model);

  // Show loading in step 3
  byId("worldSpecGenerateLoading").style.display = "block";
  byId("worldSpecWizardNext").style.display = "none";
  byId("worldSpecWizardPrev").style.display = "none";

  try {
    const response = await fetch(`${API_BASE}/world-spec`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        model,
        preprocessedAdventure: preprocessedData,
        expansionLevel
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    worldSpec = data.worldSpec;
    displayWorldSpec(data);

    // Update status
    byId("worldSpecWizardStatus").textContent = `Generated in ${data.duration}s (${data.tokens} tokens)`;

    updateWizardStep(4);
  } catch (error) {
    byId("worldSpecGenerateLoading").innerHTML = `<p class="change-error">${escapeHtml(error.message)}</p>`;
    byId("worldSpecWizardPrev").style.display = "block";
  }
}

function renderFidelitySummary(result) {
  const fidelity = result.fidelity;
  const placement = result.placementSummary;
  if (!fidelity && !placement) return "";

  let html = `<div class="world-spec-fidelity"><h5>Map fidelity</h5><ul>`;
  if (fidelity?.terrain) {
    const t = fidelity.terrain;
    const failed = t.features.filter(f => !f.passed);
    html += `<li>Terrain: ${t.features.length - failed.length}/${t.features.length} features match (score ${Math.round((t.score || 0) * 100)}%)${
      failed.length ? ` - off: ${failed.map(f => escapeHtml(f.id)).join(", ")}` : ""
    }</li>`;
  }
  if (fidelity?.locations) {
    const l = fidelity.locations;
    const failed = l.locations.filter(x => !x.passed);
    html += `<li>Location terrain hints: ${l.locations.length - failed.length}/${l.locations.length} satisfied${
      failed.length ? ` - off: ${failed.map(x => escapeHtml(x.name)).join(", ")}` : ""
    }</li>`;
  }
  if (placement) {
    html += `<li>Placement: ${placement.placed}/${placement.total} located (${placement.exact} on their exact cell, mean offset ${placement.meanDisplacementCells} cells, max ${placement.maxDisplacementCells})${
      placement.unplaced ? `, ${placement.unplaced} could not be placed` : ""
    }</li>`;
  }
  if (result.terrainMode && result.terrainMode !== "features") {
    html += `<li>Terrain source: ${escapeHtml(result.terrainMode)}</li>`;
  }
  html += `</ul></div>`;
  return html;
}

function displayWorldSpec(data) {
  // Display world analysis
  const analysis = worldSpec.worldAnalysis || {};
  byId("worldSpecAnalysisSummary").textContent = analysis.summary || "No summary available";
  byId("worldSpecAnalysisSetting").textContent = analysis.setting || "-";
  byId("worldSpecAnalysisClimate").textContent = analysis.climate || "-";

  // Display themes
  const themesEl = byId("worldSpecAnalysisThemes");
  themesEl.innerHTML = "";
  (analysis.themes || []).forEach(theme => {
    const span = document.createElement("span");
    span.textContent = theme;
    themesEl.appendChild(span);
  });

  // Display validation info
  const validationEl = byId("worldSpecValidation");
  if (data.analysis.valid) {
    const featureCount = data.stats.terrainFeatures ?? worldSpec.terrain?.features?.length ?? 0;
    const terrainNote = featureCount
      ? `${featureCount} terrain features`
      : `${data.stats.validCmds} legacy heightmap commands (will be converted to deterministic terrain)`;
    validationEl.innerHTML = `<span class="validation-success">&#10003; Specification valid: ${terrainNote}</span>`;
  } else {
    validationEl.innerHTML = `<span class="validation-error">&#10007; Specification has ${data.analysis.issues?.length || data.stats.invalidCmds} problem(s)</span>`;
    if (data.analysis.issues.length > 0) {
      validationEl.innerHTML += `<ul class="validation-issues">${data.analysis.issues.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    }
  }

  // Display stats
  byId("worldSpecStatsLocations").textContent = data.stats.locations;
  byId("worldSpecStatsStates").textContent = data.stats.states;
  byId("worldSpecStatsCultures").textContent = data.stats.cultures;
  byId("worldSpecStatsZones").textContent = data.stats.zones;

  // Render first tab
  switchReviewTab("terrain");
}

function switchReviewTab(tabName) {
  currentTab = tabName;
  const dialog = byId("aiWorldSpecDialog");

  // Update tab active state
  dialog.querySelectorAll(".review-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  // Render tab content
  const container = byId("worldSpecReviewTabContent");
  container.innerHTML = "";

  switch (tabName) {
    case "terrain":
      renderTerrainTab(container);
      break;
    case "locations":
      renderLocationsTab(container);
      break;
    case "states":
      renderStatesTab(container);
      break;
    case "cultures":
      renderCulturesTab(container);
      break;
    case "zones":
      renderZonesTab(container);
      break;
  }
}

function renderTerrainTab(container) {
  const terrain = worldSpec?.terrain || {};

  let html = `
    <div class="terrain-info">
      <div class="terrain-row"><strong>Template:</strong> ${escapeHtml(terrain.template || "none")}</div>
      <div class="terrain-row"><strong>Climate:</strong>
        Equator: ${terrain.climateSettings?.temperatureEquator || 0}°C,
        Pole: ${terrain.climateSettings?.temperatureNorthPole || 0}°C,
        Precipitation: ${terrain.climateSettings?.precipitation || "moderate"}
      </div>
    </div>
  `;

  const features = terrain.features || [];
  if (features.length) {
    html += `<h4>Terrain Features (${features.length})</h4><div class="heightmap-commands">`;
    features.forEach(f => {
      const pts = (f.points || []).map(p => `(${p[0]}, ${p[1]})`).join(" ");
      const extras = ["radius", "height", "width", "depth"]
        .filter(k => f[k])
        .map(k => `${k}=${f[k]}`)
        .join(" ");
      html += `<div class="heightmap-cmd"><code>${escapeHtml(f.type)} <b>${escapeHtml(f.id || "")}</b> ${escapeHtml(pts)} ${escapeHtml(extras)}</code></div>`;
    });
    html += `</div>`;
  }

  const commands = terrain.heightmapCommands || [];
  if (commands.length) {
    html += `<h4>Legacy Heightmap Commands (${commands.length})${features.length ? "" : " - converted to deterministic terrain on generation"}</h4><div class="heightmap-commands">`;
    commands.forEach(cmd => {
      html += `<div class="heightmap-cmd"><code>${escapeHtml(cmd)}</code></div>`;
    });
    html += `</div>`;
  }
  if (!features.length && !commands.length) html += `<div class="no-changes">No terrain defined; base template will be used</div>`;
  container.innerHTML = html;
}

function renderLocationsTab(container) {
  const locations = worldSpec?.locations || [];

  if (locations.length === 0) {
    container.innerHTML = '<div class="no-changes">No locations in specification</div>';
    return;
  }

  locations.forEach(loc => {
    const div = document.createElement("div");
    div.className = "review-item";
    div.innerHTML = `
      <div class="review-item-content">
        <div class="review-item-title">${escapeHtml(loc.name)}${loc.isCapital ? " (Capital)" : ""}</div>
        <div class="review-item-detail">Type: ${escapeHtml(loc.type)} | Position: (${(loc.x * 100).toFixed(0)}%, ${(loc.y * 100).toFixed(0)}%)</div>
        ${loc.description ? `<div class="review-item-reason">${escapeHtml(loc.description.substring(0, 150))}...</div>` : ""}
      </div>
    `;
    container.appendChild(div);
  });
}

function renderStatesTab(container) {
  const states = worldSpec?.states || [];

  if (states.length === 0) {
    container.innerHTML = '<div class="no-changes">No states in specification</div>';
    return;
  }

  states.forEach(state => {
    const div = document.createElement("div");
    div.className = "review-item";
    div.innerHTML = `
      <div class="review-item-content">
        <div class="review-item-title">${escapeHtml(state.name)}</div>
        <div class="review-item-detail">Form: ${escapeHtml(state.form)} | Locations: ${state.locations?.length || 0}</div>
        ${state.description ? `<div class="review-item-reason">${escapeHtml(state.description.substring(0, 150))}...</div>` : ""}
      </div>
    `;
    container.appendChild(div);
  });
}

function renderCulturesTab(container) {
  const cultures = worldSpec?.cultures || [];
  const religions = worldSpec?.religions || [];

  if (cultures.length === 0 && religions.length === 0) {
    container.innerHTML = '<div class="no-changes">No cultures or religions in specification</div>';
    return;
  }

  if (cultures.length > 0) {
    const header = document.createElement("h4");
    header.textContent = `Cultures (${cultures.length})`;
    container.appendChild(header);

    cultures.forEach(culture => {
      const div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML = `
        <div class="review-item-content">
          <div class="review-item-title">${escapeHtml(culture.name)}</div>
          <div class="review-item-detail">Type: ${escapeHtml(culture.type || "Generic")}${culture.base ? ` | Base: ${culture.base}` : ""}</div>
          ${culture.description ? `<div class="review-item-reason">${escapeHtml(culture.description.substring(0, 150))}...</div>` : ""}
        </div>
      `;
      container.appendChild(div);
    });
  }

  if (religions.length > 0) {
    const header = document.createElement("h4");
    header.textContent = `Religions (${religions.length})`;
    header.style.marginTop = "1em";
    container.appendChild(header);

    religions.forEach(religion => {
      const div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML = `
        <div class="review-item-content">
          <div class="review-item-title">${escapeHtml(religion.name)}</div>
          <div class="review-item-detail">Type: ${escapeHtml(religion.type || "Folk")}${religion.form ? ` | Form: ${religion.form}` : ""}</div>
          ${religion.description ? `<div class="review-item-reason">${escapeHtml(religion.description.substring(0, 150))}...</div>` : ""}
        </div>
      `;
      container.appendChild(div);
    });
  }
}

function renderZonesTab(container) {
  const zones = worldSpec?.zones || [];
  const borders = worldSpec?.borders || [];

  if (zones.length === 0 && borders.length === 0) {
    container.innerHTML = '<div class="no-changes">No zones or borders in specification</div>';
    return;
  }

  if (zones.length > 0) {
    const header = document.createElement("h4");
    header.textContent = `Zones (${zones.length})`;
    container.appendChild(header);

    zones.forEach(zone => {
      const div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML = `
        <div class="review-item-content">
          <div class="review-item-title">${escapeHtml(zone.name)}</div>
          <div class="review-item-detail">Type: ${escapeHtml(zone.type)} | Center: (${(zone.center.x * 100).toFixed(0)}%, ${(zone.center.y * 100).toFixed(0)}%) | Radius: ${(zone.radius * 100).toFixed(0)}%</div>
          ${zone.description ? `<div class="review-item-reason">${escapeHtml(zone.description.substring(0, 150))}...</div>` : ""}
        </div>
      `;
      container.appendChild(div);
    });
  }

  if (borders.length > 0) {
    const header = document.createElement("h4");
    header.textContent = `Borders (${borders.length})`;
    header.style.marginTop = "1em";
    container.appendChild(header);

    borders.forEach(border => {
      const div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML = `
        <div class="review-item-content">
          <div class="review-item-title">${escapeHtml(border.name || "Unnamed Border")}</div>
          <div class="review-item-detail">Type: ${escapeHtml(border.type)} | Between: ${border.between?.join(" & ") || "?"}</div>
          ${border.hint ? `<div class="review-item-reason">${escapeHtml(border.hint)}</div>` : ""}
        </div>
      `;
      container.appendChild(div);
    });
  }
}

async function generateNewMap() {
  if (!worldSpec) {
    tip("No world specification available", true, "error", 3000);
    return;
  }

  // Show loading state
  byId("worldSpecApplyPreview").style.display = "none";
  byId("worldSpecApplyComplete").style.display = "block";
  byId("worldSpecNextSteps").innerHTML = `
    <div class="world-spec-loading">
      <div class="wizard-spinner"></div>
      <p>Generating map from world specification...</p>
      <p class="loading-stage" id="worldSpecGeneratingStage">Initializing...</p>
    </div>
  `;
  byId("worldSpecWizardNext").disabled = true;
  byId("worldSpecWizardPrev").style.display = "none";

  try {
    // Update stage indicator
    const updateStage = stage => {
      const stageEl = byId("worldSpecGeneratingStage");
      if (stageEl) stageEl.textContent = stage;
    };

    updateStage("Setting up terrain template...");

    // Generate map using the applicator
      const cleanedSpec = WorldSpecApplicator.cleanupWorldSpec(worldSpec);
      const result = await WorldSpecApplicator.generateFromSpec(cleanedSpec);

    // Show success
    const stats = result.stats;
    const errors = result.errors;

    let statusHtml = `
      <h4>Map Generated Successfully!</h4>
      <div class="world-spec-stats">
        <div class="stat-item"><strong>${stats.cultures}</strong> Cultures</div>
        <div class="stat-item"><strong>${stats.states}</strong> States</div>
        <div class="stat-item"><strong>${stats.burgs}</strong> Settlements</div>
        <div class="stat-item"><strong>${stats.markers ?? 0}</strong> Landmarks</div>
        <div class="stat-item"><strong>${stats.religions}</strong> Religions</div>
      </div>
      ${renderFidelitySummary(result)}
    `;

    // Show warnings if any
    if (errors.length > 0) {
      statusHtml += `
        <div class="world-spec-warnings">
          <h5>Warnings (${errors.length})</h5>
          <ul>
            ${errors.map(e => `<li>${escapeHtml(e.stage)}: ${escapeHtml(e.error)}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    // Export options
    statusHtml += `
      <div class="world-spec-export">
        <button id="worldSpecDownloadSpec" class="wizard-btn wizard-btn-secondary">Download Spec JSON</button>
      </div>
    `;

    byId("worldSpecNextSteps").innerHTML = statusHtml;

    // Add download handler
    byId("worldSpecDownloadSpec").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(worldSpec, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `world-spec-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Update to final step
    updateWizardStep(5);

    tip("Map generated from world specification!", true, "success", 5000);
  } catch (error) {
    console.error("[WorldSpecGenerator] Map generation failed:", error);

    // Show error with recovery options
    const errors = WorldSpecApplicator.getErrors();
    const heightmapCommands = worldSpec.terrain?.heightmapCommands?.join("\n") || "";

    byId("worldSpecNextSteps").innerHTML = `
      <div class="world-spec-error">
        <h4>Map Generation Failed</h4>
        <p class="error-message">${escapeHtml(error.message)}</p>
        ${
          errors.length > 0
            ? `
          <div class="error-details">
            <h5>Error Details:</h5>
            <ul>
              ${errors.map(e => `<li><strong>${escapeHtml(e.stage)}:</strong> ${escapeHtml(e.error)}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }
      </div>
      <h4>Manual Fallback</h4>
      <p>You can still create the map manually:</p>
      <ol>
        <li>Click "New Map" in the main toolbar</li>
        <li>Use "Heightmap" → "Custom" and paste the commands below</li>
        <li>Manually configure entities to match the specification</li>
      </ol>
      <div class="world-spec-export">
        <button id="worldSpecCopyCommands" class="wizard-btn wizard-btn-secondary">Copy Heightmap Commands</button>
        <button id="worldSpecDownloadSpec" class="wizard-btn wizard-btn-secondary">Download Full Spec</button>
      </div>
    `;

    // Add event listeners for fallback buttons
    byId("worldSpecCopyCommands").addEventListener("click", () => {
      navigator.clipboard.writeText(heightmapCommands);
      tip("Heightmap commands copied to clipboard", true, "success", 2000);
    });

    byId("worldSpecDownloadSpec").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(worldSpec, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `world-spec-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    byId("worldSpecWizardNext").disabled = false;
    byId("worldSpecWizardPrev").style.display = "block";
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Export functions
if (typeof window !== "undefined") {
  window.initAIWorldSpecGenerator = initAIWorldSpecGenerator;
  window.openAIWorldSpecGenerator = openAIWorldSpecGenerator;
  window.closeAIWorldSpecGenerator = closeAIWorldSpecGenerator;
}

export {initAIWorldSpecGenerator, openAIWorldSpecGenerator, closeAIWorldSpecGenerator};
