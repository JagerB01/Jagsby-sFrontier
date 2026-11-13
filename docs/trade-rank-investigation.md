# Trade-rank investigation and isolated probe

## What is established

- The user's 0.0.9 content log rejects `query.trade_tier` in a server entity
  `set_property` expression. That particular bridge is invalid.
- Stable server API declarations inspected through 2.11.0 do not expose a native
  trade-tier accessor. The economy trade table component documentation does not
  list a tier-increase event hook. The documented entity filters do not provide
  a trade-tier comparison filter.
- The Molang query itself is documented. Behavior-pack animation controllers
  are documented as supporting Molang transitions and entity-event triggers.
  Whether the trade-tier query is supported in **that server context** is still
  unverified; the general query documentation does not establish that.

Sources:

- [Native trade-tier query](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Reference/Content/MolangReference/Examples/MolangConcepts/QueryFunctions/query_trade_tier.md)
- [Behavior-pack animations and controllers](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Documents/Animations/BehaviorPackAnimationsControllers.md)
- [Economy trade table component](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Reference/Content/EntityReference/Examples/EntityComponents/minecraftComponent_economy_trade_table.md)

## Candidate to validate

The separate **Frontier Trade Rank Probe 0.0.1** behavior pack requests one
measurement when a player sneaks and interacts with a villager. It sets a literal
request property. A behavior-pack animation controller enters a requested state,
compares the native trade-tier query and triggers an event that writes a literal
integer into a script-readable property. No trade query is placed in event
`set_property`, and no ranks are guessed from profession, XP or appearance.

The controller's idle state checks only its request flag. Trade-tier queries
are evaluated in the requested state, not as a background village census.
The separate `max_trade_tier > 0` gate helps distinguish a trading entity from
an unavailable/no-trade case, but does not prove every query is supported. Raw
values are reported without assuming whether the engine uses zero or one as its
novice tier. An unsupported query may log an error or produce a zero; a known
master returning zero must not be treated as success.

The diagnostic is isolated from Frontier's production scoring. Its generated
vanilla entity definitions preserve the reference AI, components and trades and
add only namespaced properties, literal events and the diagnostic controller.
It does override vanilla villager definitions, so use a disposable local test
world with this probe's behavior pack enabled and other villager-overriding packs
disabled. Frontier itself is not required for this diagnostic.

## In-game check required

1. Import `downloads/Jagsbys_Frontier_Trade_Rank_Probe_0.0.1.mcpack` and enable
   **Frontier Trade Rank Probe 0.0.1** in a disposable test world.
2. Use the native trading screen to identify an employed novice villager and an
   employed master villager.
3. Close that screen, then sneak and interact with each villager. The probe
   prints its entity ID and raw tier to chat and the content log.
4. Upgrade a known villager through a real trade level, then sample it again.
5. Compare the results with the native trading screen and inspect the content
   log for any Molang errors in the diagnostic controller.

Distinct correct readings for novice/master plus a correct live upgrade are
required before integration. A static zero, a timeout, or a query-resolution
error means this candidate has not established native tier access. The next
step then depends on the actual engine response, not the unit-test result.

## Build and offline checks

```sh
python tools/build_trade_rank_probe.py
python -m unittest discover -s tools -p test_trade_rank_probe.py
```

Offline tests check request gating, literal-only property events, preservation
of the vanilla AI/trades and script syntax. They do not execute Minecraft Molang.

## Subsequent live result and integration

The later user-provided ContentLog2026-11-13_18-38-21_1.txt contains no errors and
reports raw_tier=1 three times for the same villager. The user identified it as
Apprentice and confirmed the probe was working. The native client villager
renderer uses query.trade_tier directly to index stone, iron, gold, emerald and
diamond badges, corresponding to Novice through Master (0 through 4).

0.0.12 integrates the same controller pattern, in the production namespace, with
five valid rank states and batched script sampling. The old event-expression
query remains absent. Disable the diagnostic pack before enabling the integrated
build so its vanilla entity definitions do not replace the production bridge.
The production integration itself remains to be tested in Minecraft.
