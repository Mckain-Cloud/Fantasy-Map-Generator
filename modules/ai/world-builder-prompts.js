"use strict";

// System prompt for AI World Builder
export const WORLD_BUILDER_SYSTEM_PROMPT = `You are a world-building AI assistant for a fantasy map generator. Your task is to transform a randomly generated map into a thematically coherent, story-rich world based on the user's concept and preferences.

You will receive:
1. A world concept/description from the user
2. Theme/tone/technology/magic preferences
3. Current map data including states, cultures, geography

Your response must be a valid JSON object with this exact structure:

{
  "geographicAnalysis": {
    "summary": "Brief summary of how the geography shapes this world",
    "majorFeatures": ["List of significant geographic features"],
    "strategicLocations": ["Key strategic locations identified"]
  },
  "stateChanges": [
    {
      "stateId": 1,
      "newName": "New thematic name",
      "form": "Government form (Monarchy, Republic, Theocracy, etc.)",
      "description": "Brief description of this state in the world",
      "reasoning": "Why this change fits the theme"
    }
  ],
  "cultureChanges": [
    {
      "cultureId": 1,
      "newName": "New culture name",
      "type": "Culture type",
      "description": "Brief description of this culture"
    }
  ],
  "diplomacyChanges": [
    {
      "state1Id": 1,
      "state2Id": 2,
      "relation": "Ally|Friendly|Neutral|Suspicion|Enemy|Rival|Vassal|Suzerain|Unknown",
      "reasoning": "Why this diplomatic relationship exists"
    }
  ],
  "markersToAdd": [
    {
      "type": "capital|city|ruins|battlefield|dungeon|cave|temple|lighthouse|volcano|bridge|tower|portal|mine",
      "nearStateId": 1,
      "name": "Location name",
      "noteContent": "Description for the notes system"
    }
  ],
  "notesToAdd": [
    {
      "id": "unique_id",
      "name": "Note title",
      "legend": "Full note content/lore"
    }
  ]
}

Guidelines:
- Rename all states and cultures to fit the theme cohesively
- Create realistic diplomatic relationships based on geography (neighbors often have tensions, distant states may be neutral)
- Add meaningful markers that enhance the narrative (ancient ruins, sacred temples, strategic fortresses)
- Add notes with rich lore that connects the world together
- Consider geographic features when making decisions (coastal states may be merchants, mountain states may be isolated)
- Be creative but consistent with the chosen theme and tone
- Provide reasoning for your decisions to help users understand the changes`;

// JSON Schema for world-build response
export const WORLD_BUILDER_SCHEMA = {
  name: "world_build_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      geographicAnalysis: {
        type: "object",
        properties: {
          summary: {type: "string"},
          majorFeatures: {
            type: "array",
            items: {type: "string"}
          },
          strategicLocations: {
            type: "array",
            items: {type: "string"}
          }
        },
        required: ["summary", "majorFeatures", "strategicLocations"],
        additionalProperties: false
      },
      stateChanges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            stateId: {type: "number"},
            newName: {type: "string"},
            form: {type: "string"},
            description: {type: "string"},
            reasoning: {type: "string"}
          },
          required: ["stateId", "newName"],
          additionalProperties: false
        }
      },
      cultureChanges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            cultureId: {type: "number"},
            newName: {type: "string"},
            type: {type: "string"},
            description: {type: "string"}
          },
          required: ["cultureId", "newName"],
          additionalProperties: false
        }
      },
      diplomacyChanges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            state1Id: {type: "number"},
            state2Id: {type: "number"},
            relation: {type: "string"},
            reasoning: {type: "string"}
          },
          required: ["state1Id", "state2Id", "relation"],
          additionalProperties: false
        }
      },
      markersToAdd: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {type: "string"},
            nearStateId: {type: "number"},
            name: {type: "string"},
            noteContent: {type: "string"}
          },
          required: ["type", "name"],
          additionalProperties: false
        }
      },
      notesToAdd: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {type: "string"},
            name: {type: "string"},
            legend: {type: "string"}
          },
          required: ["id", "name", "legend"],
          additionalProperties: false
        }
      }
    },
    required: ["geographicAnalysis", "stateChanges", "cultureChanges", "diplomacyChanges", "markersToAdd", "notesToAdd"],
    additionalProperties: false
  }
};

// Theme presets
export const THEME_PRESETS = {
  classic: {
    name: "Classic Fantasy",
    description: "Medieval kingdoms, ancient magic, noble houses"
  },
  darkFantasy: {
    name: "Dark Fantasy",
    description: "Grim world, dangerous magic, morally grey factions"
  },
  highFantasy: {
    name: "High Fantasy",
    description: "Epic heroes, powerful magic, clear good vs evil"
  },
  lowFantasy: {
    name: "Low Fantasy",
    description: "Realistic medieval setting, rare magic, political intrigue"
  },
  postApocalyptic: {
    name: "Post-Apocalyptic",
    description: "Fallen civilization, survivor kingdoms, ancient technology"
  },
  ancientWorld: {
    name: "Ancient World",
    description: "Bronze age empires, city-states, mythological elements"
  },
  steampunk: {
    name: "Steampunk",
    description: "Industrial revolution, steam-powered nations, airships"
  },
  custom: {
    name: "Custom",
    description: "Define your own world concept"
  }
};

// Tone options
export const TONE_OPTIONS = [
  {value: "heroic", label: "Heroic - Adventures and legendary deeds"},
  {value: "grim", label: "Grim - Survival and harsh realities"},
  {value: "mysterious", label: "Mysterious - Ancient secrets and hidden knowledge"},
  {value: "political", label: "Political - Intrigue and power struggles"},
  {value: "whimsical", label: "Whimsical - Lighthearted and magical"}
];

// Technology level options
export const TECH_OPTIONS = [
  {value: "primitive", label: "Primitive - Stone age to early bronze"},
  {value: "ancient", label: "Ancient - Bronze to iron age"},
  {value: "medieval", label: "Medieval - Classic feudal era"},
  {value: "renaissance", label: "Renaissance - Early modern period"},
  {value: "industrial", label: "Industrial - Steam and early machines"},
  {value: "advanced", label: "Advanced - High technology or magitech"}
];

// Magic level options
export const MAGIC_OPTIONS = [
  {value: "none", label: "None - No magic exists"},
  {value: "rare", label: "Rare - Magic is exceptional and mysterious"},
  {value: "uncommon", label: "Uncommon - Magic exists but is not widespread"},
  {value: "common", label: "Common - Magic is part of everyday life"},
  {value: "pervasive", label: "Pervasive - Magic defines the world"}
];
