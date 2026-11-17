# Working Adapter v3 — Frontier 0.0.104

The user designated `Jagsbys_Frontier_v0.0.100_MineScape_Adapter_v3.mcaddon`
as the working base. Its SHA-256 is
`05931912d2b713c7a92b75157cfbbfad721a71112a423d3dd9d7584679b048ca`.
Both packs/modules and the BP→RP dependency already have numeric 0.0.103,
despite the 0.0.100 filename/display label. The next build is **0.0.104**.

Compared with the repository's 0.0.101 Adapter v1, its behavior scripts and
assets are identical. The only UI change is the Charter router's native fallback:
`vanilla@$msfm_standard_long_form`, with
`$msfm_standard_long_form|default: "server_form.long_form"`. Its two external
renderer globals are unchanged. This permits the working MineScape router to
supply its standard form without hardwiring Frontier back to the shared router.
The UI generator now reproduces that v3 definition. No MineScape files are edited.

0.0.104 retains all v3 resource content, with synchronized manifest labels and
versions. The generated Charter JSON uses expanded formatting; its parsed
definitions are identical to the upload. Frontier behavior adds the per-departure outgoing trade selection and
pause/resume feature documented in [the economy guide](settlement-economy.md).
Surveying and trade-rank bridge code are unchanged. Static tests validate the
hooks and routing structure; the user's working-v3 report is the runtime evidence
for the base. This build's Realm gameplay still needs in-game verification.

---

# MineScape UI Adapter v1 review — Frontier 0.0.101

The user supplied `Jagsbys_Frontier_v0.0.100_MineScape_Adapter_v1.mcaddon` for
review and a 101 release. SHA-256 of the supplied archive:
`7e411f8c7677a6c53abe3cdcb0e744b53f20e5fc0830095ce4545309156647ad`.

Comparison against published Frontier 0.0.100 found:

- Every behavior script, villager entity, controller, recipe, asset and UI
  definition is identical. No original files are missing or replaced.
- Both manifests have numeric version [0,0,101], synchronized module versions
  and behavior→resource dependency, but display names still say 0.0.100.
  Original pack/module UUIDs, engine/API requirements and PBR capability remain.
- The sole added file is `ui/_global_variables.json` in the resource pack.

The two provider values are:

| Global variable | Renderer control |
| --- | --- |
| `$msfm_external_long_form` | `jagsby_frontier.jf_router` |
| `$msfm_external_modal_form` | `jagsby_frontier.jf_modal_router` |

Both names resolve to existing panel controls in the registered Charter UI.
The long-form router handles the Charter dashboard, map and picker, preserving
its native-form fallback. The modal router handles Rename and its native modal
fallback. The file declares hooks; it does not execute code, register another
UI file, change standalone server-form routing, discover villagers or write
world state.

This release adopts those declarations exactly and corrects the manifest
display names to 0.0.101. It does not bump to 102: the supplied package was
already numerically 101. The review found no additional Frontier logic/layout
change necessary for these provider declarations.

## MineScape-side requirement

A compatible MineScape shared router must actually consume these variable
names and stop overriding Frontier's UI with its own old copy. The original
`MineScape_v1.5.130.mcaddon` previously supplied contains neither hook name and
bundles an older `ui/jagsby_frontier/charter.json` with Information and no map.
Adding the provider declarations alone cannot change that version's behavior.
No changes to MineScape were made in this task. The user's updated MineScape
consumer has not been supplied or runtime-tested here, so cross-pack behavior,
pack ordering and Realm rendering are not claimed verified.

## Validation

Compare the final archive with the user's adapter: every non-manifest pack
entry must be byte-identical, including the hook file. All UUIDs/dependencies
are checked. Existing UI guards and test suites run, and a cross-file test
verifies both provider values resolve to registered controls. Packaging remains
deterministic. These checks do not execute Minecraft JSON UI or native Molang.
