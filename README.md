# Jagsby's Frontier

Minecraft Bedrock village and civilization addon, based on the imported v0.1
prototype. **This is not a completed implementation of the specification**.

## Download

[Download the current prototype addon](downloads/Jagsbys_Frontier_v0.0.2.mcaddon?raw=true)

This build includes the interaction-triggered 64-block villager census. Exact
trading-rank power and biome detection remain unfinished; it has not been tested
in Minecraft. Enable both the behavior and resource packs in a disposable test world.

- Requirements: [village system specification](docs/village-system-spec.md).
- Integration blockers and prototype defects: [implementation status](docs/implementation-status.md).
- Source: `packs/behavior` and `packs/resource`.
- Current census feature and limitations: [village census](docs/village-census.md).

## Development

Use the existing checkout; cloud tasks already have isolated environments.
Python 3.12 and Node.js 24 are available in the prepared cloud environment.
No third-party build dependencies or credentials are needed for static validation.

```sh
cd /workspace/Jagsby-sFrontier
python tools/addon.py validate
node --test tools/census.test.mjs
python tools/addon.py build
```

Build output is `dist/Jagsbys_Frontier_v0.0.2.mcaddon`. Packaging is
deterministic. The pack targets
Bedrock 1.21.100 or newer with `@minecraft/server` and `@minecraft/server-ui` 2.0.0.

Static checks do not execute the Minecraft APIs or render JSON UI. Import both
packs into a disposable test world on the intended Bedrock version for runtime
testing. Do not deploy this prototype to the survival Realm as a finished system.
