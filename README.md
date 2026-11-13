# Jagsby's Frontier

Minecraft Bedrock village and civilization addon, based on the imported v0.1
prototype. **This is not a completed implementation of the specification**.

## Download

[Download the current prototype addon](downloads/Jagsbys_Frontier_v0.0.9.mcaddon?raw=true)

The Overview places the recommended 96×168 tier portrait on the left, with
settlement name, village biome and Realm Power on the right, without scrolling.
Rename remains in the top header bar. Portrait tiers use the provisional
Realm Power thresholds 0 / 2 / 5 / 10 / 20. This build also contains a native
trading-tier bridge for the interaction-triggered 64-block census. MineScape
is not required or bundled. Enable Frontier's linked behavior and resource
packs in a disposable test world. The in-game name is **Jagsby's Frontier 0.0.9**.
Minecraft rendering and native trade-tier execution remain unverified in-game.

- Requirements: [village system specification](docs/village-system-spec.md).
- Integration blockers and prototype defects: [implementation status](docs/implementation-status.md).
- Source: `packs/behavior` and `packs/resource`.
- Current census feature and limitations: [village census](docs/village-census.md).
- Standalone custom UI: [charter dashboard](docs/custom-charter-ui.md).

## Development

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
the 0.0.9 addon, replacing the earlier placeholder drawings.

Use the existing checkout; cloud tasks already have isolated environments.
Python 3.12 and Node.js 24 are available in the prepared cloud environment.
No third-party build dependencies or credentials are needed for static validation.

```sh
cd /workspace/Jagsby-sFrontier
python tools/addon.py validate
node --test tools/*.test.mjs
python tools/addon.py build
```

Build output is `dist/Jagsbys_Frontier_v0.0.9.mcaddon`. Packaging is
deterministic; the build regenerates the custom UI and vanilla villager bridge.
The pack targets Bedrock 1.26.0+ with `@minecraft/server` 2.9.0 and
`@minecraft/server-ui` 2.1.0.

Static checks do not execute the Minecraft APIs or render JSON UI. Import both
packs into a disposable test world on the intended Bedrock version for runtime
testing. Do not deploy this prototype to the survival Realm as a finished system.
