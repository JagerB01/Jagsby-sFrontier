# Jagsby's Frontier

Minecraft Bedrock village and civilization addon, based on the imported v0.1
prototype. **This is not a completed implementation of the specification**.

## Download

[Download the current prototype addon](downloads/Jagsbys_Frontier_v0.0.4.mcaddon?raw=true)

This build adds a custom charter dashboard inspired by the supplied style reference,
using MineScape's JSON UI architecture, and a native trading-tier bridge for the
interaction-triggered 64-block census. It has not been tested in Minecraft.
Enable both linked packs; place Frontier above MineScape in the resource-pack
stack. The in-game name is **Jagsby's Frontier 0.0.4**.

- Requirements: [village system specification](docs/village-system-spec.md).
- Integration blockers and prototype defects: [implementation status](docs/implementation-status.md).
- Source: `packs/behavior` and `packs/resource`.
- Current census feature and limitations: [village census](docs/village-census.md).
- Custom UI and pack order: [charter dashboard](docs/custom-charter-ui.md).

## Development

Use the existing checkout; cloud tasks already have isolated environments.
Python 3.12 and Node.js 24 are available in the prepared cloud environment.
No third-party build dependencies or credentials are needed for static validation.

```sh
cd /workspace/Jagsby-sFrontier
python tools/addon.py validate
node --test tools/*.test.mjs
python tools/addon.py build
```

Build output is `dist/Jagsbys_Frontier_v0.0.4.mcaddon`. Packaging is
deterministic; the build regenerates the custom UI and vanilla villager bridge.
The pack targets Bedrock 1.26.0+ with `@minecraft/server` 2.9.0 and
`@minecraft/server-ui` 2.1.0, matching the supplied MineScape target.

Static checks do not execute the Minecraft APIs or render JSON UI. Import both
packs into a disposable test world on the intended Bedrock version for runtime
testing. Do not deploy this prototype to the survival Realm as a finished system.
