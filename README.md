# Jagsby's Frontier

Minecraft Bedrock village and civilization addon, based on the imported v0.1
prototype. **This is not a completed implementation of the specification**.

## Download

[Download the current prototype addon](downloads/Jagsbys_Frontier_v0.0.11.mcaddon?raw=true)

The Overview places the recommended 96×168 tier portrait on the left, with
a larger settlement name and tier grouped on the right, a compact biome row,
and Realm Power below. The painted scene displays without its baked dark frame,
and the Overview has no scrolling.
Rename remains in the top header bar. Portrait tiers use the provisional
Realm Power thresholds 0 / 2 / 5 / 10 / 20. The 64-block census runs on
charter interaction. Native villager trading levels are currently unavailable:
the attempted Molang bridge was rejected by Minecraft and removed. Power and
tier show conservative minimum estimates (≥), not exact trade-level scores. MineScape
is not required or bundled. Enable Frontier's linked behavior and resource
packs in a disposable test world. The in-game name is **Jagsby's Frontier 0.0.11**.
Minecraft rendering and native trade-tier execution remain unverified in-game.

- Requirements: [village system specification](docs/village-system-spec.md).
- Integration blockers and prototype defects: [implementation status](docs/implementation-status.md).
- Source: `packs/behavior` and `packs/resource`.
- Current census feature and limitations: [village census](docs/village-census.md).
- Standalone custom UI: [charter dashboard](docs/custom-charter-ui.md).

## Development

### Trade-rank diagnostic

[Download the isolated trade-rank probe](downloads/Jagsbys_Frontier_Trade_Rank_Probe_0.0.1.mcpack?raw=true).
This tests a different native Molang context and is **unverified**, not a
completed scoring fix. See [investigation and test steps](docs/trade-rank-investigation.md).

### Settlement portraits

- [Download 96×168 portraits](downloads/Jagsbys_Frontier_Settlement_Portraits_96x168.zip?raw=true): recommended; about 62 KiB for all five PNGs.
- [Download 64×112 portraits](downloads/Jagsbys_Frontier_Settlement_Portraits_64x112.zip?raw=true): compact; about 30 KiB for all five PNGs.

See [asset details](docs/settlement-portrait-assets.md). The recommended set is
wired into the Overview and changes with the settlement's Realm Power tier.

### Tab sprites

[Download the three transparent 64×64 tab sprites](downloads/Jagsbys_Frontier_Tab_Sprites_64x64.zip?raw=true).
The approved set A artwork is in `packs/resource/textures/ui/frontier/icons/`:
`overview.png` (charter scroll), `research.png` (open book), and `production.png`
(resource crate). Each is an RGBA PNG with binary transparency and crisp edges.
These sprites are wired into all states of the corresponding sidebar tabs in
the 0.0.11 addon, replacing the earlier placeholder drawings.

Use the existing checkout; cloud tasks already have isolated environments.
Python 3.12 and Node.js 24 are available in the prepared cloud environment.
No third-party build dependencies or credentials are needed for static validation.

```sh
cd /workspace/Jagsby-sFrontier
python tools/addon.py validate
node --test tools/*.test.mjs
python tools/addon.py build
```

Build output is `dist/Jagsbys_Frontier_v0.0.11.mcaddon`. Packaging is
deterministic; the build regenerates the custom UI. Vanilla villager definitions
are not overridden.
The pack targets Bedrock 1.26.0+ with `@minecraft/server` 2.9.0 and
`@minecraft/server-ui` 2.1.0.

Static checks do not execute the Minecraft APIs or render JSON UI. Import both
packs into a disposable test world on the intended Bedrock version for runtime
testing. Do not deploy this prototype to the survival Realm as a finished system.
