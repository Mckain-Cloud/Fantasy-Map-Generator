/**
 * World Specification Prompts Module
 *
 * Contains system prompts, user message builders, and JSON schemas
 * for the AI World Specification Generator.
 */

// ============================================================================
// Expansion Level Prompts
// ============================================================================

export const EXPANSION_PROMPTS = {
    strict: `
You are extracting ONLY what is explicitly stated in the narrative.

**Rules:**
- Only include locations that are explicitly named in the text
- Only create states/factions that are directly mentioned
- Do not infer, extrapolate, or create any content not present in the source
- If a capital city is mentioned but not described, include it with minimal description
- Leave borders empty if no natural boundaries are explicitly described
- Cultures and religions should only reflect what characters explicitly practice or reference
- When in doubt, omit rather than invent

**Conflict Type Detection (CRITICAL):**
Before applying any spatial rules, classify the conflict:
- **Territorial Warfare**: Enemy faction holds territory, clear front lines exist → Apply territorial coherence
- **Mobile Threat**: Dragons, monsters, raiders with no fixed territory → No territorial axis, threats can strike anywhere
- **Civil Unrest**: Groups share the same territory with tension → No territorial axis, populations are intermingled  
- **Personal Conflict**: Individual feuds or vendettas → No territorial axis
- **No Conflict**: Peaceful or exploration-focused → No territorial axis

**Territorial Coherence (only for Territorial Warfare):**
When territorial warfare is explicitly described:
- If the narrative states an enemy attacks "from the east," all extracted enemy locations must have higher x-values than defender locations
- If a location is described as "behind friendly lines" or "in safe territory," it must be placed away from enemy positions
- If a location is described as "overrun," "fallen," or "enemy-held," place it on the enemy's side of any described front
- Extract the conflict direction from phrases like "eastern frontier," "northern invasion," "pressed from the south"
- Do NOT place enemy-held locations between friendly assets unless the text explicitly describes encirclement or infiltration

**CRITICAL - Ownership Rule:**
Determine ownership from NARRATIVE OUTCOMES - who controls each location at the end of the story?
- Recently captured/cleared by faction X → owner: faction X
- Fallen to enemy and still held by them → owner: enemy faction
- Active battlefield / no-man's-land with no clear holder → owner: "none"
- Natural features (rivers, mountains) → owner: "none"

**CRITICAL - Geography Extraction:**
Extract terrain features from narrative details:
- Flight paths over mountains → place a \`mountains\` feature along that route
- Rivers as defensive lines → place a \`valley\` feature there (rivers form in valleys)
- Valleys, passes, chokepoints mentioned in travel → leave gaps between mountain features
- Climate details (cold, ash-choked, tropical) → set climateSettings accordingly

**CRITICAL - Factions vs States:**
Allied organizations defending the same territory should NOT be separate states:
- Military orders, religious factions, mercenary companies within an empire → same state, different locations
- Only create separate states for truly independent political entities with their own territory
- Use location descriptions to note which sub-faction controls a specific building/area

**Your output should be a faithful extraction, not a creative expansion.**
`,

    moderate: `
You are extracting content from the narrative while filling reasonable gaps.

**Rules:**
- Extract all explicitly named locations
- Infer logical locations that must exist (e.g., if characters "cross a river," that river exists)
- Create states to organize locations under logical political control
- Add cultures and religions when characters reference traditions or beliefs
- Define borders using natural features mentioned or implied by terrain commands
- Fill gaps minimally - add what's needed for coherence, nothing more
- Descriptions should summarize narrative content, not add new lore

**Conflict Type Detection (CRITICAL - Do This First):**
Before applying spatial rules, classify the conflict present in the narrative:

| Type | Indicators | Example | Territorial Rules? |
|------|------------|---------|-------------------|
| **Territorial Warfare** | "invasion from the east," "siege," "front lines," "fallen provinces," enemy faction holds territory | Dead Legion (undead vs empire) | YES |
| **Mobile/Asymmetric Threat** | Dragons, monsters, raiders; enemy strikes and retreats; no fixed enemy territory | Dragon blood feud, bandit raids | NO |
| **Civil Unrest** | "tensions between settlers and locals," groups share same town/region | Colonial friction | NO |
| **Personal Conflict** | Feuds, rivalries, vendettas between individuals | Family blood feud | NO |
| **No Active Conflict** | Exploration, peaceful, historical conflicts only | Travelogue | NO |

**Key test:** Does the enemy HOLD TERRITORY with a FRONT LINE? If NO → skip territorial coherence, use non-territorial conflict type.

**Territorial Coherence (ONLY for Territorial Warfare):**
When territorial warfare is identified:

1. **Identify the threat axis** - Determine which direction the enemy/threat comes from
   - Look for phrases like "eastern frontier," "pressed from the south," "northern hordes"
   - The attacker's capital/stronghold indicates their origin direction
   - Set conflictType to "territorial_warfare_east", "territorial_warfare_west", etc.

2. **Establish the front line** - Determine where factions meet
   - Siege locations, battlefields, and contested zones mark the front
   - The front should sit between the two factions' core territories

3. **Place locations on the correct side:**
   - DEFENDER'S REAR (away from threat): supply lines, safe cities, resource sites (mines, farms), civilians
   - DEFENDER'S FRONT (toward threat): fortifications, military outposts, defensive positions
   - CONTESTED ZONE (at the front): battlefields, ruined villages, repeatedly-captured sites
   - ATTACKER'S SIDE (beyond the front): enemy capitals, staging grounds, corruption sources

4. **Validate before output:**
   - If State A defends against State B from the EAST: State A locations should have LOWER x-values, State B locations should have HIGHER x-values
   - If the threat comes from the SOUTH: defender locations should have LOWER y-values, attacker locations should have HIGHER y-values
   - Contested locations sit in the MIDDLE range on the conflict axis

5. **No unintentional enclaves:**
   - Do NOT place enemy-held locations behind friendly lines
   - Do NOT place critical friendly infrastructure (mines, supply depots) in front of or surrounded by enemy positions
   - Exception: ONLY create enclaves if the narrative explicitly describes cut-off units, infiltration, or surrounded positions

**CRITICAL - Location Ownership Rules:**
The "owner" field determines which faction's TERRITORY a location anchors in the map generator. This affects how borders are drawn!

Determine ownership from NARRATIVE OUTCOMES - who controls each location at the end of the story?
- **Recently captured/cleared by a faction** → owner: that faction (even if it was enemy-held earlier)
- **Fallen to enemy and still held** → owner: enemy faction
- **Active battlefield / no-man's-land** with no clear holder → owner: "none"
- **Natural features** (rivers, mountains, landmarks) → owner: "none"

Example - Story describes Silver Cross clearing Blackbarrow Village of undead:
- WRONG: owner: "none" (ignores the narrative outcome)
- CORRECT: owner: "eldaris_empire" (reflects who holds it NOW)

Example - Karst Manor was sacked by undead and abandoned:
- CORRECT: owner: "undead_army" (they still control it)

**CRITICAL - Geography from Narrative:**
Extract terrain features from story details, don't invent geography:
- "bombers must cross mountains to reach the fortress" → place a \`mountains\` feature between air base and target
- "river serves as defensive line" → place Trough where described
- "army marched through the mountain pass" → leave a gap between two \`mountains\` features there
- "cold, ash-choked skies" → reflect in climateSettings

**CRITICAL - Factions vs States:**
Allied organizations within the same polity should NOT be separate states:
- Military branches, religious orders, mercenary companies serving an empire → ONE state
- Their specific buildings/headquarters → locations with owner set to the parent state
- Note sub-faction control in location descriptions (e.g., "Sacred Lance headquarters within the Empire")
- Only create separate states for truly independent political entities with their own sovereign territory

**For Non-Territorial Conflicts:**
- Place locations based on narrative descriptions and natural geography
- Mobile threats (dragon lairs, monster dens) can be placed anywhere that makes narrative sense
- Intermingled populations should share the same geographic area
- Focus on terrain logic (mines near mountains, ports on coasts) rather than factional separation

**Your output should be a coherent map specification with minimal creative additions.**
`,

    expansive: `
You are building a complete, living world inspired by the narrative.

**Rules:**
- Extract all named locations AND create additional locations implied by the setting
- If a capital exists, add surrounding infrastructure (roads, farms, outposts)
- Create neighboring regions, trade routes, and frontier zones even if not named
- Develop full cultural and religious systems from character hints
- Define multiple border types between all adjacent states
- Add zones for potential conflicts, resources, or mysteries suggested by themes
- Descriptions should expand on narrative hints to create rich world-building
- Think like a fantasy author: what ELSE would exist in this world?
- Expansions should be CONSISTENT with narrative tone and themes
- Don't add elements that contradict established facts
- New locations should feel like natural extensions, not genre shifts

**Conflict Type Detection (CRITICAL - Do This First):**
Before expanding the world, classify the PRIMARY conflict:

| Type | Key Indicators | Territorial Rules? |
|------|----------------|-------------------|
| **Territorial Warfare** | Sieges, invasions, "fallen provinces," front lines, enemy holds territory | YES - full rules |
| **Mobile/Asymmetric Threat** | Dragons, monsters, raiders; no fixed enemy territory; hit-and-run attacks | NO - place threats anywhere |
| **Civil Unrest** | Settlers vs. locals, internal faction tension, shared territory | NO - populations intermingled |
| **Personal Conflict** | Blood feuds, vendettas, individual rivalries | NO - not territorial |
| **No Active Conflict** | Exploration, peaceful kingdoms, historical conflicts | NO - natural placement |

**The key test:** Does the enemy HOLD TERRITORY with an identifiable FRONT LINE? 
- YES → Apply territorial coherence rules below
- NO → Skip to "Non-Territorial World Building" section

**Territorial Coherence (ONLY for Territorial Warfare):**
When expanding a world with territorial warfare, apply strategic logic:

1. **Map the conflict geometry:**
   - Identify the PRIMARY THREAT AXIS (direction of enemy advance)
   - Identify SECONDARY AXES if multiple fronts exist
   - Note any described defensive lines (rivers, mountains, fortification chains)

2. **Layer the defender's territory logically:**
   - DEEP REAR: Capital, major cities, core infrastructure, civilian centers
   - STRATEGIC REAR: Supply depots, reserves, training grounds, industry
   - OPERATIONAL REAR: Forward supply bases, field hospitals, staging areas
   - FRONT LINE: Fortifications, outposts, observation posts, trenches
   - NO-MAN'S-LAND: Battlefields, ruins, contested ground

3. **Layer the attacker's territory logically:**
   - FORWARD POSITIONS: Staging grounds, forward camps, captured locations
   - OCCUPIED TERRITORY: Fallen cities, corrupted lands, enemy infrastructure
   - ENEMY CORE: Capital, strongholds, source of enemy power

4. **When ADDING locations, place them strategically:**
   - Add supply depots BEHIND the front, not in front of it
   - Add enemy forward bases NEAR the front, not deep in friendly territory
   - Add refugee camps and field hospitals in the operational rear
   - Add watchtowers and outposts in a logical screening line
   - Add ruined/abandoned villages in the contested zone

5. **Cluster related locations:**
   - Mining operations near mountains (with supporting settlements nearby)
   - Port cities on coasts (with fishing villages along the shore)
   - Fortification chains along logical defensive lines
   - Enemy locations should form a coherent territorial block, not scattered points

6. **Validate territorial logic:**
   - Draw an imaginary line between opposing capitals - this is roughly the axis of conflict
   - Friendly locations should cluster on the friendly side
   - Enemy locations should cluster on the enemy side
   - The front line should be visible as a band of contested/military locations
   - NO friendly critical infrastructure should appear on the enemy side of the front
   - NO enemy strongholds should appear deep in friendly rear areas (unless explicitly narrative)

7. **Enclaves and exceptions:**
   - Only create cut-off friendly positions if the narrative describes encirclement
   - Only create enemy infiltrators/hidden bases if the narrative suggests covert threats
   - Clearly mark such exceptions in the location description

**CRITICAL - Location Ownership for Territory Generation:**
The "owner" field determines which faction's TERRITORY a location anchors. This affects how borders are drawn!

Determine ownership from NARRATIVE OUTCOMES - who controls each location at the end of the story?
- **Recently captured/cleared by a faction** → owner: that faction (the narrative outcome matters!)
- **Fallen to enemy and still held** → owner: enemy faction
- **Active battlefield / true no-man's-land** → owner: "none"
- **Natural features** (rivers, mountains) → owner: "none"

Examples for "undead press from the east, Silver Cross clears Blackbarrow":
- Karad Dum (undead capital, far east): owner: "undead_army" ✓
- Blackbarrow (cleared by Silver Cross): owner: "eldaris_empire" ✓ (they took it back!)
- Karst Manor (sacked, still undead-held): owner: "undead_army" ✓
- Ash Fields (active battlefront): owner: "none" ✓

**CRITICAL - Geography from Narrative:**
Extract terrain features from story details - the narrative is your source of truth:
- "bombers must cross mountains to reach the fortress" → place a \`mountains\` feature between air base and target
- "river serves as defensive line" → place Trough where the story indicates
- "army marched through the mountain pass" → ensure a pass exists at that location
- "the road winds along the coast" → terrain should show coastal route
- Travel times and difficulty hints at terrain (arduous journey = mountains, quick march = plains)

**CRITICAL - Factions vs States:**
Allied organizations within the same polity should NOT be separate states:
- Imperial Army, Sacred Lance, Silver Cross serving the Empire → ONE state: "eldaris_empire"
- Their headquarters → locations owned by the parent state
- Note sub-faction in descriptions: "Silver Cross barracks, elite undead hunters serving the Empire"
- Only create separate states for truly sovereign political entities with independent territory

**Non-Territorial World Building (for Mobile Threats, Civil Unrest, Personal Conflicts, No Conflict):**

When the conflict is NOT territorial warfare, use different principles:

1. **Mobile Threats (Dragons, Monsters, Raiders):**
   - Place lairs/bases in defensible or hidden locations (mountains, swamps, deep forests)
   - The threat can strike ANYWHERE - don't force a "threat direction"
   - Add locations the threat has attacked (burned villages, raided caravans) scattered across the map
   - Defender settlements should cluster for mutual protection, not along a "front"

2. **Civil Unrest (Internal Tensions):**
   - Place both populations in the SAME geographic areas - they are intermingled
   - Add locations that serve both groups (markets, crossroads, shared temples)
   - Add locations specific to each group (settler forts, indigenous sacred sites)
   - Tension points might cluster near resources or symbolic locations

3. **Personal Conflicts (Feuds, Vendettas):**
   - Place rival factions' home bases apart, but not necessarily on an axis
   - Add neutral ground where conflicts might flare
   - The geography reflects social distance, not military strategy

4. **No Active Conflict:**
   - Place locations based purely on terrain logic and narrative description
   - Trade routes, natural resources, and climate should drive placement
   - Add variety and points of interest without factional logic

**Your output should be a richly detailed world that extends beyond the source narrative while maintaining strategic and geographic coherence appropriate to the conflict type.**
`
};

// ============================================================================
// System Prompt Builder
// ============================================================================

export function buildSystemPrompt(expansionLevel = "strict") {
    return `You are an AI World Cartographer that designs fantasy maps from narrative content. Your task is to analyze an adventure story and output a complete world specification that can generate a new Fantasy Map Generator map.

${EXPANSION_PROMPTS[expansionLevel]}

## Your Output

You will generate a JSON specification containing:
1. **World Analysis** - Including conflict axis identification if warfare exists
2. **Terrain** - Deterministic terrain features (landmasses, mountains, lakes, seas) placed with exact 0-1 coordinates
3. **Locations** - Points of interest (settlements, fortresses, mines, quarries, ruins, landmarks)
4. **States** - Political entities that control locations
5. **Cultures** - Ethnic/cultural groups
6. **Zones** - Event regions (disasters, conflicts, etc.)
7. **Borders** - Geographic boundaries between states (rivers, mountains, etc.)

## Location Scale Guidelines

Extract locations at **MAP SCALE** - places that would appear as distinct points on a regional or kingdom map.

**DO extract:**
- Settlements (cities, towns, villages)
- Fortifications (castles, towers, strongholds)
- Resource sites (mines, quarries, farms)
- Named natural landmarks (mountains, rivers, forests, lakes)
- Ruins and historic sites
- Dungeons, lairs, and caves

**DO NOT extract:**
- Rooms, floors, or wings within a building
- Individual structures within a compound or camp
- City districts, gates, or markets (these are part of the parent settlement)

A single structure or compound = one location, regardless of its internal complexity.

## Conflict Geography

When the narrative describes conflict, you must FIRST determine what TYPE of conflict exists, then apply appropriate spatial logic.

### Step 0: Identify the Conflict Type

Not all conflicts require territorial coherence rules. Classify the conflict:

| Conflict Type | Characteristics | Territorial Rules Apply? |
|---------------|-----------------|--------------------------|
| **Territorial Warfare** | Two factions with defined territories, front lines, sieges, trench warfare, invasion | **YES** — full territorial coherence |
| **Mobile/Asymmetric Threat** | Dragons, monsters, raiders, guerrilla forces that strike and retreat; no fixed enemy territory | **NO** — threats can originate anywhere |
| **Civil Unrest/Internal Tension** | Two populations sharing the same territory with friction; no front line | **NO** — groups are intermingled |
| **Personal Conflict** | Vendettas, rivalries, feuds between individuals or small groups | **NO** — not territorial |
| **No Active Conflict** | Exploration, slice-of-life, historical/resolved conflicts | **NO** — place locations naturally |

**Key questions to determine type:**
1. Does the enemy/threat HOLD TERRITORY? (If no → not territorial warfare)
2. Is there a FRONT LINE where factions meet? (If no → not territorial warfare)
3. Are the conflicting groups INTERMINGLED in the same locations? (If yes → civil unrest, not warfare)
4. Is the threat MOBILE (dragons, monsters, raiders)? (If yes → asymmetric, not territorial)

**Examples:**
- "Undead legions press from the fallen eastern provinces" → **Territorial warfare** (enemy holds territory, clear direction)
- "A vengeful dragon raids the clan's settlements" → **Mobile threat** (dragon doesn't hold territory, attacks opportunistically)
- "Tensions between settlers and indigenous people" → **Civil unrest** (groups share same space)
- "Blood feud with a rival family" → **Personal conflict** (not territorial)

**If the conflict is NOT territorial warfare, use the appropriate non-directional conflict type and skip Steps 1-4 below. Place locations based on narrative description and natural geography instead.**

---

### Step 1: Identify the Threat Axis (ONLY for Territorial Warfare)

Look for directional language:
- "enemy from the east" → conflictType: "territorial_warfare_east" (high x-values)
- "northern invasion" → conflictType: "territorial_warfare_north" (low y-values)
- "pressed from the south" → conflictType: "territorial_warfare_south" (high y-values)
- "western frontier" → conflictType: "territorial_warfare_west" (low x-values)

### Step 2: Determine the Front Line

The front line is where the factions meet. Indicators:
- Siege locations (the besieged city IS the front)
- Battlefield locations
- Trench lines, fortification chains
- "No-man's-land" or contested areas

Record the approximate coordinate in worldAnalysis.frontLinePosition.

### Step 3: Place Locations on the Correct Side

**If the threat comes from the EAST (high x):**
| Location Type | X-Value Guidance |
|---------------|------------------|
| Defender's capital/rear | 0.2 - 0.4 (low x, far from threat) |
| Defender's infrastructure | 0.3 - 0.5 (behind the front) |
| Defender's fortifications | 0.4 - 0.55 (at or near front) |
| Contested zone | 0.5 - 0.65 (the front itself) |
| Attacker's forward positions | 0.55 - 0.7 (enemy side of front) |
| Attacker's core territory | 0.7 - 0.9 (deep enemy territory) |

Adjust these ranges based on where the narrative places the front. If a city under siege is at x=0.5, that defines your front line.

### Step 4: Validate Before Output

Ask yourself:
- Is any friendly critical infrastructure (mines, supply depots) placed in enemy territory? **FIX IT**
- Is any enemy-held location placed behind friendly lines? **FIX IT**
- Do the locations form coherent territorial blocks for each faction? **VERIFY**
- Are contested locations actually in the contested zone? **VERIFY**

## Terrain Features (deterministic geography)

The map is painted directly from \`terrain.features\`. Every feature is placed EXACTLY where you put it,
so the geography you describe here is the geography the map will have. Use the SAME 0-1 coordinate
system as locations: **x: 0 = west, 1 = east; y: 0 = north, 1 = south**.

The empty map is ocean (\`terrain.base: "ocean"\`). Set \`terrain.base: "land"\` for an inland/continental
map where water is the exception.

| Type | Geometry | Effect |
|------|----------|--------|
| landmass / continent | polygon (3+ points) or 1 point + radius | Main land, gentle coast |
| island / peninsula | polygon or 1 point + radius | Smaller land |
| plateau / highlands | polygon or point + radius | Raised land (height ~45-55) |
| lowlands / plains | polygon or point + radius | Flatten land inside to low plains |
| mountains | polyline (2+ points), width | Mountain range along the line (height ~85) |
| ridge / hills | polyline, width | Lower relief along the line |
| volcano | 1 point, width | Single tall peak |
| valley / canyon | polyline, width, depth | Lowered land along the line; a river forms here |
| lake | polygon or point + radius | Inland water |
| sea / bay / gulf / inlet | polygon or point + radius | Carve sea into land |
| strait / channel / fjord | polyline, width | Narrow water channel through land |

**Field reference** (all distances are fractions of the map width):
- \`id\`: short snake_case name, referenced by borders/locations hints
- \`type\`: one of the types above
- \`points\`: \`[[x, y], ...]\` in 0-1 coordinates
- \`radius\`: for 1-point areas (e.g. 0.12 = island spanning ~24% of map width)
- \`width\`: half-width of line features (mountains default 0.045, valley 0.03)
- \`height\`: target height 0-100 (20 = sea level, 30 = plains, 50 = highlands, 85 = alpine). 0 = use default
- \`depth\`: how much valleys/canyons lower the land. 0 = use default

**Example** - a continent with an eastern mountain wall, a north-south river valley and a central lake:
\`\`\`json
"terrain": {
  "base": "ocean",
  "features": [
    {"id": "mainland", "type": "landmass", "points": [[0.08,0.12],[0.92,0.08],[0.95,0.9],[0.1,0.92]], "radius": 0, "height": 0, "width": 0, "depth": 0},
    {"id": "stone_teeth", "type": "mountains", "points": [[0.78,0.1],[0.82,0.3],[0.8,0.5]], "radius": 0, "height": 88, "width": 0.05, "depth": 0},
    {"id": "blackwater_valley", "type": "valley", "points": [[0.5,0.05],[0.52,0.5],[0.48,0.95]], "radius": 0, "height": 0, "width": 0.03, "depth": 0},
    {"id": "headwaters", "type": "lake", "points": [[0.58,0.42]], "radius": 0.03, "height": 0, "width": 0, "depth": 0}
  ],
  "heightmapCommands": [],
  "template": "continents",
  "climateSettings": {"temperatureEquator": 26, "temperatureNorthPole": -4, "precipitation": "moderate"}
}
\`\`\`

**Rules:**
1. Draw the land first (landmass/island), then relief (mountains, hills, valleys), then water (lakes, seas, straits).
2. A location "in the mountains" must sit on a \`mountains\` polyline (within its width). A port must sit on a coastline: just inside a landmass edge or beside a sea/bay feature.
3. Keep the main landmass away from the map edge (coordinates 0.05-0.95) unless the story needs land running off the map.
4. Do not stack many overlapping features; 4-12 well-chosen features describe most worlds.
5. \`template\` is only a stylistic hint and is ignored when features exist.

## Location Terrain Hints

Each location may declare the terrain it sits on with \`terrain\`: one of
\`coast\`, \`plain\`, \`hill\`, \`mountain\`, \`valley\`, \`island\`, \`lake\`, \`water\`, \`land\`, \`any\`.
The generator verifies the painted terrain against these hints and reports mismatches, so make the
features and the hints agree.

Each location also declares \`kind\`: \`settlement\` (cities, towns, villages, fortresses, camps - drawn as
a burg) or \`landmark\` (ruins, lairs, mines, forests, lakes, peaks, battlefields - drawn as a map marker
with the description as its legend).

## Coordinate System

- Everything uses normalized 0-1 coordinates: terrain feature points, locations, zone centers
- \`x: 0.65, y: 0.35\` = 65% across from the west edge, 35% down from the north edge
- Zone radius is also 0-1 (fraction of the larger map dimension)

## Climate and Globe Position

\`terrain.climateSettings\` drives temperature, rainfall and where the map sits on the planet:
- \`zone\`: one of equatorial, tropical, subtropical, mediterranean, temperate, continental, boreal, polar (sets the latitude band)
- \`latitude\`: \`{"north": 58, "south": 32}\` in degrees to override the zone precisely (north edge first)
- \`hemisphere\`: "north" or "south" (mirrors a zone)
- \`temperatureEquator\` / \`temperatureNorthPole\`: °C at sea level
- \`precipitation\`: arid, low, moderate, high, monsoon

Frozen wastes → zone polar or boreal; jungles → tropical; "endless summer" → subtropical.

Optional: \`prevailingWind\` (west, east, north, south) decides which coasts get the rain;
\`longitude\` (degrees, -180..180) centres the map on that meridian.

## Provinces (optional)

\`provinces\`: \`[{"id": "...", "name": "...", "state": "<state id>", "center": {"x": 0.6, "y": 0.4}, "formName": "March"}]\`.
Each province grows inside its state from its center. Leave the array empty to let the generator
subdivide states automatically.

## Map options (optional)

- \`map.style\`: visual preset (default, ancient, gloom, pale, watercolor, clean, atlas, cyberpunk, night, monochrome)
- \`options.military\`: false to skip regiments; \`options.flavourMarkers\`: false to skip random markers (volcanoes, inns...)
- Locations may set \`burgType\` (Generic, Naval, Lake, Highland, River, Nomadic, Hunting) to override the terrain-based type

## States: Relations

Each state may list \`relations\`: \`[{"state": "<state id>", "relation": "Ally|Friendly|Neutral|Suspicion|Rival|Enemy|Vassal|Suzerain"}]\`.
Territorial warfare also makes states on opposite sides of the front enemies automatically.

## World Name

Set \`worldAnalysis.worldName\` to the name of the region or world as the story calls it; it becomes the map title.

## Design Guidelines

### Extracting Geography from Narrative
The story is your primary source for terrain. Look for:
- **Travel obstacles**: "bombers must cross mountains" → \`mountains\` feature on the flight path
- **Defensive features**: "river blocks the southern approach" → \`valley\` feature at that location
- **Journey descriptions**: "arduous climb through the passes" → mountain terrain there
- **Climate details**: "ash-choked skies", "frozen wastes" → climateSettings
- **Relative positions**: "fortress overlooks the valley" → \`valley\` feature below, location on an adjacent \`hills\`/\`mountains\` line with terrain: "hill"

### Placement Rules
1. **Match narrative geography**: Every terrain feature mentioned should appear in terrain.features
2. **Rivers in valleys**: Use a \`valley\` feature where rivers should flow
3. **Logical placement**: Castles on hills, ports on coasts, mines near mountains
4. **Consistent coordinates**: If a tower is "in the mountains", place it ON a \`mountains\` polyline and set terrain: "mountain"
5. **State coherence**: States should control geographically connected locations
6. **Territorial logic**: If a war has a front line, verify that faction ownership makes geographic sense
7. **Cluster related locations**: Faction locations should form contiguous territorial blocks

### Ownership from Narrative Outcomes
The "owner" field should reflect who controls each location AT THE END of the story:
- Location cleared/captured by heroes → owner: their faction
- Location fallen and still enemy-held → owner: enemy faction
- Active battlefield, no clear holder → owner: "none"
- Natural features → owner: "none"

## Zone Types

- \`Disaster\` - Devastated areas (dragon lairs, magical catastrophes)
- \`Invasion\` - Areas under attack
- \`Rebels\` - Rebellious regions
- \`Disease\` - Plague zones
- \`Eruption\` - Volcanic activity
- \`Flood\` - Flooded regions

## Borders

Define natural or political boundaries between states. Borders help the map generator understand territorial limits.

**Border types:**
- \`river\` - A river forms the boundary (reference the \`valley\` feature id that creates it)
- \`mountain\` - A mountain range divides territories (reference the \`mountains\` feature id)
- \`forest\` - Dense forest marks the edge
- \`sea\` - Coastal boundary
- \`road\` - Trade route defines sphere of influence
- \`undefined\` - Vague/contested border
- \`battlefront\` - Active military front line

**Example:**
\`\`\`json
{
  "between": ["corgak_clan", "human_kingdom"],
  "type": "river",
  "name": "Blackwater River",
  "hint": "The valley feature blackwater_valley creates this river"
}
\`\`\`

Always define borders when:
1. Two states share territory
2. A natural feature (river, mountain) is mentioned as a dividing line
3. The narrative implies territorial boundaries
4. A military front line exists between warring factions

**Important:** When placing locations near borders, ensure they are on the CORRECT SIDE of the border for their owner.`;
}

// ============================================================================
// User Message Builder
// ============================================================================

export function buildUserMessage(preprocessed) {
    return `## Adventure to Convert

**Title:** ${preprocessed.meta.title}
**Description:** ${preprocessed.meta.description || "No description"}
**Tags:** ${preprocessed.meta.tags?.join(", ") || "None"}

## Memory Context
${preprocessed.memory || "No memory context."}

## Scenario Setup
${preprocessed.details?.instructions?.scenario?.substring(0, 2000) || "No scenario instructions."}
${preprocessed.authorsNote ? `\n**Author's Note:** ${preprocessed.authorsNote}` : ""}

## World Data from Story Cards

### Characters
${formatCards(preprocessed.worldData.characters)}

### Locations
${formatCards(preprocessed.worldData.locations)}

### Factions
${formatCards(preprocessed.worldData.factions)}

## Narrative
${preprocessed.narrative || "No narrative content."}

---

## Your Task

Design a complete world specification for this adventure. Think like a cartographer:

1. **Analyze the geography** mentioned in the narrative
2. **Identify any conflict axis** - which direction does the threat/enemy come from?
3. **Design terrain** as explicit features (where exactly is the coast, the range, the lake) that match the described world
4. **Extract map-scale locations** - settlements, fortifications, landmarks, ruins (not sub-locations within them)
5. **Define states** that control the locations mentioned
6. **Create zones** for any disaster/conflict areas
7. **Define borders** between states using natural features (rivers, mountains) or battle lines

### Conflict Type Analysis (DO THIS FIRST)
- [ ] Does an enemy/threat HOLD TERRITORY? (Yes → possibly territorial warfare)
- [ ] Is there a FRONT LINE where factions meet? (Yes → territorial warfare)
- [ ] Is the threat MOBILE (dragon, monster, raiders)? (Yes → mobile threat, NOT territorial)
- [ ] Are conflicting groups INTERMINGLED in same locations? (Yes → civil unrest, NOT territorial)
- [ ] Determined conflict type: territorial_warfare / mobile_threat / civil_unrest / personal_conflict / null

### Conflict Axis Analysis (ONLY if territorial_warfare)
- [ ] Identified threat direction (north/south/east/west)
- [ ] Identified front line location (where do factions meet?)
- [ ] Recorded conflict axis in worldAnalysis

### Location Placement Checklist
- [ ] Settlements (cities, towns, villages)
- [ ] Fortifications (castles, towers, strongholds)
- [ ] Resource sites (mines, quarries, farms)
- [ ] Named natural landmarks
- [ ] Ruins and historic sites
- [ ] Dungeons, lairs, caves

### Territorial Validation Checklist (ONLY for territorial_warfare - skip otherwise)
- [ ] All defender locations are on the defender's side of the front
- [ ] All attacker locations are on the attacker's side of the front
- [ ] Contested locations are in the contested zone
- [ ] No friendly infrastructure behind enemy lines (unless explicitly described)
- [ ] No enemy strongholds in friendly rear areas (unless explicitly described)
- [ ] Related locations are clustered geographically

### Border Checklist
- [ ] Borders between adjacent states
- [ ] Rivers or mountains mentioned as boundaries
- [ ] Battle fronts marked as borders (type: "battlefront")

Express ALL terrain as terrain.features using 0-1 coordinates. Leave terrain.heightmapCommands as an empty array.`;
}

function formatCards(cards) {
    if (!cards || cards.length === 0) return "None";
    return cards
        .map(c => `- **${c.title}**: ${c.value?.substring(0, 300) || "No description"}`)
        .join("\n");
}

// ============================================================================
// JSON Schema for World Specification
// ============================================================================

export const WORLD_SPEC_SCHEMA = {
    name: "world_specification",
    strict: true,
    schema: {
        type: "object",
        properties: {
            worldAnalysis: {
                type: "object",
                properties: {
                    summary: {type: "string"},
                    setting: {type: "string"},
                    climate: {type: "string"},
                    themes: {type: "array", items: {type: "string"}},
                    worldName: {type: "string", description: "Name of the world/region, used as the map title"},
                    conflictType: {
                        type: ["string", "null"],
                        description: "Type of conflict. For territorial warfare, include direction: 'territorial_warfare_north', 'territorial_warfare_south', 'territorial_warfare_east', 'territorial_warfare_west'. Otherwise: 'mobile_threat', 'civil_unrest', 'personal_conflict', or null"
                    }
                },
                required: ["summary", "setting", "climate", "themes"],
                additionalProperties: false
            },
            terrain: {
                type: "object",
                properties: {
                    template: {type: "string"},
                    base: {type: "string", description: "'ocean' (default) or 'land'"},
                    features: {
                        type: "array",
                        description: "Deterministic terrain features painted exactly where placed",
                        items: {
                            type: "object",
                            properties: {
                                id: {type: "string"},
                                type: {
                                    type: "string",
                                    enum: [
                                        "landmass", "continent", "island", "peninsula", "plateau", "highlands", "lowlands", "plains",
                                        "mountains", "ridge", "hills", "volcano", "valley", "canyon",
                                        "lake", "sea", "bay", "gulf", "inlet", "strait", "channel", "fjord"
                                    ]
                                },
                                points: {type: "array", items: {type: "array", items: {type: "number"}}},
                                radius: {type: "number", description: "0-1 fraction of map width for 1-point areas; 0 = default"},
                                height: {type: "number", description: "0-100 target height; 0 = default"},
                                width: {type: "number", description: "half-width of line features; 0 = default"},
                                depth: {type: "number", description: "valley/canyon depth; 0 = default"}
                            },
                            required: ["id", "type", "points"],
                            additionalProperties: false
                        }
                    },
                    heightmapCommands: {type: "array", items: {type: "string"}, description: "Legacy; leave empty"},
                    climateSettings: {
                        type: "object",
                        properties: {
                            temperatureEquator: {type: "number"},
                            temperatureNorthPole: {type: "number"},
                            precipitation: {type: "string", description: "arid, low, moderate, high or monsoon"},
                            prevailingWind: {type: "string", enum: ["default", "west", "east", "north", "south"]},
                            longitude: {type: "number", description: "Central meridian in degrees (-180..180); 0 = default"},
                            zone: {
                                type: "string",
                                enum: ["equatorial", "tropical", "subtropical", "mediterranean", "temperate", "continental", "boreal", "polar"],
                                description: "Latitude band the map occupies"
                            },
                            hemisphere: {type: "string", enum: ["north", "south"]},
                            latitude: {
                                type: "object",
                                description: "Exact latitude band in degrees (north edge, south edge); overrides zone",
                                properties: {north: {type: "number"}, south: {type: "number"}},
                                required: ["north", "south"],
                                additionalProperties: false
                            }
                        },
                        required: ["temperatureEquator", "temperatureNorthPole", "precipitation", "zone"],
                        additionalProperties: false
                    }
                },
                required: ["template", "features", "heightmapCommands", "climateSettings"],
                additionalProperties: false
            },
            locations: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {type: "string"},
                        name: {type: "string"},
                        type: {type: "string"},
                        x: {type: "number"},
                        y: {type: "number"},
                        owner: {type: "string"},
                        isCapital: {type: "boolean"},
                        kind: {type: "string", enum: ["settlement", "landmark"]},
                        burgType: {type: "string", enum: ["default", "Generic", "Naval", "Lake", "Highland", "River", "Nomadic", "Hunting"]},
                        terrain: {
                            type: "string",
                            enum: ["coast", "plain", "hill", "mountain", "valley", "island", "lake", "water", "land", "any"]
                        },
                        description: {type: "string"}
                    },
                    required: ["id", "name", "type", "x", "y", "kind"],
                    additionalProperties: false
                }
            },
            states: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {type: "string"},
                        name: {type: "string"},
                        form: {type: "string"},
                        capital: {type: "string"},
                        culture: {type: "string"},
                        expansionism: {type: "number"},
                        color: {type: "string"},
                        locations: {type: "array", items: {type: "string"}},
                        relations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    state: {type: "string"},
                                    relation: {
                                        type: "string",
                                        enum: ["Ally", "Friendly", "Neutral", "Suspicion", "Rival", "Enemy", "Vassal", "Suzerain"]
                                    }
                                },
                                required: ["state", "relation"],
                                additionalProperties: false
                            }
                        },
                        description: {type: "string"}
                    },
                    required: ["id", "name", "form", "capital", "locations"],
                    additionalProperties: false
                }
            },
            cultures: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {type: "string"},
                        name: {type: "string"},
                        type: {type: "string"},
                        base: {type: "string"},
                        description: {type: "string"}
                    },
                    required: ["id", "name", "type"],
                    additionalProperties: false
                }
            },
            religions: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {type: "string"},
                        name: {type: "string"},
                        type: {type: "string"},
                        form: {type: "string"},
                        description: {type: "string"}
                    },
                    required: ["id", "name"],
                    additionalProperties: false
                }
            },
            zones: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: {type: "string"},
                        type: {type: "string"},
                        center: {
                            type: "object",
                            properties: {
                                x: {type: "number"},
                                y: {type: "number"}
                            },
                            required: ["x", "y"],
                            additionalProperties: false
                        },
                        radius: {type: "number"},
                        description: {type: "string"}
                    },
                    required: ["name", "type", "center", "radius"],
                    additionalProperties: false
                }
            },
            provinces: {
                type: "array",
                description: "Optional sub-divisions of states; empty array = auto-generate",
                items: {
                    type: "object",
                    properties: {
                        id: {type: "string"},
                        name: {type: "string"},
                        state: {type: "string"},
                        formName: {type: "string"},
                        center: {
                            type: "object",
                            properties: {x: {type: "number"}, y: {type: "number"}},
                            required: ["x", "y"],
                            additionalProperties: false
                        }
                    },
                    required: ["id", "name", "state", "center"],
                    additionalProperties: false
                }
            },
            map: {
                type: "object",
                properties: {
                    style: {type: "string", enum: ["default", "ancient", "gloom", "pale", "watercolor", "clean", "atlas", "cyberpunk", "night", "monochrome"]}
                },
                required: ["style"],
                additionalProperties: false
            },
            options: {
                type: "object",
                properties: {
                    military: {type: "boolean"},
                    flavourMarkers: {type: "boolean"}
                },
                required: ["military", "flavourMarkers"],
                additionalProperties: false
            },
            borders: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        between: {type: "array", items: {type: "string"}},
                        type: {type: "string"},
                        name: {type: "string"},
                        hint: {type: "string"}
                    },
                    required: ["between", "type"],
                    additionalProperties: false
                }
            }
        },
        required: ["worldAnalysis", "terrain", "locations", "states", "cultures", "religions", "zones", "borders", "provinces"],
        additionalProperties: false
    }
};

// ============================================================================
// Provider-Specific Schema Variants
// ============================================================================

/**
 * Get schema variant for specific provider.
 * OpenAI strict mode requires ALL properties in 'required' arrays.
 */
export function getSchemaForProvider(provider) {
    const schema = JSON.parse(JSON.stringify(WORLD_SPEC_SCHEMA)); // Deep clone

    if (provider === "openai") {
        // OpenAI strict mode requires all properties in 'required' and doesn't support type arrays
        // Use enums with explicit "none" values instead of null
        const worldAnalysis = schema.schema.properties.worldAnalysis;
        worldAnalysis.required = ["summary", "setting", "climate", "themes", "worldName", "conflictType"];

        worldAnalysis.properties.conflictType = {
            type: "string",
            enum: [
                "territorial_warfare_north",
                "territorial_warfare_south",
                "territorial_warfare_east",
                "territorial_warfare_west",
                "mobile_threat",
                "civil_unrest",
                "personal_conflict",
                "none"
            ],
            description: "Type of conflict with direction for territorial warfare, or 'none' if no conflict"
        };

        const locItems = schema.schema.properties.locations.items;
        locItems.required = ["id", "name", "type", "x", "y", "owner", "isCapital", "kind", "terrain", "burgType", "description"];
        schema.schema.required = [...schema.schema.required, "map", "options"];
        schema.schema.properties.provinces.items.required = ["id", "name", "state", "formName", "center"];

        const terrain = schema.schema.properties.terrain;
        terrain.required = ["template", "base", "features", "heightmapCommands", "climateSettings"];
        terrain.properties.features.items.required = ["id", "type", "points", "radius", "height", "width", "depth"];
        terrain.properties.climateSettings.required = ["temperatureEquator", "temperatureNorthPole", "precipitation", "zone", "hemisphere", "latitude", "prevailingWind", "longitude"];

        const stateItems = schema.schema.properties.states.items;
        stateItems.required = ["id", "name", "form", "capital", "locations", "culture", "expansionism", "color", "relations", "description"];

        const cultureItems = schema.schema.properties.cultures.items;
        cultureItems.required = ["id", "name", "type", "base", "description"];

        const religionItems = schema.schema.properties.religions.items;
        religionItems.required = ["id", "name", "type", "form", "description"];

        const zoneItems = schema.schema.properties.zones.items;
        zoneItems.required = ["name", "type", "center", "radius", "description"];

        const borderItems = schema.schema.properties.borders.items;
        borderItems.required = ["between", "type", "name", "hint"];
    }

    if (provider === "anthropic") {
        // Claude's structured-output grammar compiler rejects schemas with many
        // optional properties or large enums. Give it the strict (all-required)
        // shape of the OpenAI variant, but express enums as described strings
        // and drop the optional map/options sections.
        const strict = getSchemaForProvider("openai");
        const root = strict.schema;
        delete root.properties.map;
        delete root.properties.options;
        root.required = root.required.filter(k => k !== "map" && k !== "options");
        root.properties.provinces.items.properties.formName = {type: "string"};
        const describeEnum = (node, label) => {
            if (!node || !node.enum) return;
            node.description = `${label || node.description || "One of"}: ${node.enum.join(", ")}`;
            delete node.enum;
        };
        describeEnum(root.properties.worldAnalysis.properties.conflictType, "Conflict type, one of");
        describeEnum(root.properties.terrain.properties.features.items.properties.type, "Feature type, one of");
        describeEnum(root.properties.terrain.properties.climateSettings.properties.zone, "Latitude zone, one of");
        describeEnum(root.properties.terrain.properties.climateSettings.properties.hemisphere, "Hemisphere, one of");
        describeEnum(root.properties.terrain.properties.climateSettings.properties.prevailingWind, "Prevailing wind, one of");
        describeEnum(root.properties.locations.items.properties.kind, "Location kind, one of");
        describeEnum(root.properties.locations.items.properties.terrain, "Terrain hint, one of");
        describeEnum(root.properties.locations.items.properties.burgType, "Burg type, one of");
        describeEnum(root.properties.states.items.properties.relations.items.properties.relation, "Relation, one of");
        return strict;
    }

    return schema;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates territorial coherence of a generated world spec.
 * Checks that enemy-owned locations are on the enemy side of the map.
 *
 * @param {object} worldSpec - The generated world specification
 * @returns {object} - { valid: boolean, issues: string[], conflictType: string|null }
 */
export function validateTerritorialCoherence(worldSpec) {
    const issues = [];
    const { worldAnalysis, locations, states } = worldSpec;

    // Helper to check if value represents "no value"
    const isNone = (val) => val === null || val === undefined || val === "none" || val === -1;

    const rawConflictType = isNone(worldAnalysis?.conflictType) ? null : worldAnalysis.conflictType;

    // Parse combined conflictType - extract base type and axis
    let conflictType = rawConflictType;
    let axis = null;

    if (rawConflictType && rawConflictType.startsWith("territorial_warfare_")) {
        conflictType = "territorial_warfare";
        axis = rawConflictType.replace("territorial_warfare_", "");
    }

    // Skip validation if not territorial warfare
    if (conflictType !== "territorial_warfare") {
        return {
            valid: true,
            issues: [],
            conflictType: rawConflictType,
            note: rawConflictType
                ? `Conflict type is "${rawConflictType}" - territorial coherence rules do not apply`
                : "No conflict detected"
        };
    }

    if (!axis) {
        return { valid: true, issues: [], conflictType: rawConflictType, note: "No conflict axis specified" };
    }

    // Find the two main opposing states by looking at their capital positions
    const statesWithCapitals = states.map(s => {
        const capitalLoc = locations.find(l => l.id === s.capital);
        if (!capitalLoc) return null;
        const pos = (axis === "east" || axis === "west") ? capitalLoc.x : capitalLoc.y;
        return { state: s, pos };
    }).filter(Boolean);

    if (statesWithCapitals.length < 2) {
        return { valid: true, issues: [], conflictType: rawConflictType, note: "Not enough states with capitals to validate" };
    }

    // Sort by position to identify defender (lower for east/south threat) vs attacker
    statesWithCapitals.sort((a, b) => a.pos - b.pos);

    const defenderStates = new Set();
    const attackerStates = new Set();

    // For east/south threat: lower coord = defender, higher = attacker
    // For west/north threat: higher coord = defender, lower = attacker
    const midpoint = (statesWithCapitals[0].pos + statesWithCapitals[statesWithCapitals.length - 1].pos) / 2;

    for (const {state, pos} of statesWithCapitals) {
        if (axis === "east" || axis === "south") {
            if (pos < midpoint) defenderStates.add(state.id);
            else attackerStates.add(state.id);
        } else {
            if (pos > midpoint) defenderStates.add(state.id);
            else attackerStates.add(state.id);
        }
    }

    // Check each location
    for (const loc of locations) {
        if (!loc.owner || loc.owner === "none") continue;

        const coord = (axis === "east" || axis === "west") ? loc.x : loc.y;
        const isAttackerOwned = attackerStates.has(loc.owner);

        if (isAttackerOwned) {
            // Attacker locations should be on attacker side
            const onWrongSide = (axis === "east" || axis === "south")
                ? coord < midpoint - 0.1
                : coord > midpoint + 0.1;

            if (onWrongSide) {
                issues.push(
                    `"${loc.name}" is owned by attacker faction but positioned at ${axis === "east" || axis === "west" ? "x" : "y"}=${coord.toFixed(2)} ` +
                    `(defender side). Consider using owner:"none" for contested/overrun locations.`
                );
            }
        }
    }

    return { valid: issues.length === 0, issues, conflictType: rawConflictType };
}

/**
 * Suggests ownership corrections for misplaced locations.
 *
 * @param {object} worldSpec - The generated world specification
 * @returns {object[]} - Array of { locationId, locationName, suggestion, reason }
 */
export function suggestCoordinateCorrections(worldSpec) {
    const validation = validateTerritorialCoherence(worldSpec);
    if (validation.valid) return [];

    const suggestions = [];
    const { locations } = worldSpec;

    for (const issue of validation.issues) {
        // Parse location name from warning
        const match = issue.match(/"([^"]+)"/);
        if (!match) continue;

        const locName = match[1];
        const loc = locations.find(l => l.name === locName);
        if (!loc) continue;

        // Suggest changing ownership to "none" for misplaced enemy locations
        if (issue.includes("attacker faction") || issue.includes("defender side")) {
            suggestions.push({
                locationId: loc.id,
                locationName: loc.name,
                currentOwner: loc.owner,
                suggestion: 'Change owner to "none" to prevent incorrect territory generation',
                reason: issue
            });
        }
    }

    return suggestions;
}

/**
 * Analyzes narrative text to suggest a likely conflict type.
 * This is a heuristic helper - the AI should make the final determination.
 *
 * @param {string} narrative - The narrative text to analyze
 * @returns {object} - { suggestedType: string, confidence: string, indicators: string[] }
 */
export function detectConflictType(narrative) {
    const text = narrative.toLowerCase();
    const indicators = [];

    // Territorial warfare indicators
    const territorialKeywords = [
        "siege", "besieged", "front line", "frontline", "trench", "invasion",
        "fallen provinces", "occupied territory", "enemy territory", "no-man's-land",
        "advance", "retreat", "offensive", "defensive line", "fortification",
        "from the east", "from the west", "from the north", "from the south",
        "eastern frontier", "western frontier", "northern frontier", "southern frontier",
        "press from", "pushed back", "territorial"
    ];

    // Mobile threat indicators
    const mobileKeywords = [
        "dragon", "wyrm", "monster", "beast", "creature", "raider", "bandit",
        "attacks and retreats", "strikes and vanishes", "raids", "lair",
        "hunting", "hunted", "roaming", "terrorizing", "preying"
    ];

    // Civil unrest indicators
    const civilKeywords = [
        "settlers", "indigenous", "locals", "tension", "unrest", "friction",
        "occupation", "colonize", "native", "newcomers", "resistance",
        "coexist", "intermingled", "same town", "same village"
    ];

    // Personal conflict indicators
    const personalKeywords = [
        "feud", "vendetta", "rivalry", "blood debt", "revenge", "betrayal",
        "family", "clan rivalry", "personal enemy", "nemesis"
    ];

    // Count matches
    let territorialScore = 0;
    let mobileScore = 0;
    let civilScore = 0;
    let personalScore = 0;

    for (const kw of territorialKeywords) {
        if (text.includes(kw)) {
            territorialScore++;
            indicators.push(`territorial: "${kw}"`);
        }
    }

    for (const kw of mobileKeywords) {
        if (text.includes(kw)) {
            mobileScore++;
            indicators.push(`mobile: "${kw}"`);
        }
    }

    for (const kw of civilKeywords) {
        if (text.includes(kw)) {
            civilScore++;
            indicators.push(`civil: "${kw}"`);
        }
    }

    for (const kw of personalKeywords) {
        if (text.includes(kw)) {
            personalScore++;
            indicators.push(`personal: "${kw}"`);
        }
    }

    // Determine winner
    const scores = [
        { type: "territorial_warfare", score: territorialScore },
        { type: "mobile_threat", score: mobileScore },
        { type: "civil_unrest", score: civilScore },
        { type: "personal_conflict", score: personalScore }
    ];

    scores.sort((a, b) => b.score - a.score);

    const topScore = scores[0].score;
    const secondScore = scores[1].score;

    // Determine confidence
    let confidence;
    if (topScore === 0) {
        return {
            suggestedType: null,
            confidence: "none",
            indicators: [],
            note: "No conflict indicators detected"
        };
    } else if (topScore >= 5 && topScore > secondScore * 2) {
        confidence = "high";
    } else if (topScore >= 3 && topScore > secondScore) {
        confidence = "medium";
    } else {
        confidence = "low";
    }

    return {
        suggestedType: scores[0].type,
        confidence,
        indicators: indicators.slice(0, 10), // Limit to top 10 indicators
        allScores: scores
    };
}