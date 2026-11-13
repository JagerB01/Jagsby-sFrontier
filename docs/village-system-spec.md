# Jagsby's Frontier — Village & Civilization System

## Project Overview

Develop the settlement and civilization systems for **Jagsby's Frontier**, a Minecraft Bedrock add-on.

The system revolves around establishing settlements, conducting global and local research, producing biome-dependent resources, and expanding civilization through progressively more dangerous regions.

Players should be able to develop individual settlements while contributing to a shared civilization-wide progression system.

**Important:** Reuse existing functionality from MineScape, Diplomacy, and any other relevant existing project modules wherever appropriate. Do not duplicate systems that already exist.

This specification covers the village systems only. Do not implement goblins, invasions, military systems, or world threat as part of this work.

---

# 1. Village Center Block

## Appearance

Use the previously created **Village Charter Center** Blockbench model.

The block should:

- Occupy a single standard Minecraft block space.
- Feature oak framing, stone components, parchment on top, and red-and-gold settlement heraldry.
- Match the existing Village Charter design.
- Open the settlement management interface when interacted with.
- Serve as the physical administrative center of the settlement.

Use the existing model and textures rather than redesigning them.

## Behavior

Each placed village center represents one registered settlement.

The block must maintain its association with that settlement's persistent data, including:

- Settlement identity and name.
- Location and dimension.
- Zone.
- Settlement tier, where applicable.
- Primary biome.
- Eligible secondary biomes.
- Selected secondary biome.
- Local research levels.
- Resource production configuration.
- Production progress.

The system should support multiple settlements existing simultaneously.

Settlement records must persist across world restarts.

Prevent accidental duplicate registration and ensure that breaking, replacing, or moving a village center cannot duplicate resources or research progress.

Preserve any relevant settlement-creation, annexation, or removal behavior already implemented in Diplomacy.

---

# 2. Existing Geographic Zone System

Jagsby's Frontier must use the **six geographic zones already implemented in MineScape**.

Their progression order is:

1. Heartlands
2. Borderlands
3. Wildlands
4. Dreadlands
5. Blightlands
6. Blackreach

These zones are fixed and determined by the existing coordinate-distance rules involving the X and Z axes relative to the world origin.

**Do not change zone boundaries, zone names, or the coordinate calculations.**

Find and reuse the existing zone-detection implementation.

Zones determine where settlements may be established, subject to the civilization's Frontier Expansion research.

Players must remain free to travel into zones they have not unlocked for settlement establishment.

Research restricts settlement placement, not exploration.

---

# 3. Global Research

Global research represents civilization-wide advancement.

Its unlocked levels and benefits apply to the entire civilization rather than an individual settlement.

There are **four confirmed global research lines**.

## 3.1 Frontier Expansion

Controls which geographic zones allow settlement establishment.

| Research level | Settlement establishment unlocked |
|---|---|
| Default | Heartlands |
| I | Borderlands |
| II | Wildlands |
| III | Dreadlands |
| IV | Blightlands |
| V | Blackreach |

Requirements:

- Upgrades must be purchased sequentially.
- A settlement cannot be registered in a zone that has not been unlocked.
- Previously established settlements remain valid.
- Zone eligibility is checked when establishing or registering a settlement.
- Research does not affect ordinary player movement.

## 3.2 Settlement Capacity

Increases the maximum number of settlements civilization can maintain.

Requirements:

- Begin with a limited number of settlements.
- Each research level increases the civilization-wide settlement limit.
- Prevent new registrations when the limit has been reached.
- Existing settlements count toward the limit.
- The limit applies across all zones combined.

The exact starting capacity, number of levels, and increases per level have not yet been finalized.

Implement these as configurable values instead of inventing permanent balance numbers.

## 3.3 Settlement Development

Controls the maximum local research level available to individual settlements.

Requirements:

- Settlements may purchase local research upgrades only up to the level permitted by global Settlement Development.
- Each settlement maintains its own purchased upgrade levels.
- Researching Settlement Development globally raises the available ceiling but does not automatically upgrade individual settlements.
- Local upgrades must still be purchased individually.

For example, an initial maximum of Level I could eventually increase to Level V, but the precise progression should remain configurable until finalized.

Single-level local research, such as Biome Utilization, should not gain artificial additional levels.

## 3.4 Shared Storage

This research increases the **shared capacity for resources produced by settlements**.

This is NOT a conventional shared chest or general-purpose player item storage system.

Every settlement contributes its automatically generated resources to a civilization-wide production stockpile.

Requirements:

- All registered settlements use one shared resource storage system.
- Global Shared Storage research increases the maximum amount of resources the civilization can accumulate before collection.
- Each settlement contributes resources according to its own production configuration.
- Players can collect accumulated resources through the settlement management interface.
- Once capacity is reached, further production must not exceed the cap.
- The system must preserve accumulated resources and production state across restarts.
- Collection must never duplicate or destroy resources through partial transfers or insufficient player inventory space.
- Track resource quantities separately, even though capacity is shared.

An upgrade must have a real measurable capacity increase.

Exact starting capacity, research levels, and capacity increases remain to be balanced.

**Important distinction:** The stockpile stores produced resources awaiting collection. It is not a universal inventory into which players deposit arbitrary items.

---

# 4. Local Settlement Research

Local research affects only the settlement where it is purchased.

Three local upgrades have been confirmed.

## 4.1 Production Efficiency

Increases the rate at which that individual settlement generates resources.

Requirements:

- Applies to all resources produced by the settlement.
- Increases production speed or effective output by a configurable percentage.
- Does not unlock additional resource types.
- Does not increase the shared stockpile capacity.
- Applies only to the settlement that purchased it.
- Must support multiple upgrade levels.

Proposed balancing progression:

| Level | Total production bonus |
|---|---|
| I | +10% |
| II | +20% |
| III | +30% |
| IV | +40% |
| V | +50% |

These percentages are provisional, not finalized.

Bonuses should be applied as total increases relative to base production, not repeatedly compounded with one another.

## 4.2 Hearthstone

Provides **Regeneration I** to players within the settlement's established boundaries.

Requirements:

- Regeneration I only.
- No Resistance, Strength, Absorption, Fire Resistance, or other potion effects.
- Applies only to settlements that have researched Hearthstone.
- Uses the settlement boundaries or radius already defined by the settlement system.
- Ends when the player is no longer eligible, allowing only the normal brief effect expiration necessary for smooth operation.
- Does not grant additional combat buffs.

Keep this upgrade simple.

Do not add additional potion effects or arbitrary gameplay mechanics.

The exact interaction between Hearthstone and the global Settlement Development level should be handled without inventing unnecessary upgrade tiers.

## 4.3 Biome Utilization

Allows a settlement to utilize one additional biome for resource production.

**This research has exactly one level.**

Default:

- The settlement produces resources from the biome occupied by its village center.

After research:

- The settlement may select exactly one additional eligible biome detected within 256 blocks of its village center.
- The selected biome adds its eligible resources to the settlement's production options.
- The player chooses which detected biome to utilize.
- The selection is saved persistently.

Maximum:

**Two active biomes per settlement: one primary and one secondary.**

Never allow three or more active biomes through research.

Biome Utilization expands the variety of resources available to the settlement. It must not automatically multiply the total resource-generation budget simply because an additional biome was unlocked.

If multiple suitable biomes exist nearby, they should appear as selectable options in the settlement management interface.

The primary biome remains determined by the village center's location.

---

# 5. Biome Detection

Settlements must inspect surrounding biomes to determine which additional biome is available through Biome Utilization.

## Survey radius

**256 blocks from the village center.**

Requirements:

- Detect the primary biome at the village center.
- Identify distinct additional biomes within the 256-block radius.
- Use the established Bedrock biome-detection APIs where applicable.
- Respect chunk-loading limitations.
- Avoid excessive repeated scanning that would negatively affect Realm performance.
- Persist completed biome-survey results.
- Allow a controlled resurvey when necessary.
- Do not treat unloaded regions as confirmed absence of a biome.

The 256-block limit is a radius, not a square's half-width treated without distance checks.

A secondary biome must be within the actual horizontal distance limit.

The survey must not require generating structures or altering terrain.

Use a reasonable sampling strategy for performance.

---

# 6. Settlement Resource Production

## Replace the resource-site system

The previously designed independent resource sites are being abandoned in favor of settlement-based production.

Do not implement or preserve resource-site generation as a parallel system in Jagsby's Frontier.

Instead, reuse the previously developed **biome-to-resource mapping**.

Locate the existing biome-resource table in the previous project work and preserve its finalized resource choices and exclusions.

Do not invent a new biome-resource table.

## Primary biome production

Each settlement begins with production tied exclusively to the biome occupied by its village center.

This is the only active biome until Biome Utilization is researched.

## Secondary biome production

After researching Biome Utilization, the settlement can activate one additional detected biome.

Both active biomes contribute their eligible resource types to the settlement's production configuration.

Do not automatically enable every biome found in the 256-block survey.

## Resource selection

The earlier resource-site design allowed a 50/50 selection between possible resources for a biome.

For settlement production, do not assume that a settlement permanently produces both resources automatically.

Retain the existing biome resource eligibility table, but implement resource allocation in a configurable way so the precise production-selection rule can be finalized without replacing the system.

## Production speed

Resources should accumulate gradually over real elapsed time while the world is running, including while a settlement's chunks are unloaded.

Requirements:

- Use persisted production timestamps or another efficient deterministic time-accounting system.
- Avoid running continuous individual production loops for every settlement.
- Cap accumulated production according to global Shared Storage capacity.
- Apply local Production Efficiency correctly.
- Prevent duplication from world reloads, repeated callbacks, or multiple simultaneous players.
- Keep generation rates modest for a long-running survival Realm.

Earlier resource-site production was intentionally balanced conservatively.

Use those decisions as reference where available, but do not assume the same final rates without review.

---

# 7. Production and Stockpile Collection

Players interact with the Village Charter to inspect their settlement's production and the civilization's accumulated resources.

## Production information

Display:

- Primary biome.
- Secondary biome, if unlocked and selected.
- Available secondary biome options.
- Resources eligible for production.
- Production Efficiency level.
- Actual production rates.
- Current contributions to the shared stockpile.

## Shared stockpile

Display:

- Total civilization-wide storage capacity.
- Current stored amount.
- Remaining available capacity.
- Each stored resource type and quantity.
- Collection controls.

The shared stockpile is available through every registered village center.

Collection should transfer resources from the stored production pool into the player's inventory.

Only deduct resources successfully delivered.

The stockpile represents contributions from all settlements, not separate independently capped village inventories.

---

# 8. Settlement Management UI

Use a **custom Minecraft Bedrock JSON UI**, not the standard Script API action forms as the primary interface.

Follow the previously approved Village Charter menu design language.

## Visual style

- Medieval fantasy presentation.
- Oak and dark wooden framing.
- Stone edging.
- Parchment backgrounds.
- Deep crimson and gold accents.
- Pixel-art icons.
- Minecraft-compatible pixel typography.
- Clearly indicated selected tabs and research states.

The visual theme should match the Village Charter block and the Jagsby's Frontier icon.

Use a consistent interface across all pages.

## Primary navigation

The interface should include four tabs:

### Overview

Displays the settlement's general information:

- Settlement name.
- Current zone.
- Settlement tier.
- Primary biome.
- Selected secondary biome.
- Local research summary.
- Relevant civilization progression information.

### Research

Provides access to both global and local research.

The interface should distinguish clearly between civilization-wide upgrades and upgrades specific to the current settlement.

Global options:

- Frontier Expansion.
- Settlement Capacity.
- Settlement Development.
- Shared Storage.

Local options:

- Production Efficiency.
- Hearthstone.
- Biome Utilization.

Each research entry must show:

- Research name.
- Current level.
- Next level, where applicable.
- Exact gameplay benefit.
- Required materials or costs.
- Whether the upgrade is affordable.
- Whether its prerequisites are met.
- Purchase or research action.

Prevent duplicate purchases or accidental resource consumption.

### Production

Displays current biome-based resource generation.

Players can inspect all produced resources and their effective generation rates.

If Biome Utilization has been researched, this tab should also permit selection of a secondary biome.

### Stockpile

Displays civilization-wide resource accumulation.

Players can inspect stored resources and collect available quantities.

The storage display should reflect the shared capacity upgraded through global Shared Storage research.

## UI integration

Because MineScape already has its own custom interface, avoid overwriting shared UI assets or definitions without checking compatibility.

Use appropriately namespaced resource paths and identifiers.

The interface should function on Minecraft Bedrock and be suitable for a multiplayer Realm.

The menu concept images are visual references, not evidence that every illustrated research node or placeholder resource value is part of the finalized design.

Do not implement invented research branches appearing in concept art.

---

# 9. Research Costs and Progression

Research should consume meaningful resources and serve as a long-term survival-world resource sink.

Requirements:

- Store each research upgrade's cost in a configurable definition.
- Escalate costs for higher research levels where appropriate.
- Show costs before purchase.
- Verify affordability before applying research.
- Deduct payment atomically to prevent duplication.
- Persist unlocked research.
- Do not reset research when players disconnect.

The exact research costs have not been finalized.

Do not invent permanent costs and treat them as approved.

If placeholder costs are needed for testing, label them clearly and keep them configurable.

---

# 10. Multiplayer and Persistence

This is intended for a multiplayer Bedrock Realm.

Requirements:

- Global research is shared by the civilization.
- Local research is stored individually per settlement.
- Resource generation occurs without requiring a player to stand beside each village center.
- Shared stockpile resources are persistent.
- Multiple players accessing settlement menus must not cause duplicated purchases or collection.
- Production should avoid excessive ticking or unnecessary loaded-chunk scanning.
- Settlement registration should remain stable after world restarts.
- Use deterministic, persisted identifiers for settlements.

Preserve existing Diplomacy settlement metadata and integrations where possible.

---

# 11. Existing Assets

Use the previously produced assets where available:

**Add-on name:** Jagsby's Frontier

**Pack icon:** `jagsbys_frontier_icon_64x64.png`

- Exactly 64×64 pixels.
- Transparent background.
- Used as the add-on icon.

**Village center:** `village_charter_center.bbmodel`

- Use the existing Blockbench model, texture, and Bedrock geometry.
- Maintain its single-block proportions.

**UI references:**

- Village Charter Settlement Overview.
- Village Charter Research.
- Village Charter Production Management.
- Village Charter Shared Stockpile.

These are visual design references. The final UI must reflect the finalized mechanics, not every placeholder represented in the images.

---

# 12. Implementation Priorities

Implement in this order:

1. Establish the Village Charter block and its persistent settlement association.
2. Integrate the existing six-zone calculation.
3. Implement global Frontier Expansion and Settlement Capacity.
4. Implement global Settlement Development.
5. Implement biome detection and primary biome assignment.
6. Implement the one-time local Biome Utilization research and secondary biome selection.
7. Implement biome-dependent settlement production using the existing resource mapping.
8. Implement local Production Efficiency.
9. Implement global Shared Storage and civilization-wide accumulation.
10. Implement resource collection.
11. Implement the local Hearthstone Regeneration I effect.
12. Integrate the custom four-tab JSON UI.
13. Test multiplayer synchronization, persistence, research purchase validation, and unloaded-chunk behavior.

## Important design constraints

- Do not redesign the geographic zones.
- Do not recreate resource sites.
- Do not use standard Script API forms as the final UI.
- Do not add unapproved research branches.
- Do not add offensive combat buffs to settlements.
- Hearthstone gives Regeneration I only.
- Biome Utilization unlocks exactly one additional biome.
- Shared Storage is for automatically generated settlement resources, not arbitrary player item deposits.
- Do not implement goblin or invasion mechanics in this phase.
- Preserve existing MineScape/Diplomacy functionality rather than unnecessarily replacing it.

**The objective is a fully integrated, persistent settlement-development system that rewards establishing settlements across different geographic zones and biomes, investing resources in research, and developing civilization over the lifetime of a survival Realm.**