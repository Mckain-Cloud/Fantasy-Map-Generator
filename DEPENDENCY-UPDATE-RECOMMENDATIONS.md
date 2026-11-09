# Dependency Update Recommendations & Breaking Changes Analysis

**Date:** 2025-11-28
**Analysis:** Upgrading from 2016-2018 era dependencies to 2024 versions

---

## Executive Summary

**Current State:**
- jQuery 3.1.1 (Sep 2016) → **8+ years old**
- D3.js v5 (2018) → **6+ years old**
- Three.js (unknown, ~r80-100) → **4+ years old**
- TinyMCE (unknown, likely v4-5) → **Potentially 5+ years old**

**Risk Level:**
- 🔴 **HIGH**: Security vulnerabilities in jQuery 3.1.1
- 🟠 **MEDIUM**: D3.js v5 missing features, EOL
- 🟡 **LOW**: Three.js stable but outdated
- 🟡 **LOW**: TinyMCE works but GPL license change

**Update Complexity:**
- jQuery: 🟢 **EASY** (mostly compatible)
- D3.js: 🔴 **HARD** (major breaking changes)
- Three.js: 🟡 **MEDIUM** (incremental changes)
- TinyMCE: 🟢 **EASY** (minimal usage)

---

## 1. jQuery: 3.1.1 → 3.7.1

### Current Version
```html
<script src="libs/jquery-3.1.1.min.js"></script>
```
**Release Date:** September 2016
**Age:** 8+ years

### Recommended Version
```html
<script src="libs/jquery-3.7.1.min.js"></script>
```
**Release Date:** August 2023
**Status:** Latest stable, actively maintained

### Breaking Changes: ⚠️ **MINIMAL**

**Good News:** jQuery follows semver - minor versions (3.x) are backward compatible!

From 3.1.1 → 3.7.1:
- **3.5.0 (April 2020):** Security fixes for HTML manipulation
- **3.6.0 (March 2021):** Modernization improvements
- **3.7.0 (May 2023):** Performance improvements

**Major Security Fix (3.5.0):**
```javascript
// BEFORE (3.1.1): Vulnerable to XSS
$(element).html(userInput);  // Unsafe!

// AFTER (3.5.0+): htmlPrefilter sanitizes
$(element).html(userInput);  // Safer (self-closing tags handled)
```

### Migration Steps

**1. Add jQuery Migrate (during testing):**
```html
<script src="libs/jquery-3.7.1.min.js"></script>
<script src="libs/jquery-migrate-3.4.1.min.js"></script>
```

**2. Test and check console warnings:**
```javascript
// jQuery Migrate will log:
// "JQMIGRATE: jQuery.fn.click() deprecated, use .on('click', ...)"
```

**3. Fix warnings (if any):**
```javascript
// DEPRECATED (but still works):
$("#element").click(handler);

// RECOMMENDED:
$("#element").on("click", handler);
```

**4. Remove jQuery Migrate when clean:**
```html
<script src="libs/jquery-3.7.1.min.js"></script>
```

### Potential Issues in Azgaar's Codebase

**Search Results:** Extensive jQuery usage (~500+ calls)

**Patterns Used:**
```javascript
$("#dialog").dialog(...)        // jQuery UI - should work
$("element").on("click", ...)   // Modern pattern - safe
byId("x").on("input", ...)      // Native wrapper - safe
```

**Risk Assessment:** 🟢 **LOW**
- Codebase uses modern jQuery patterns
- No deprecated APIs detected
- jQuery UI compatible with 3.7.1

**Estimated Effort:** 2-4 hours testing
**Breaking Changes:** 0-2 minor issues expected

---

## 2. D3.js: v5 → v7

### Current Version
```html
<script src="libs/d3.min.js"></script>
```
**Version:** v5 (2018)
**Age:** 6+ years

### Recommended Version
```html
<script src="libs/d3.v7.min.js"></script>
```
**Current:** v7.9.0 (November 2024)

### Breaking Changes: 🔴 **MAJOR**

**v5 → v6 (Most Breaking):**

#### 1. **d3.event Removed** (CRITICAL)
```javascript
// BEFORE (v5):
svg.on("click", function() {
  const point = d3.mouse(this);
  const x = d3.event.pageX;
  const transform = d3.event.transform;
});

// AFTER (v6+):
svg.on("click", function(event) {
  const point = d3.pointer(event, this);
  const x = event.pageX;
  // d3.event is undefined!
});
```

**Impact on Azgaar:** 🔴 **CRITICAL**
- Found **141 occurrences** of `d3.event` across 20 files
- Found **9 occurrences** of `d3.mouse` in main.js alone

**Files Affected:**
```
main.js                           9 uses of d3.event/d3.mouse
modules/ui/editors.js            21 uses
modules/ui/heightmap-editor.js   14 uses
modules/ui/labels-editor.js      14 uses
modules/dynamic/states-editor.js 10 uses
... 15 more files
```

**Example Breakage:**
```javascript
// main.js line 174 - WILL BREAK
const {k, x, y} = d3.event.transform;  // d3.event is undefined in v6+!

// modules/dynamic/hierarchy-tree.js line 503 - WILL BREAK
dragLine.attr("d", `M${from.x},${from.y}L${d3.event.x},${d3.event.y}`);
```

#### 2. **d3.mouse/d3.touch Removed**
```javascript
// BEFORE (v5):
const point = d3.mouse(this);

// AFTER (v6+):
const point = d3.pointer(event, this);
```

#### 3. **Event Listener Signature Changed**
```javascript
// BEFORE (v5):
selection.on("click", function(d, i, nodes) {
  // d = data, i = index, nodes = array
  const event = d3.event;  // Global
});

// AFTER (v6+):
selection.on("click", function(event, d) {
  // event = event object, d = data
  // No global d3.event!
});
```

**v6 → v7 Changes:**
- ES Modules only (less impactful for CDN usage)
- Minor API cleanups
- Performance improvements

### Migration Effort

**Estimated Changes Required:**
- **141 instances** of `d3.event` → Pass event parameter
- **~20-30 files** need modification
- **~300-500 lines** of code affected

**Code Refactor Examples:**

**Example 1: Zoom Handler**
```javascript
// BEFORE (v5):
function zoomed() {
  const {k, x, y} = d3.event.transform;
  viewbox.attr("transform", d3.event.transform);
}

// AFTER (v6+):
function zoomed(event) {
  const {k, x, y} = event.transform;
  viewbox.attr("transform", event.transform);
}
```

**Example 2: Mouse Position**
```javascript
// BEFORE (v5):
svg.on("click", function() {
  const point = d3.mouse(this);
  const cell = findCell(point[0], point[1]);
});

// AFTER (v6+):
svg.on("click", function(event) {
  const point = d3.pointer(event, this);
  const cell = findCell(point[0], point[1]);
});
```

**Example 3: Drag Events**
```javascript
// BEFORE (v5):
d3.event.on("drag", () => {
  const x = d3.event.x;
  const y = d3.event.y;
});

// AFTER (v6+):
// Drag behavior now passes event directly
const drag = d3.drag()
  .on("drag", (event) => {
    const x = event.x;
    const y = event.y;
  });
```

### Risk Assessment: 🔴 **HIGH RISK**

**Pros of Upgrading:**
- ✅ Bug fixes
- ✅ Performance improvements
- ✅ Modern browser optimization
- ✅ Better tree-shaking (if bundled)

**Cons of Upgrading:**
- ❌ 141+ code locations to fix
- ❌ High risk of introducing bugs
- ❌ Extensive testing required
- ❌ Complex refactor across 20+ files

**Recommendation:** 🟡 **DEFER**
- Risk > Reward for v5 → v7
- v5 still works fine
- No critical security issues in D3 v5
- Wait until major refactor planned

**Alternative:** ⚠️ **Incremental Update**
- v5 → v6 first (fix d3.event)
- Test thoroughly
- Then v6 → v7 (easier)

---

## 3. Three.js: Unknown → r170

### Current Version
```html
<script src="libs/three.min.js"></script>
```
**Version:** Unknown (likely r80-r110, circa 2018-2020)
**Age:** 4-6 years estimated

### Recommended Version
```html
<script src="libs/three.r170.min.js"></script>
```
**Current:** r170 (October 2024)

### Breaking Changes: 🟡 **MODERATE**

**Three.js has ~6 releases per year**
- From r110 → r170 = ~60 releases!
- Each release has 10-30 changes
- Cumulative breaking changes: Significant

**Common Breaking Patterns:**

#### 1. **Constructor Changes**
```javascript
// OLD (pre-r125):
const geometry = new THREE.Geometry();

// NEW (r125+):
const geometry = new THREE.BufferGeometry();
```

#### 2. **Material Properties**
```javascript
// OLD:
material.map = texture;
material.needsUpdate = true;

// NEW (various versions):
// Some properties removed/renamed
```

#### 3. **Loader API Changes**
```javascript
// OLD:
const loader = new THREE.TextureLoader();

// NEW:
// Mostly compatible but callback signatures changed
```

### Usage in Azgaar

**Location:** `modules/ui/3d.js` - 3D map visualization

**Patterns Found:**
```javascript
THREE.WebGLRenderer
THREE.Scene
THREE.PerspectiveCamera
THREE.AmbientLight
THREE.SpotLight
THREE.MeshStandardMaterial
THREE.PlaneGeometry
THREE.Mesh
```

**Usage Scope:** Limited - only for 3D view feature

### Risk Assessment: 🟡 **MEDIUM RISK**

**Pros:**
- ✅ Bug fixes
- ✅ Better WebGL support
- ✅ Performance improvements
- ✅ WebGPU support (future)

**Cons:**
- ⚠️ Constructor changes likely
- ⚠️ Material API changes possible
- ⚠️ Need to test 3D view extensively

**Impact:** Limited (3D view is optional feature)

**Recommendation:** 🟢 **UPDATE RECOMMENDED**
- Moderate effort (~1 day testing)
- Limited scope (only 3d.js affected)
- Benefits worth the effort

---

## 4. TinyMCE: Unknown → v7

### Current Version
```javascript
// Dynamically loaded from:
"https://azgaar.github.io/Fantasy-Map-Generator/libs/tinymce/tinymce.min.js"
```
**Version:** Unknown (likely v4 or v5, based on age)
**Age:** Potentially 5+ years

### Recommended Version
**TinyMCE 7.7** (latest as of 2024)

### Breaking Changes: 🟡 **MODERATE**

**v5 → v7 Major Changes:**

#### 1. **License Change**
- **OLD:** LGPL 2.1
- **NEW:** GPL v2+ (from v7.0)
- **Impact:** Must comply with GPL if using v7+

#### 2. **IE11 Support Dropped**
- Not an issue (Azgaar doesn't support IE11 anyway)

#### 3. **Plugin Removals**
```javascript
// tinymce.init() - v5 patterns:
{
  plugins: "template",  // REMOVED in v7
  // ... other plugins
}

// v7 requires:
{
  plugins: "advtemplate",  // Premium replacement
  // ... or remove template functionality
}
```

#### 4. **API Changes**
```javascript
// DEPRECATED (v5):
editor.addButton("mybutton", {...});

// NEW (v6+):
editor.ui.registry.addButton("mybutton", {...});
```

#### 5. **Forced Root Block**
```javascript
// REMOVED in v7:
forced_root_block: false

// All content must be in block elements (<p>, <div>, etc.)
```

#### 6. **Default Sandboxing**
```javascript
// v7 default:
sandbox_iframes: true  // All iframes sandboxed by default
```

### Usage in Azgaar

**Location:** `modules/ui/notes-editor.js`

**Usage Pattern:**
```javascript
tinymce.init({
  selector: "#notesLegend",
  height: "100%",
  menubar: false,
  plugins: "lists code link",
  toolbar: "undo redo | bold italic | bullist numlist | link code"
});

// Later:
tinymce.activeEditor.getContent();
tinymce.activeEditor.setContent(html);
```

**Scope:** Very limited - only for notes rich text editing

### Risk Assessment: 🟢 **LOW RISK**

**Pros:**
- ✅ Bug fixes
- ✅ Security improvements
- ✅ Better mobile support
- ✅ Modern UI

**Cons:**
- ⚠️ GPL license (may require compliance)
- ⚠️ API changes (minimal impact)
- ⚠️ Larger file size

**Impact:** Minimal (simple usage, no custom plugins)

**Recommendation:** 🟢 **UPDATE RECOMMENDED**
- Low effort (~2 hours)
- Limited scope (notes editor only)
- Easy to test

---

## 5. Other Dependencies

### Delaunator, Polylabel, etc.

**Status:** These are algorithmic libraries with stable APIs

**Recommendation:** 🟢 **UPDATE ALL**
- Minimal breaking changes
- Easy drop-in replacements
- Performance improvements

---

## Complete Update Plan

### Priority 1: Security Fixes (Week 1)

#### jQuery 3.1.1 → 3.7.1 ✅ **DO IMMEDIATELY**

**Risk:** 🟢 LOW
**Effort:** 2-4 hours
**Breaking Changes:** Minimal

**Steps:**
1. Download jQuery 3.7.1 + jQuery Migrate 3.4.1
2. Replace in libs/
3. Add migrate for testing:
   ```html
   <script src="libs/jquery-3.7.1.min.js"></script>
   <script src="libs/jquery-migrate-3.4.1.min.js"></script>
   ```
4. Test all dialogs, editors, UI interactions
5. Check console for deprecation warnings
6. Fix any warnings (likely 0-5 issues)
7. Remove jquery-migrate.js
8. Test again
9. Commit

**Expected Issues:** Near zero
- Modern jQuery patterns already used
- Backward compatible
- jQuery UI works with 3.7.1

**Security Benefit:** High - patches 8 years of vulnerabilities

---

### Priority 2: Easy Wins (Week 2)

#### TinyMCE → v7.7 ✅ **RECOMMENDED**

**Risk:** 🟢 LOW
**Effort:** 2-4 hours
**Breaking Changes:** Minimal (simple usage)

**Steps:**
1. Download TinyMCE 7.7 (or use CDN)
2. Replace libs/tinymce/ directory
3. Update init config (if needed):
   ```javascript
   tinymce.init({
     // Check if any deprecated options used
     // Likely none - usage is minimal
   });
   ```
4. Test notes editor
5. Verify AI generation integration works
6. Commit

**Expected Issues:** 0-2
- Very simple usage in codebase
- No custom plugins
- Basic toolbar only

**License Note:** ⚠️ GPL v2+ - Verify compliance

---

#### Utility Libraries ✅ **RECOMMENDED**

**Update all:**
- Delaunator
- Polylabel
- Lineclip
- Simplify.js
- Flatqueue
- IndexedDB wrapper

**Risk:** 🟢 VERY LOW
**Effort:** 1-2 hours
**Breaking Changes:** Unlikely (stable APIs)

**Process:**
1. Check current versions
2. Download latest
3. Replace files
4. Test core map generation
5. Commit

---

### Priority 3: Major Refactor (Week 3-4+)

#### D3.js v5 → v7 ⚠️ **DEFER OR PLAN CAREFULLY**

**Risk:** 🔴 HIGH
**Effort:** 20-40 hours
**Breaking Changes:** Significant (141+ locations)

**Two-Stage Approach:**

**Stage 1: v5 → v6** (Focus on d3.event)
1. Create feature branch
2. Replace d3.v5.min.js with d3.v6.min.js
3. Find/replace all d3.event usage:
   ```javascript
   // Search pattern: d3\.event
   // Files: 20+ files, 141+ occurrences

   // Example refactor:
   function zoomed() {
     const {k, x, y} = d3.event.transform;
   }
   // Becomes:
   function zoomed(event) {
     const {k, x, y} = event.transform;
   }
   ```
4. Update all event handlers to accept event parameter
5. Replace d3.mouse → d3.pointer
6. Test EVERY editor, EVERY tool, EVERY interaction
7. Extensive QA (2-3 days)
8. Commit

**Stage 2: v6 → v7**
1. Replace d3.v6.min.js with d3.v7.min.js
2. Test (mostly compatible)
3. Fix any ES module issues (if using UMD build, should be fine)
4. Commit

**Files Requiring Changes (Partial List):**

**Critical Files:**
```
main.js - 9 instances
  Line 174: const {k, x, y} = d3.event.transform;

modules/ui/editors.js - 21 instances
  Multiple click handlers, drag handlers

modules/ui/heightmap-editor.js - 14 instances
  Brush painting, zoom handling

modules/ui/labels-editor.js - 14 instances
  Label dragging, positioning

modules/dynamic/states-editor.js - 10 instances
  State boundary editing

modules/dynamic/religions-editor.js - 11 instances
  Religion region editing

modules/dynamic/cultures-editor.js - 11 instances
  Culture region editing
```

**Testing Required:**
- ✅ Map generation (zoom, pan)
- ✅ All editors (states, burgs, cultures, religions, provinces)
- ✅ Heightmap editor (brush tools)
- ✅ Label editor (drag and drop)
- ✅ Route editor (path creation)
- ✅ Military editor (regiment movement)
- ✅ All mouse interactions
- ✅ All drag interactions
- ✅ All zoom interactions

**Recommendation:** 🔴 **DEFER UNLESS NECESSARY**
- High risk
- High effort
- Low immediate benefit
- D3 v5 works fine
- No security issues

**When to Update:**
- Planning major refactor anyway
- Need v7-specific features
- Want to modernize codebase
- Have 1-2 weeks for testing

---

#### Three.js → r170 🟡 **OPTIONAL**

**Risk:** 🟡 MEDIUM
**Effort:** 8-16 hours
**Breaking Changes:** Moderate (incremental over 60 releases)

**Steps:**
1. Identify current version (check three.min.js)
2. Review migration guides for gap
3. Update file
4. Test 3D view extensively
5. Fix any constructor/API changes
6. Commit

**Recommendation:** 🟡 **OPTIONAL**
- 3D view is optional feature
- Current version likely works fine
- Update if needed or during refactor

---

## Detailed Breaking Changes by Dependency

### jQuery 3.1.1 → 3.7.1: Line-by-Line

**3.2.0 (March 2017):**
- No breaking changes

**3.3.0 (January 2018):**
- Fixed: Issues with .width() and .height() on SVG elements
- Impact: None (uses native methods)

**3.4.0 (April 2019):**
- Performance improvements
- Impact: None

**3.5.0 (April 2020):** ⚠️ **SECURITY**
- **Fixed:** XSS vulnerability in .html() and .append()
- **Change:** htmlPrefilter now sanitizes self-closing tags
- **Impact:** Minimal - makes code safer

**3.6.0 (March 2021):**
- Dropped support for IE <11
- Impact: None (Azgaar doesn't support IE anyway)

**3.7.0 (May 2023):**
- Added support for `selector:has()` in Sizzle
- Performance improvements
- Impact: None

**3.7.1 (August 2023):**
- Bug fixes
- Impact: None

**Total Breaking Changes:** 0
**Security Fixes:** 3+
**Effort:** Minimal

---

### D3.js v5 → v7: Complete Checklist

**v5 → v6 Breaking Changes:**

✅ **1. d3.event removed**
   - Replacement: Pass event as parameter
   - Occurrences: 141+
   - Effort: HIGH

✅ **2. d3.mouse/d3.touch removed**
   - Replacement: d3.pointer(event, container)
   - Occurrences: 9+
   - Effort: LOW

✅ **3. Event signature changed**
   - Old: `function(d, i, nodes)`
   - New: `function(event, d)`
   - Occurrences: Most event handlers
   - Effort: HIGH

✅ **4. d3.nest removed**
   - Replacement: d3.group, d3.rollup
   - Usage in Azgaar: Unknown (need to check)
   - Effort: LOW (if used)

✅ **5. Native collections**
   - d3.map → native Map
   - d3.set → native Set
   - Impact: Likely minimal

**v6 → v7 Breaking Changes:**

✅ **1. ES Modules default**
   - Can still use UMD build
   - Impact: None (using CDN/script tags)

✅ **2. bin() ignores nulls**
   - Impact: Likely none

✅ **3. Ordinal scale domains use InternMap**
   - Impact: Minimal

---

## Codebase Impact Analysis

### Files Requiring D3 Migration (Top 20)

```
HIGH IMPACT (10+ changes each):
1. modules/ui/editors.js                    21 instances
2. modules/ui/heightmap-editor.js           14 instances
3. modules/ui/labels-editor.js              14 instances
4. modules/dynamic/states-editor.js         10 instances
5. modules/dynamic/religions-editor.js      11 instances

MEDIUM IMPACT (5-10 changes each):
6. main.js                                   9 instances
7. modules/ui/burg-editor.js                 8 instances
8. modules/ui/emblems-editor.js              9 instances
9. modules/ui/coastline-editor.js            6 instances
10. modules/ui/ice-editor.js                 9 instances
11. modules/dynamic/cultures-editor.js       11 instances

LOW IMPACT (1-5 changes each):
12. modules/dynamic/hierarchy-tree.js        5 instances
13. modules/ui/burgs-overview.js             4 instances
14. modules/ui/general.js                    5 instances
15. modules/renderers/draw-state-labels.js   3 instances
16. modules/renderers/draw-features.js       2 instances
17. modules/ui/diplomacy-editor.js           2 instances
18. modules/ui/battle-screen.js              ? instances
19. modules/ui/biomes-editor.js              5 instances
20. modules/io/load.js                       2 instances
```

**Total Estimated Changes:** 150-200 code locations

---

## Migration Strategy Options

### Option A: Conservative (RECOMMENDED)

**Update Only Safe Dependencies:**

✅ **jQuery 3.1.1 → 3.7.1** (Week 1)
- Security fix
- Low risk
- High benefit

✅ **TinyMCE → v7** (Week 2)
- Modern UI
- Low risk
- Limited scope

✅ **Utility Libraries** (Week 2)
- Delaunator, Polylabel, etc.
- Near-zero risk
- Easy updates

❌ **D3.js - SKIP**
- Keep v5
- Too risky
- Not worth effort

❌ **Three.js - SKIP**
- Optional feature
- Works fine
- Low priority

**Timeline:** 2 weeks
**Risk:** 🟢 LOW
**Benefit:** Security + minor improvements

---

### Option B: Aggressive (NOT RECOMMENDED)

**Update Everything:**

All dependencies → latest

**Timeline:** 6-8 weeks
**Risk:** 🔴 HIGH
**Benefit:** Modern stack, but...
- ❌ High risk of bugs
- ❌ Extensive testing needed
- ❌ May break production
- ❌ Not worth the effort

---

### Option C: Incremental (LONG TERM)

**Phase 1:** Security (immediately)
- jQuery → 3.7.1

**Phase 2:** Easy wins (next release)
- TinyMCE → v7
- Utility libs → latest

**Phase 3:** Major refactor (when planned)
- D3.js v5 → v6
- Extensive testing
- Fix all event handlers

**Phase 4:** Complete modernization (far future)
- D3.js v6 → v7
- Three.js → latest
- ES modules (optional)

**Timeline:** 6-12 months
**Risk:** 🟡 MEDIUM (staged)
**Benefit:** Gradual modernization

---

## Recommended Action Plan

### Immediate (Do This Week)

**1. Update jQuery**
```bash
# Download
curl -o libs/jquery-3.7.1.min.js https://code.jquery.com/jquery-3.7.1.min.js
curl -o libs/jquery-migrate-3.4.1.min.js https://code.jquery.com/jquery-migrate-3.4.1.min.js

# Update index.html
# Old: <script src="libs/jquery-3.1.1.min.js"></script>
# New: <script src="libs/jquery-3.7.1.min.js"></script>
#      <script src="libs/jquery-migrate-3.4.1.min.js"></script>

# Test everything
# Check console for warnings
# Fix warnings (if any)
# Remove migrate script
# Commit
```

**Expected Issues:** 0-2
**Time:** 2-4 hours
**Benefit:** ✅ Security patches, 8 years of bug fixes

---

### Short Term (Next Release)

**2. Update TinyMCE**
```bash
# Download TinyMCE 7.7
# Replace libs/tinymce/ directory
# Update notes-editor.js config (minimal changes)
# Test notes editor
# Commit
```

**Expected Issues:** 1-3
**Time:** 2-4 hours
**Benefit:** ✅ Modern UI, better mobile support

**3. Update Utility Libraries**
```bash
# For each library:
# - Check GitHub for latest release
# - Download .min.js
# - Replace in libs/
# - Test core functionality
# - Commit individually

Libraries:
- Delaunator
- Polylabel
- Lineclip
- Simplify.js
- Flatqueue
- JSZip
- Alea PRNG
```

**Expected Issues:** 0-5
**Time:** 4-8 hours
**Benefit:** ✅ Bug fixes, performance

---

### Long Term (Future Refactor)

**4. D3.js v5 → v6 (ONLY if doing major refactor)**

**Pre-requisites:**
- Have 2-3 weeks available
- Plan comprehensive testing
- Have rollback strategy
- Consider stable release cycle

**Refactor Pattern:**
```javascript
// Create utility wrapper for migration period
const getEvent = (event) => event || d3.event;  // Fallback during migration

// Gradually replace:
svg.on("click", function() {
  const point = d3.mouse(this);
});

// With:
svg.on("click", function(event) {
  const point = d3.pointer(event, this);
});
```

**Tool-Assisted Migration:**
```bash
# Find all occurrences
grep -rn "d3\.event" modules/ main.js

# Sed replace (careful!):
# Manual review each file
# Can't fully automate due to context sensitivity
```

**Testing Checklist:**
- [ ] Map zoom and pan
- [ ] All 47 UI editors
- [ ] All drag interactions
- [ ] All click handlers
- [ ] Heightmap painting
- [ ] Label positioning
- [ ] Route creation
- [ ] Military movement
- [ ] Every mouse interaction

**Expected Issues:** 20-40
**Time:** 20-40 hours
**Benefit:** ⚠️ Debatable - v5 works fine

---

## Risk Matrix

| Library | Current | Latest | Severity | Effort | Risk | Recommendation |
|---------|---------|--------|----------|--------|------|----------------|
| **jQuery** | 3.1.1 | 3.7.1 | 🔴 HIGH | 🟢 LOW | 🟢 LOW | ✅ **DO NOW** |
| **D3.js** | v5 | v7 | 🟡 MEDIUM | 🔴 HIGH | 🔴 HIGH | ❌ **DEFER** |
| **Three.js** | ~r100 | r170 | 🟡 LOW | 🟡 MEDIUM | 🟡 MEDIUM | 🟡 **OPTIONAL** |
| **TinyMCE** | ~v5 | v7.7 | 🟡 LOW | 🟢 LOW | 🟢 LOW | ✅ **RECOMMENDED** |
| **Utilities** | Various | Latest | 🟢 LOW | 🟢 LOW | 🟢 LOW | ✅ **RECOMMENDED** |

---

## Summary: What to Update

### Do Now (High Value, Low Risk)
1. ✅ **jQuery 3.1.1 → 3.7.1**
   - Security critical
   - 2-4 hours
   - Near-zero breakage

### Do Soon (Good Value, Low Risk)
2. ✅ **TinyMCE → v7.7**
   - Modern improvements
   - 2-4 hours
   - Minimal breakage

3. ✅ **Utility Libraries → Latest**
   - Bug fixes
   - 4-8 hours
   - Rare breakage

### Do Later (Low Value, High Risk)
4. ⚠️ **D3.js v5 → v6 → v7**
   - 20-40 hours
   - 141+ code changes
   - High testing burden
   - Defer unless refactoring anyway

5. 🟡 **Three.js → r170**
   - 8-16 hours
   - Limited scope
   - Optional feature
   - Update if convenient

---

## Testing Strategy

### Regression Testing Checklist

After each update, test:

**Core Functionality:**
- [ ] Generate new map
- [ ] Load existing map
- [ ] Save map
- [ ] Autosave working
- [ ] Export to PNG/SVG

**UI Interactions:**
- [ ] Open all editors (states, burgs, cultures, etc.)
- [ ] Edit entities
- [ ] Drag elements
- [ ] Click handlers
- [ ] Context menus
- [ ] Dialogs open/close

**Map Interactions:**
- [ ] Zoom in/out
- [ ] Pan around map
- [ ] Click on entities
- [ ] Hover tooltips

**3D View (if updating Three.js):**
- [ ] Open 3D view
- [ ] Rotate camera
- [ ] Zoom controls
- [ ] Texture rendering

**Notes Editor (if updating TinyMCE):**
- [ ] Open notes editor
- [ ] Rich text formatting
- [ ] AI generation integration
- [ ] Save notes

---

## Sources

### jQuery Resources:
- [jQuery Core Upgrade Guides](https://jquery.com/upgrade-guide/)
- [jQuery 3.5 Upgrade Guide](https://jquery.com/upgrade-guide/3.5/)
- [Upgrading jQuery: Working Towards a Healthy Web](https://blog.jquery.com/2024/04/17/upgrading-jquery-working-towards-a-healthy-web/)
- [jQuery Migrate Plugin](https://github.com/jquery/jquery-migrate)
- [jQuery Security Vulnerabilities](https://security.snyk.io/package/npm/jquery/3.7.1)

### D3.js Resources:
- [D3.js CHANGES.md](https://github.com/d3/d3/blob/main/CHANGES.md)
- [D3 v6 Migration Guide](https://observablehq.com/@d3/d3v6-migration-guide)
- [D3.js Releases](https://github.com/d3/d3/releases)

### TinyMCE Resources:
- [Migrating from TinyMCE 5 to TinyMCE 7.0](https://www.tiny.cloud/docs/tinymce/latest/migration-from-5x/)
- [TinyMCE 7.0 Release Notes](https://www.tiny.cloud/docs/tinymce/7/7.0-release-notes/)
- [How to upgrade to TinyMCE version 7](https://www.tiny.cloud/blog/how-to-upgrade-to-tinymce-7/)

### Three.js Resources:
- [Three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
- [Three.js Releases](https://github.com/mrdoob/three.js/releases)

---

## Conclusion

**Immediate Action Required:**
- ✅ jQuery 3.7.1 - Security critical, easy update
- ✅ TinyMCE v7 - Modern UI, easy update
- ✅ Utility libs - Maintenance, easy updates

**Defer:**
- ❌ D3.js v7 - High effort, high risk, low immediate value
- 🟡 Three.js r170 - Optional feature, moderate effort

**Total Effort for Recommended Updates:**
- 8-16 hours total
- Minimal breaking changes
- High security value
- Low risk

**Your AI integration should proceed with current dependencies**, then update jQuery/TinyMCE/utilities as maintenance work.
