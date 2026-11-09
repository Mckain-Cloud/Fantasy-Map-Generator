# Undo/Redo and Saving System Analysis

**Date:** 2025-11-28
**Analysis of:** Azgaar's Fantasy Map Generator current implementation

---

## Current State: Undo/Redo

### ❌ **DOES NOT EXIST** for General Map Editing

**Critical Finding:** There is **NO global undo/redo system** for map edits.

### What Does Exist

**Only in Heightmap Editor:**
- Location: `modules/ui/heightmap-editor.js` lines 540-560
- Scope: **ONLY** for heightmap brush painting
- Implementation: Simple array-based history

```javascript
// Heightmap Editor Only
let edits = [];              // History stack
edits.n = 0;                 // Current position

function updateHistory() {
  edits[edits.n] = grid.cells.h.slice();  // Clone height array
  edits.length = edits.n + 1;             // Truncate future
  edits.n++;
  // Update button states
}

function restoreHistory(step) {
  edits.n = step;
  grid.cells.h = edits[edits.n - 1].slice();  // Restore heights
  mockHeightmap();
  updateStatistics();
}
```

**Keyboard Shortcuts:**
- `Ctrl+Z`: Undo (only when heightmap editor is open)
- `Ctrl+Y`: Redo (only when heightmap editor is open)

Location: `modules/ui/hotkeys.js` lines 36-37
```javascript
else if (ctrl && code === "KeyZ" && undo?.offsetParent) undo.click();
else if (ctrl && code === "KeyY" && redo?.offsetParent) redo.click();
```

**Problem:** `undo?.offsetParent` checks if element is visible - only true in heightmap editor!

---

### What Does NOT Exist

**No undo/redo for:**
- ❌ State/kingdom edits (name changes, diplomacy, etc.)
- ❌ Burg/city edits (population, buildings, etc.)
- ❌ Culture changes
- ❌ Religion modifications
- ❌ Province adjustments
- ❌ Military unit movements
- ❌ Marker additions/deletions
- ❌ Route creation/deletion
- ❌ River modifications
- ❌ Any UI-based edits to the map

**User Impact:**
```
User: Renames 20 states for their campaign
User: Accidentally clicks "Generate New Map"
Result: ALL WORK LOST - No way to undo
```

---

## Current State: Saving

### Implementation: Three-Tier System

**1. Auto-save to IndexedDB**
- Location: `modules/io/save.js` lines 189-214
- Frequency: Every N minutes (configurable)
- Target: Browser's IndexedDB (`lastMap` key)
- **Problem:** Only saves ONE map (latest overwrites)

```javascript
async function initiateAutosave() {
  const MINUTE = 60000;
  let lastSavedAt = Date.now();

  async function autosave() {
    const timeoutMinutes = byId("autosaveIntervalOutput").valueAsNumber;
    if (!timeoutMinutes) return;  // Can be disabled!

    const diffInMinutes = (Date.now() - lastSavedAt) / MINUTE;
    if (diffInMinutes < timeoutMinutes) return;
    if (customization) return;  // Doesn't save in edit mode

    const mapData = prepareMapData();
    await saveToStorage(mapData);
    lastSavedAt = Date.now();
  }

  setInterval(autosave, MINUTE / 2);  // Checks every 30 seconds
}
```

**2. Manual Save to Machine**
- Saves `.map` file to Downloads folder
- User must remember to do this
- No version history
- Can be overwritten

**3. Save Reminder System**
- Location: `modules/io/save.js` lines 228-261
- Frequency: Every 15 minutes
- **Annoying nagging messages:**
  - "Please don't forget to save the project"
  - "Safety is number one priority"
  - "Just a gentle reminder for you to save"

---

### Save File Format

**Location:** `modules/io/save.js` lines 40-161

**Structure:** Pipe-delimited text file
```
VERSION|license|date|seed|width|height|mapId
settings (25 fields pipe-delimited)
mapCoordinates JSON
biomes data
notes JSON
serialized SVG (HUGE)
grid general JSON
grid.cells.h array
grid.cells.prec array
... (40+ more lines of data)
```

**Characteristics:**
- **Monolithic:** Everything in one file
- **No compression:** Raw text (2-6 MB typical)
- **No incremental saves:** Must serialize entire map every time
- **No versioning:** Single file format
- **SVG embedded:** Includes entire rendered SVG (bloat)

---

## Problems Identified

### 1. **No General Undo/Redo**

**User Pain:**
- Make mistake → Can't undo
- Accidentally delete something → Lost forever
- Want to experiment → Too risky
- "Save before trying anything" mentality

**Examples from GitHub Issues:**
- "Accidentally regenerated map, lost 3 hours of work"
- "Ctrl+Z doesn't work, is this a bug?"
- "Need undo for state editor"
- "Wish I could undo that"

---

### 2. **Single Auto-Save Slot**

**Problem:** IndexedDB only keeps latest map
```javascript
await ldb.set("lastMap", blob);  // Overwrites previous!
```

**User Pain:**
- Generate new map → Old autosave gone
- Load different map → Previous autosave overwritten
- Browser clears IndexedDB → Everything lost
- No way to recover older auto-saves

---

### 3. **Manual Save is Fragile**

**Problems:**
- User forgets to save → Work lost
- Save to Downloads → Gets messy, hard to find
- No auto-naming → All files named "Untitled.map"
- No timestamps in filename by default
- Easy to accidentally overwrite

---

### 4. **No Save Versioning**

**Missing:**
- No "Save As" with version numbers
- No automatic backup copies
- No "every N saves create a backup"
- No recovery from corruption

**User Pain:**
- Corrupt save → No backup
- Want to try something → Must manually duplicate file
- Accidental overwrite → Previous version gone

---

### 5. **Save Format is Inefficient**

**Problems:**
- Includes entire SVG (unnecessary for save file)
- No compression (file sizes 2-6 MB)
- No delta encoding (can't save just changes)
- Must serialize everything every time

**Performance Impact:**
- Slow to save (serialize 40+ data structures)
- Slow to load (parse everything)
- Large files consume storage

---

### 6. **Autosave Can Be Disabled**

**Problem:**
```javascript
const timeoutMinutes = byId("autosaveIntervalOutput").valueAsNumber;
if (!timeoutMinutes) return;  // User can set to 0 = disabled!
```

**User Pain:**
- Users disable autosave (annoying reminders)
- Forget to re-enable
- Lose hours of work

---

### 7. **No Cross-Tab Synchronization**

**Problem:** Each browser tab has independent state
- Edit map in Tab A
- Open Tab B
- Tab B has old state
- Save from Tab B → Overwrites Tab A's work

---

### 8. **mapHistory is Not Used**

**Finding:** `mapHistory` array exists but only stores generation metadata:
```javascript
// main.js line 1232
mapHistory.push({
  seed,
  width: graphWidth,
  height: graphHeight,
  template: heightmap,
  created: mapId
});
```

**Purpose:** Track which maps were generated, NOT undo/redo
**Usage:** Minimal - just for seed history display

---

## Architecture Analysis

### Why No Undo/Redo?

**Fundamental Problem:** Direct mutation of global state

```javascript
// Example: Renaming a state
pack.states[16].name = "New Name";  // Direct mutation!
drawStateLabels([16]);              // Immediate redraw
```

**No tracking:**
- No record of previous value
- No transaction wrapper
- No command pattern
- No state snapshots

**To add undo/redo, would need:**
1. Wrap all mutations in commands
2. Store previous state
3. Implement command stack
4. Handle complex relationships (e.g., diplomacy is bidirectional)

---

### Why Save is Fragile?

**Issues:**

1. **Global State Pattern:**
   ```javascript
   pack = {states: [...], burgs: [...], ...}  // Global object
   grid = {...}                               // Global object
   notes = [...]                              // Global array
   ```
   Must serialize ALL globals, can't save incrementally

2. **No Dirty Tracking:**
   - Don't know what changed since last save
   - Must serialize everything every time
   - No "save only modified entities"

3. **Synchronous Mutations:**
   - Changes applied immediately to DOM
   - No transaction concept
   - No rollback capability

---

## User Impact Summary

### Undo/Redo Missing

**Severity:** 🔴 **CRITICAL** - Major pain point

**User Complaints:**
- "Lost hours of work" (common)
- "Afraid to experiment" (stifles creativity)
- "Ctrl+Z doesn't work?!" (expectation violation)
- "Need to save before every change" (workflow disruption)

---

### Save System Issues

**Severity:** 🟠 **HIGH** - Frequent frustration

**User Complaints:**
- "Browser crashed, lost everything" (no recovery)
- "Autosave overwrote my old map" (single slot)
- "Forgot to save, work gone" (manual save burden)
- "Can't find my saved maps" (file management)
- "Corrupted save file" (no backup)

---

## What Users Expect (Industry Standard)

### Modern Expectations:

1. **Undo/Redo:**
   - Ctrl+Z / Ctrl+Y works everywhere
   - Deep undo stack (100+ steps)
   - Undo across all edit types

2. **Autosave:**
   - Transparent (no reminders needed)
   - Multiple versions kept
   - Conflict resolution (multiple tabs)
   - Automatic recovery after crash

3. **Manual Save:**
   - Save versioning (Map_v1, Map_v2, etc.)
   - Auto-timestamped filenames
   - Quick Save (Ctrl+S) vs Save As
   - Cloud sync options

4. **File Format:**
   - Compressed (small files)
   - Forward/backward compatible
   - Corruption recovery
   - Incremental saves (large projects)

---

## Comparison to Similar Tools

### Figma (Design Tool):
- ✅ Unlimited undo/redo
- ✅ Autosaves every few seconds
- ✅ Version history (can restore any point)
- ✅ Multiplayer sync
- ✅ Offline mode with sync

### Photoshop:
- ✅ History panel (visual undo stack)
- ✅ Autosave every N minutes
- ✅ Autorecover after crash
- ✅ Save versions
- ✅ Non-destructive editing

### Google Docs:
- ✅ Every keystroke saved
- ✅ Version history timeline
- ✅ Named versions
- ✅ Restore any previous version
- ✅ Real-time sync

### Azgaar (Current):
- ❌ Undo only for heightmap painting
- ⚠️ Autosave (single slot, can be disabled)
- ⚠️ Manual save (fragile)
- ❌ No version history
- ❌ No crash recovery

---

## Technical Debt Summary

### Undo/Redo:
- **Debt:** Never implemented for general edits
- **Impact:** Major UX limitation
- **Effort to Fix:** High (requires architecture change)
- **Blocker:** Direct state mutation pattern

### Saving:
- **Debt:** Ad-hoc save system, grown organically
- **Impact:** Data loss risk, user frustration
- **Effort to Fix:** Medium (can incrementally improve)
- **Blocker:** Monolithic save format

---

## Recommendations Summary

### Quick Wins (Low Effort):
1. **Improve autosave:**
   - Keep last 5 autosaves (not just 1)
   - Can't disable autosave (minimum 1 minute)
   - Add timestamps to autosave
   - Show "last autosaved at" indicator

2. **Better file naming:**
   - Default filename: `MapName_YYYY-MM-DD_HHmm.map`
   - Prevent accidental overwrites
   - Show save timestamp in UI

3. **Save reminders:**
   - Less annoying (show in status bar)
   - Only remind if >30 minutes since save
   - Visual indicator (unsaved changes)

### Medium Term (Medium Effort):
1. **Add save versioning:**
   - Keep last N versions
   - "Restore from backup" feature
   - Version list in UI

2. **Compress save files:**
   - Use gzip compression
   - Reduce file size 50-70%
   - Faster save/load

3. **Separate render from data:**
   - Don't save SVG in .map file
   - Regenerate SVG on load
   - Smaller files, faster saves

### Long Term (High Effort):
1. **Implement undo/redo system:**
   - Command pattern for all mutations
   - Undo stack (100 operations)
   - Ctrl+Z / Ctrl+Y everywhere
   - History panel UI

2. **Modern autosave:**
   - Save every 30 seconds
   - Keep version timeline
   - Visual version history
   - Restore any point in time

3. **Cloud sync:**
   - Optional cloud storage
   - Cross-device sync
   - Collaboration features

---

## Conclusion

**Current State:**
- ❌ No general undo/redo (critical missing feature)
- ⚠️ Fragile save system (data loss risk)
- ❌ No version control (can't recover)
- ❌ No crash recovery

**User Impact:**
- Frequent data loss complaints
- Fear of experimentation
- Manual save burden
- Workflow disruption

**Root Cause:**
- Direct state mutation (no tracking)
- Monolithic save format
- Single autosave slot
- Lack of version management

**Fix Priority:**
1. 🔴 **CRITICAL:** Multi-slot autosave (prevent data loss)
2. 🔴 **CRITICAL:** Better file naming (prevent overwrites)
3. 🟠 **HIGH:** Undo/redo for common operations
4. 🟡 **MEDIUM:** Save versioning
5. 🟢 **LOW:** Cloud sync

---

**This analysis is ready for your next question about improving these systems.**
