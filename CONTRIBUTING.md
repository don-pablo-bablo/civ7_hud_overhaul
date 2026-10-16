# Contributing

## How it works

The mod restyles and moves the game's own HUD components rather than
replacing them. Each script in `ui/` is listed in the modinfo.

| path | what it is |
|---|---|
| `mod/hud-overhaul/` | the mod itself |
| `.../ui/hud-overhaul-layout.js` | dock plate and row, Journal, minimap and turn dial, and the option that turns the mod off |
| `.../ui/hud-overhaul-settings.js` | saved settings, the Add-ons tab and its groups, the parts of the HUD the player can give back to the game, each part's size and their options, and the switch that removes every stylesheet while the mod is off |
| `.../ui/hud-overhaul-edition.js` | which mod the scripts run in, this or Pablo's Top Bar and Tooltips, and its settings key |
| `.../ui/hud-overhaul-theme.js` | the colour and opacity of the top bar and plates, and their options |
| `.../ui/hud-overhaul-tracker.js` | the World Tracker in game: reads research and civic, draws it with the Journal under the dock, and its +/- |
| `.../ui/hud-overhaul-tracker-render.js` | the World Tracker's drawing only: plain data in, DOM out, no engine calls |
| `.../ui/hud-overhaul-yields.js` | empire food and production in the top bar, through the game's mod slot, and their option |
| `.../ui/hud-overhaul-treasure.js` | treasure convoys in the Exploration Age as a pill in the top bar, through the game's mod slot, and its option |
| `.../ui/hud-overhaul-celebration.js` | turns to the next celebration, added to the top bar's happiness pill, and its option |
| `.../ui/hud-overhaul-pills.js` | coloured pills behind the top bar's yields |
| `.../ui/hud-overhaul-settlements.js` | the settlement count in the top bar split into cities and towns, with the population, turning red when over the cap with the happiness lost, and their options |
| `.../ui/hud-overhaul-commerce.js` | opens the commerce screen on a tab, for the resources, trade and treasure pills |
| `.../ui/hud-overhaul-resources.js` | the empire's resources by class as a pill in the top bar, through the game's mod slot, and its option |
| `.../ui/hud-overhaul-greatworks.js` | the empire's great works as a pill in the top bar, through the game's mod slot, and its option |
| `.../ui/hud-overhaul-religion.js` | your religion's share of the world's settlements as a pill in the top bar, through the game's mod slot, the data its tooltip reads, and its option |
| `.../ui/hud-overhaul-trade.js` | trade routes in use against the limit as a pill in the top bar, through the game's mod slot, and its option |
| `.../ui/hud-overhaul-units.js` | your military units and civilians as a pill in the top bar, through the game's mod slot, the list its tooltip reads, and its option |
| `.../ui/hud-overhaul-happiness.js` | settlements at each happiness level as a pill in the top bar, through the game's mod slot, and its option |
| `.../ui/hud-overhaul-victories.js` | your place in each victory as a pill in the top bar, through the game's mod slot, the standings its tooltip reads, and its option |
| `.../ui/hud-overhaul-rows.js` | the top bar's pills on one row or two in a fixed order: moves the game's pills into the mods' slot, adds a line break, puts the victories at the end of the first row, and wraps what does not fit before the top right corner; the top bar's size, and the option for the rows |
| `.../ui/hud-overhaul-tooltips.js` | detailed tooltips on the top bar's pills, as components through `data-tooltip-component`, locked open with the inspect key |
| `.../ui/hud-overhaul-ribbon.js` | the compact leader ribbon and its option |
| `.../ui/hud-overhaul-strength.js` | combat strength by Drongo's formula, for the units tooltip and the ribbon's row |
| `.../ui/hud-overhaul-military.js` | combat strength, by Drongo's formula, as a row in the leader ribbon, through the ribbon's own data |
| `.../ui/hud-overhaul-religion-row.js` | each leader's religion and its share of the world as a row in the leader ribbon, through the ribbon's own data |
| `.../ui/hud-overhaul-ideology-row.js` | each leader's ideology as a row in the leader ribbon in the Modern Age, through the ribbon's own data |
| `.../ui/hud-overhaul-drongo.js` | the leader ribbon with Drongo's Leader Ribbons, which replaces the game's ribbon files, and its option; only while that mod is on |
| `.../text/en_us/InGameText.xml` | all the text players see: options, pills, tooltips and the World Tracker |
| `mod/top-bar-tooltips/` | Pablo's Top Bar and Tooltips: only its modinfo, its `hud-overhaul-edition.js` and its option headings |
| `tools/build-top-bar.mjs` | builds Pablo's Top Bar and Tooltips in `build/top-bar-tooltips` from both folders |
| `tools/mock/` | browser mocks and their fixtures |
| `tools/live/measure.js` | run in a running game, reports where each HUD piece sits |
| `tools/live/capture.js` | run in a running game, captures the mocks' cases: the top bar, a ribbon entry and every tooltip, with this mod's stylesheets |
| `workshop/description.txt` | the Steam Workshop description, in Steam's BBCode |
| `workshop/top-bar-tooltips/` | Pablo's Top Bar and Tooltips' Workshop description, preview image and gallery, a screenshot per tooltip |
| `workshop/preview.jpg` | the Steam Workshop preview image, 560px square |
| `docs/images/` | the README's screenshots, which also go in the Workshop gallery |
| `reference` | gitignored link to the game's resources folder |

## Pablo's Top Bar and Tooltips

A second mod with the top bar's pills and tooltips only, built from the
same scripts. Its folder holds only what differs; the build copies each file
its modinfo lists from there, or else from `mod/hud-overhaul/`:

```bash
node tools/build-top-bar.mjs
civ7lab mod install build/top-bar-tooltips
```

Run the build again after every change to a shared file. In it,
`FULL` from `hud-overhaul-edition.js` is false: the parts are the top bar
and the tooltips, with their sizes and no switches, and settings are kept
under its own key. Its modinfo loads nothing while HUD Overhaul is on, so
the two never run together.

## How the game builds the screen

- **Template**: `Base/modules/base-standard/ui/root-game.html`, `<template
  class="world">`. Nine `fxs-slot` elements, named by corner, plus two side
  panels.
- **Slot positions**: `.harness > .top`, `.left` and so on, in
  `core/ui/themes/default/default.css`. Plain absolute positioning.
- **Components**: custom elements inside the slots, such as
  `panel-yield-banner`, `panel-sub-system-dock`, `panel-mini-map`,
  `unit-actions`, `panel-action` and `panel-notification-train`.
- **Rebuilds**: every view change empties the harness and refills it from
  the template, so a piece added or moved on screen is lost. The World
  Tracker's slot is added to the template itself, and the styles go in
  `<head>`, which is not rebuilt.

## Other mods

The README's Compatibility section lists the mods checked with this one.
The fixes for them:

- **Drongo's Leader Ribbons**: `hud-overhaul-drongo.js`. That mod replaces
  the game's ribbon files, so the script patches its ribbon's methods and
  undoes its sizes. It runs only when `Modding.getActiveMods()` has the
  mod's id.
- **Map Trix**: `hud-overhaul-pills.js`. Its pills are keyed on a class on
  `<body>`; each pill rule here names the harness and the bar's content to
  outrank them.
- **Ready or Not**: `hud-overhaul-layout.js`. It makes the policies button a
  ring (`ring-gov`), which gets rules of its own in the dock row.
- **No Gradients**: `hud-overhaul-theme.js`. It forces the top bar's
  background with `!important`, so the top bar rule uses it too.

To check a mod, read the files it imports and the selectors it styles
against the ones this mod changes: a file at a base game path replaces the
game's own, and a more specific or `!important` rule wins over ours.

## The browser mocks

The renderers have no game code in them, so layouts can be worked on in a
browser. The mocks are served with
[civ7lab](https://github.com/don-pablo-bablo/civ7lab). The ribbon and
tooltips mocks also need the game's own stylesheets: link the game's
resources folder, the one that contains `Base`, as `reference` in the repo
root.

Run these from the repo root:

```bash
# The whole screen as a wireframe, per layout in tools/mock/hud-layouts.js
civ7lab mock serve --root . --renderer tools/mock/hud-render.js --fixtures tools/mock/layout-fixtures.js --open
# The World Tracker
civ7lab mock serve --root . --renderer mod/hud-overhaul/ui/hud-overhaul-tracker-render.js --fixtures tools/mock/tracker-fixtures.js --open
# The yield pills
civ7lab mock serve --root . --renderer mod/hud-overhaul/ui/hud-overhaul-pills.js --fixtures tools/mock/pills-fixtures.js --open
# The leader ribbon
civ7lab mock serve --root . --renderer mod/hud-overhaul/ui/hud-overhaul-ribbon.js --fixtures tools/mock/ribbon-fixtures.js --open
# Every tooltip, hovered beside locked
civ7lab mock serve --root . --renderer tools/mock/tooltips-render.js --fixtures tools/mock/tooltips-fixtures.js --open
```

The layout and tracker fixtures are invented. The pills, ribbon and
tooltips fixtures are HTML captured from a running game. The tooltips are
drawn from the game's data as they are drawn, so their mock shows them as
captured: after a change to one, capture again to see it. With the game
running and on its map, from the repo root:

```bash
civ7lab live eval --file tools/live/capture.js > capture.json
node tools/mock/write-fixtures.mjs capture.json
```

That writes `tools/mock/captured.js`, which the pills, ribbon and tooltips
fixtures read, each adding it as a case of its own.

Check layout changes in game as well. Sprites are `blp:` images the browser
cannot load, so the mocks draw flat stand-ins.

## Code rules

- **Log and bail, never throw**: a throw during load takes other scripts with
  it. `console.error` reaches UI.log; `console.log` does not. Tag log lines
  `[hud-overhaul]`.
- **Build stamps**: each script that runs on its own has a `BUILD` constant that its "loaded"
  line in UI.log prints. Bump it on every edit to that file, and
  `civ7lab logs stamps` shows which build ran.
- **Load-time code**: a new top-level constant, rule or listener only takes
  effect after a game restart. So does a new file or a modinfo change.
- **Imports**: most scripts import from the game with relative paths
  (`../../core/...`), so the scripts must stay exactly one folder below the
  mod root.
- **Off switch**: the option that turns the mod off reaches only what goes
  through `hud-overhaul-settings.js`. Put every stylesheet in with
  `setStyle`, and add every element the mod puts on the page to `HIDE`
  there, or it stays while the mod is off.
- **Sizes**: px measured at 1080p, written as rem (1rem = 18px there), so they
  scale with the game's UI.
- **Text sizes**: px at the game's Small text size plus `textOffset()` from
  `hud-overhaul-settings.js`, so they follow the text size in Options >
  Accessibility. Rebuild the stylesheet on `onTextSize`.
- **Player sizes**: a part of the HUD with a size slider reads it with
  `size()` and rebuilds its stylesheet on `onSize`, both in
  `hud-overhaul-settings.js`. 1 is the mod's own size, so at 100% the
  stylesheet must come out as it would without the slider.
- **Parts**: a script for a part the player can switch off (`PARTS` in
  `hud-overhaul-settings.js`) checks `partOn()` and follows `onPart`. While
  its part is off, it leaves the game's own in place, and the elements it
  adds are hidden through `HIDE`. An option for that part goes in the parts
  group with `part` set, so it shows under the part's switch.
- **Settings**: read and written only through `hud-overhaul-settings.js`.
  They are kept in localStorage's `modSettings` entry under the key
  `hud-overhaul`. The game's localStorage returns the first stored entry
  whatever key is asked for, so a mod that adds a key of its own breaks every
  mod that reads `modSettings`. Never add another key.
- **Colours**: the top bar's and the plates' backgrounds come from
  `hud-overhaul-theme.js` only. Another stylesheet that sets them will fight
  the player's choice.
- **Version**: a modinfo `version` starting with 0 makes the game list the mod
  but never load it.
- **Italics**: do not use them. The game's fonts have no italic face and
  italic text does not render at all.
- **Text keys**: use the game's key where the game already has the words,
  as it translates them; the mods' own text is English only.
  `node tools/check-text.mjs` checks that every key a script uses has text,
  the mods' own or the game's in `tools/game-keys.txt`, and that every key of
  the mods' own is used. CI runs it on every push.

## Before a release

- Run `node tools/check-text.mjs --game <the game's resources folder>`, or
  without `--game` when `reference/` links there. It also checks the game
  keys against the game, with `--write` to refresh `tools/game-keys.txt`
  after a game patch, and fails on text of the mods' own that the game has
  too. Switch each to the game's key, or list it in `tools/own-text.txt`
  with why it stays. It ends with the game's yield labels that have no text,
  which the tooltips show as Other.
- Bump `version` in the modinfo.
- If the README's player-facing text changed, update
  `workshop/description.txt` to match. It follows the README's feature
  sections, without the per-pill details, the options or the links, and
  lists the compatible mods by name only: Steam allows 8,000 characters.
  Change `workshop/top-bar-tooltips/description.txt` too when the text is
  about the pills or the tooltips.
- Upload only `mod/hud-overhaul/`, through the same Workshop item.
- For Pablo's Top Bar and Tooltips, bump `version` in its modinfo, build it,
  and upload `build/top-bar-tooltips/` through its own Workshop item, with
  the gallery from `workshop/top-bar-tooltips/gallery/`.
- Each mod's release notes list only what its players see change. A fix to
  the World Tracker goes in HUD Overhaul's alone; one to a tooltip goes in
  both. Code moved between files and tools changes go in neither.

## Writing style

This applies to docs, comments, commit messages and the text players see in
the options.

Plain English, blunt, short. If ten words will do, do not write a hundred. The
reader is busy and wants the important bits. The prose stays neutral
international English. Avoid buzzwords and jargon unless there is no other way
to say it.

- **Em-dashes**: do not use them. Use a colon, a semicolon or a separate
  sentence.
- **Contrasts**: do not over-use "X, not Y". Vary it with "rather than",
  "instead of" or a plain restatement.
- **Asides**: keep brackets rare. Move a secondary thought into its own
  sentence. Terse labels in reference tables are fine.
- **Headings**: sentence case. Write bulleted definitions as
  **term**: description.
- **Program output**: quote it verbatim, including punctuation and symbols.
- **Filler**: every sentence must add a fact, an example or a consequence.
  Do not write meta-framing such as "X is the default; Y is the exception".
  State the rule and give the case.
- **Names**: do not name individual people in the code, docs or commits.

## Commit messages

Plain English, imperative mood, no Conventional Commit prefixes. A subject line
is often the whole message. Add a body only when the reason is not obvious,
and keep it to a sentence or two. Do not write bulleted essays or restate the
diff.
