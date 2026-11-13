# Jagsby's Frontier

Minecraft Bedrock village and civilization addon, based on the imported v0.1
prototype. **This is not a completed implementation of the specification**.

## Download

[Download the current prototype addon](downloads/Jagsbys_Frontier_v0.0.23.mcaddon?raw=true)

The header shows the village name above a smaller Village Charter subtitle.
Overview keeps the framed portrait beside compact Owner, Village Tier, Biome
and Realm Power sections. Both research subtabs fit without scrolling.
Power uses explicit text such as 2.0 RP. Rename stays in the header.

The fourth tab is **Realm**, with paged My Settlements / All Settlements views.
New charters record their placer as owner; legacy unowned settlements display
Unclaimed and can be explicitly claimed. Resource collection is under Production.
Global research is a five-node visual tree with no purchase actions connected;
Local research remains functional. See [0.0.23 UI details](docs/realm-and-research-ui.md).

The on-demand server-controller trade-rank bridge is now included. **Disable the
separate Trade Rank Probe pack** when using this build, because both define
vanilla villagers. Charter interaction samples normal ranks from Novice (0.2)
through Master (1.0); unknown reads remain labeled minimum estimates. MineScape
is not required. In-game name: **Jagsby's Frontier 0.0.23**. The user confirmed
the probe's Apprentice reading; this production integration and updated visual
layout still need in-game verification.

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
the 0.0.23 addon, replacing the earlier placeholder drawings.

Use the existing checkout; cloud tasks already have isolated environments.
Python 3.12 and Node.js 24 are available in the prepared cloud environment.
No third-party build dependencies or credentials are needed for static validation.

```sh
cd /workspace/Jagsby-sFrontier
python tools/addon.py validate
node --test tools/*.test.mjs
python tools/addon.py build
```

Build output is `dist/Jagsbys_Frontier_v0.0.23.mcaddon`. Packaging is
deterministic; the build regenerates the custom UI and controller bridge. The included native villager definitions preserve vanilla AI/trades and add
the controller bridge.
The pack targets Bedrock 1.26.0+ with `@minecraft/server` 2.9.0 and
`@minecraft/server-ui` 2.1.0.

Static checks do not execute the Minecraft APIs or render JSON UI. Import both
packs into a disposable test world on the intended Bedrock version for runtime
testing. Do not deploy this prototype to the survival Realm as a finished system.
