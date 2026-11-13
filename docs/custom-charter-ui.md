# Custom charter dashboard (0.0.4)

The supplied MineScape 1.5.119 pack demonstrates a custom JSON dashboard whose
data travels through Script API forms. Frontier now uses that architecture:

- A fixed set of 25 transport records supplies labels and action indices.
- Four **local radio-toggle sidebar tabs** switch custom page panels. They do
  not submit forms, reopen the menu or recalculate the census.
- Frontier's UI draws the oak frame, crimson/gold header, parchment pages,
  selected navigation and custom action-button states. The supplied concept is
  the style reference; this is an implementation in JSON UI controls, not a
  screenshot baked over the screen. It is not a pixel-for-pixel reproduction.
- MineScape's `main_screen_content/server_form_factory` nested-control hook
  routes charter titles to the new dashboard. All non-charter titles go through
  the original MineScape router with its original controls unchanged.
- Biome selection also uses a custom Frontier renderer.

`tools/build_charter_ui.py` regenerates the UI and matching `charter-layout.js`.
The original MineScape JSON is retained under `tools/reference` and the asset
list records its copied UI dependencies. Only its resource UI is reused: no
MineScape gameplay scripts, invasions or combat systems are bundled.

Both addons override `ui/server_form.json`, so **Frontier's resource pack must
be above MineScape's** in the active resource pack stack. Frontier's combined
file retains MineScape 1.5.119 definitions and assets. A later MineScape UI update
will require rebasing the reference before regenerating Frontier's combined UI.

This update targets Bedrock 1.26.0+ and uses the same stable server API versions
as the supplied MineScape: server 2.9.0, server-ui 2.1.0. This also makes the
prototype's primary-biome API available without beta APIs.

Automated checks verify routing, preservation, tab bindings, fixed record
indices and action transport. They do not render the Minecraft client. Test
mouse, controller and touch input and check the content log on the target game.
