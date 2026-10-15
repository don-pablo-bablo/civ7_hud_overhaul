# Pablo's HUD Overhaul

This mod reworks the main game screen, drawing on Civilization VI and on
popular UI mods for Civ VI and VII. It does three things:

- **Less wasted space**: oversized elements are smaller and sit flush with
  the screen's edges. They still follow the game's text size and UI scaling,
  and each can be made bigger or smaller, or given back to the game.
- **More information at a glance**: the top bar gains pills for food,
  production, your units, happiness levels, trade routes, resources,
  treasure convoys, great works, religion and victory standings.
- **Compact and detailed tooltips**: hover a pill for a summary, or click it
  for a complete breakdown, settlement by settlement and source by source.
  Your whole game is there from the main screen.

It aims to work alongside other UI mods: see [Compatibility](#compatibility)
for the ones tested with it.

Only want the pills and tooltips? See
[Pablo's Top Bar and Tooltips](#pablos-top-bar-and-tooltips).

Want to know where a tile's yields come from as well?
[Pablo's Better Yield Tooltip](https://steamcommunity.com/sharedfiles/filedetails/?id=3809254963)
breaks them down when you hover a tile.

**Before**

![The game's own HUD over a city](docs/images/before-full-screen.png)

**After**

![HUD Overhaul over the same city](docs/images/after-full-screen.png)

## Top bar, dock and Journal

**Before**

![The game's top bar, dock and Journal](docs/images/before-top-bar-rings-journal.png)

**After**

![HUD Overhaul's top bar, dock, World Tracker and Journal](docs/images/after-top-bar-rings-journal.png)

### Two rows of pills

The top bar's text is smaller, and it adds these to the game's gold,
science, culture, happiness, influence and settlements:

- Celebrations, in the happiness pill
- Food
- Production
- Cities and towns, with your population, in the settlements pill
- Units, military and civilian
- Happiness levels of your settlements
- Trade routes
- Resources
- Treasure convoys
- Great works
- Religion
- Victory standings

The pills sit on two rows, with room between them, or on one row if you
choose. On a small screen, with large text or with a bigger top bar, any
that do not fit go on another row; turn off the ones you need least to keep
them on fewer. Religion and treasure convoys show only
when they apply. [Tooltips](#tooltips) has what each one shows.

### Dock and Journal on a panel

The dock's rings sit smaller and in a line under the top bar. The dock, with
its rings and screen buttons, and the Journal sit on a panel, so they stand
out from the map. The Journal scrolls when its quests do not fit, and hides
when it has none.

### World Tracker

Straight from Civ VI: your current research and civic under the dock, with
a progress bar and the turns left. Click a row to choose the next one, or
the +/- on the heading to collapse it. You can show the World Tracker, the
dock's research and civic rings, or both.

## Leader ribbon

| Before | After |
| --- | --- |
| ![The game's leader ribbon](docs/images/before-ribbon.png) | ![HUD Overhaul's leader ribbon](docs/images/after-ribbon.png) |

The leader ribbon moves into the top right corner, as in Civ VI, smaller and
with no gaps between leaders. Your own leader stays in the corner, and each
leader you meet lines up to the left. Each leader's yields sit straight
under the portrait, with their civ's symbol below, and you choose when they
show.

It adds rows for combat strength, religion with its share of the world, and
in the Modern Age ideology. War support is a larger badge on the portrait's
corner.

Combat strength uses the formula from
[Drongo's Leader Ribbons](https://steamcommunity.com/sharedfiles/filedetails/?id=3734152860),
with thanks to its author, Drongo from One More Turn, so both mods show the
same value. Each unit that can attack counts 4 to the power of its best
strength divided by 17, so a unit 17 points stronger counts four times as
much. This gives strong units more weight than adding the strengths up
would, as in combat a few strong units can beat many weak ones.

## Minimap and turn dial

| Before | After |
| --- | --- |
| ![The game's minimap](docs/images/before-minimap.png) | ![HUD Overhaul's minimap](docs/images/after-minimap.png) |
| ![The game's turn dial](docs/images/before-action-dial.png) | ![HUD Overhaul's turn dial](docs/images/after-action-dial.png) |

The minimap and the turn dial are smaller and sit flush in the bottom
corners, as do the notifications above the dial.

## Themes and transparency

Don't like the panel colour from the main Civ VII theme? Choose another,
such as Civ VI blue or my favourite, verdigris. You also set how much of the
map shows through the top bar, the other panels and the leader ribbon, each
on its own. Some themes look best at a lower opacity. See [Options](#options).

**Civ VI blue**

![The Civ VI blue theme](docs/images/civ6-blue-theme.png)

**Verdigris**

![The verdigris theme](docs/images/verdigris-theme.png)

## Tooltips

Hover a pill for its compact tooltip: where a yield comes from, settlement
by settlement, with the treasury, current research or next celebration.
Each settlement has an icon for a capital, city or town.

Click the pill, or press the tooltip inspect key, K by default, for its
detailed tooltip, and again to close it. It breaks each settlement's yield
down by source, specialists and upkeep included, with a bar for its share,
red for a loss. In a detailed tooltip, click:

- **the title and values** to open the screen the pill used to open, such
  as the yields report;
- **a settlement, or any line under it,** to move the map there, or for a
  trade route, to the settlement it trades with;
- **a victory's leaders** to open its tab on the victories screen;
- **a unit** to select it and move the camera to it;
- **a group's heading**, such as Cities or a victory, to close or open it.

While a detailed tooltip is open, the other pills show no tooltip on hover,
so nothing pops up behind it. Click another pill to open its detailed
tooltip instead.

Each detailed tooltip is below, in the top bar's order.

### Gold

Your treasury and gold per turn, each settlement's gold by source, and the
empire's own income and maintenance.

![The gold pill's detailed tooltip](docs/images/gold-tooltip.png)

### Science

Science per turn and your current research with the turns left, then each
settlement's science by source.

![The science pill's detailed tooltip](docs/images/science-tooltip.png)

### Culture

Culture per turn and your current civic with the turns left, then each
settlement's culture by source.

![The culture pill's detailed tooltip](docs/images/culture-tooltip.png)

### Happiness and celebrations

Happiness per turn and the turns to the next celebration, or the turns left
in the one running, then each settlement's happiness by source.

![The happiness pill's detailed tooltip](docs/images/happiness-tooltip.png)

### Influence

Your influence and influence per turn, by settlement and from the empire.

![The influence pill's detailed tooltip](docs/images/influence-tooltip.png)

### Food

Food for your whole empire, then each settlement's food by source.

![The food pill's detailed tooltip](docs/images/food-tooltip.png)

### Production

Production for your whole empire, then each settlement's production by
source.

![The production pill's detailed tooltip](docs/images/production-tooltip.png)

### Settlements

The pill splits the count into cities and towns, "3 + 4/6", with your
population after it. It turns red when you are over the cap, and shows the
happiness each settlement loses for it: "3 + 5/6 (-10 each)". For a civ with
a limit on cities, such as Carthage, the cities show against it, "1/1 +
2/4", in gold once towns can no longer become cities. The detailed tooltip
gives each town's focus and each settlement's growth, urban and rural
population and specialists.

![The settlements pill's detailed tooltip](docs/images/settlements-tooltip.png)

### Units

Your military units and your civilians. The compact tooltip gives your
combat strength, then your land, naval and air units and your civilians by
kind. The detailed one lists each unit with the settlement it is in, its
health, moves and strength, and each commander's army slots, in yellow while
some are open. An arrow shows the units in an army. Trade ships and caravans
are left out, as they take no orders.

![The units pill's detailed tooltip](docs/images/units-tooltip.png)

### Happiness levels

How many of your settlements are ecstatic, joyous, happy, unhappy and
angry, with their names in the tooltip.

![The happiness levels pill's detailed tooltip](docs/images/happiness-levels-tooltip.png)

### Trade routes

Routes in use against the limit with every leader and city-state you have
met, as Civ VI showed them. The tooltip lists each route with the resources
it brings, each leader's and city-state's routes, and the settlements you
could trade with now, or why you cannot.

![The trade routes pill's detailed tooltip](docs/images/trade-routes-tooltip.png)

### Resources

How many empire, city and bonus resources you hold, and treasure and
factory ones when you have any. Treasure is split into the homeland ones and
the Distant Lands ones, which make convoys. The tooltip lists each one,
where it is assigned and what it does.

![The resources pill's detailed tooltip](docs/images/resources-tooltip.png)

### Treasure convoys

In the Exploration Age, the turns to your next convoy. The tooltip gives
what your convoys bring home in gold and GDP, and each settlement that makes
them, with a bar to its next one. The detailed one adds each settlement's
treasure resources, grey while unimproved, and the settlements whose
treasure resources make no convoys, with why.

![The treasure convoys pill's detailed tooltip](docs/images/treasure-convoys-tooltip.png)

### Great works

How many great works you have against your slots for them, "7/3". The
tooltip lists where each one is displayed, what it yields and which are in
storage.

![The great works pill's detailed tooltip](docs/images/great-works-tooltip.png)

### Religion

In the Exploration Age, and later if you founded one, the share of the
world's settlements following your religion. The tooltip lists your
beliefs, each of your settlements' urban and rural people and their
religion, and every religion's share of the world.

![The religion pill's detailed tooltip](docs/images/religion-tooltip.png)

### Victory standings

Your place in the military, cultural, economic and scientific victories.
The tooltip gives each one's leaders and points, and who is close to
winning.

![The victory standings pill's detailed tooltip](docs/images/victories-tooltip.png)

## Options

All in **Options > Add-ons**, in three groups. Changes show at once.

- **Pablo's HUD Overhaul**:
  - **Enable HUD Overhaul**: turn it off to see the game's own HUD, and on again.
    Your other choices are kept.
  - **Theme**: the colour of the top bar, the dock, the World
    Tracker, the Journal and the leader ribbon's backing. Civ VII brown, the
    game's own; Civ VI blue, with a navy top bar; charcoal; walnut;
    verdigris; or black. Or a stronger colour with a thin trim under the top
    bar: crimson, royal purple, jade, ocean, bronze, slate and copper,
    forest, or ink and silver. Many of these look best at a lower opacity.
  - **Top bar opacity** and **Panel opacity**: how much of the map shows
    through the top bar, and through the dock, the World Tracker and the
    Journal. Each goes from fully clear to fully solid.
- **Pablo's HUD Overhaul: Size and layout**: each part of the screen on or
  off, and its size. Turn off a part to use the game's version instead, and
  its other options hide. Sizes go from 75% to 150% of the mod's default,
  and each slider says what the base game's size is, such as 125% for the
  turn dial.
  - **Top bar size**: the pills, and the turn and date at the top right.
  - **Detailed tooltips**, with **Tooltip size**: off, the pills show the
    game's text tooltips.
  - **Rings and World Tracker**, with the size of each and **World
    Tracker**: where your research and civic show. Both, in the World
    Tracker and in the research and civic rings at the top of the dock; the
    World Tracker only, with the rings hidden; or the rings only, with the
    World Tracker hidden. Off, the game's own dock and Journal.
  - **Leader ribbon**, with its size and **Leader ribbon opacity**, how
    much of the map shows through its backing. **Leader ribbon yields**:
    when each leader's yields show. On hover, as in the base game; yours
    always and the others on hover, as in Civilization VI; or always for
    everyone. **With Drongo's Leader Ribbons**: only with that mod on. See
    [Compatibility](#compatibility). Off, the game's own ribbon, or
    Drongo's.
  - **Minimap**, with its size.
  - **Turn dial and notifications**, with the size of each.
- **Pablo's HUD Overhaul: Top bar**: **Top bar rows**, one or two, and each
  of the added pills on or off. See [Two rows of pills](#two-rows-of-pills).

## Pablo's Top Bar and Tooltips

[Pablo's Top Bar and Tooltips](https://steamcommunity.com/sharedfiles/filedetails/?id=3820425965)
is a second mod with only the top bar's pills and their tooltips, for
players who want those without the rest of the overhaul. It adds the same
pills and detailed tooltips to whatever top bar you have, the game's own or
another mod's, and leaves the dock, the leader ribbon, the minimap and the
turn dial as they are. Its tooltips start bigger, to suit the game's own top
bar.

Its options, in **Options > Add-ons**:

- **Pablo's Top Bar and Tooltips: Size**: **Top bar size** and **Tooltip
  size**, from 75% to 150%.
- **Pablo's Top Bar and Tooltips: Pills**: **Top bar rows**, one or two, and
  each of the added pills on or off.

It does nothing while Pablo's HUD Overhaul is on, which has all of it. Its
settings are its own, so switching between the two keeps each one's choices.

It has been played with all of these enabled at once:

- **[Map Trix](https://steamcommunity.com/sharedfiles/filedetails/?id=3507072814)**:
  its option for coloured top bar entries gives way to these pills.
- **[No Gradients](https://steamcommunity.com/sharedfiles/filedetails/?id=3509395646)**:
  it still removes the screen's vignette, and the pills sit on its top bar.
- **[Readable Happiness Icons](https://steamcommunity.com/sharedfiles/filedetails/?id=3750888105)**:
  its icons for each happiness level show in the happiness levels pill and
  its tooltip.

## Compatibility

HUD Overhaul changes the top bar, the dock, the leader ribbon, the minimap
and the turn dial. Other mods that change the same parts can clash with it.
It has been played with all of these enabled at once.

Adjusted to work together:

- **[Drongo's Leader Ribbons](https://steamcommunity.com/sharedfiles/filedetails/?id=3734152860)**:
  the ribbon keeps Drongo's order, its extra rows behind the +/- button and
  its combat strength, at HUD Overhaul's size in the corner. Drongo's combat
  strength row takes the place of HUD Overhaul's, which gives the same
  value. The **With Drongo's Leader Ribbons** option picks this or HUD
  Overhaul's own ribbon with every row in one list. To use Drongo's ribbon
  unchanged, turn off **Leader ribbon**, in case an update to either mod
  clashes.
- **[Map Trix](https://steamcommunity.com/sharedfiles/filedetails/?id=3507072814)**:
  its option for coloured top bar entries gives way to HUD Overhaul's pills
  while HUD Overhaul is on.
- **[Ready or Not](https://steamcommunity.com/sharedfiles/filedetails/?id=3507454171)**:
  its policies ring sits in line with the tech and civic rings, at their
  size. Its icons for free slots and resources show as it intends.
- **[No Gradients](https://steamcommunity.com/sharedfiles/filedetails/?id=3509395646)**:
  it still removes the screen's vignette, and the top bar keeps HUD
  Overhaul's colour and opacity.

No changes needed:

- **[Readable Happiness Icons](https://steamcommunity.com/sharedfiles/filedetails/?id=3750888105)**:
  its icons for each happiness level show in the happiness levels pill and
  its tooltip.
- **[Demographics](https://steamcommunity.com/sharedfiles/filedetails/?id=3737200066)**
  and **[Drongo's Wonder Screen](https://steamcommunity.com/sharedfiles/filedetails/?id=3734274579)**:
  their dock buttons line up with the others. Demographics has an optional
  storage repair that clears other mods' saved settings, HUD Overhaul's
  included; it runs only when you press it, and says first what it clears.
- **[Detailed Map Tacks](https://steamcommunity.com/sharedfiles/filedetails/?id=3507297712)**
  and **[REWIND: Replay Map History](https://steamcommunity.com/sharedfiles/filedetails/?id=3759409080)**:
  their minimap buttons shrink with the minimap.
- These change other parts of the screen:
  **[City Hall](https://steamcommunity.com/sharedfiles/filedetails/?id=3507102289)**,
  **[Pablo's Better Yield Tooltip](https://steamcommunity.com/sharedfiles/filedetails/?id=3809254963)**,
  **[Leugi's Diplomacy Icon Tweaks](https://steamcommunity.com/sharedfiles/filedetails/?id=3616394832)**,
  **[Friends and Rivals](https://steamcommunity.com/sharedfiles/filedetails/?id=3625755403)**,
  **[Flag Corps](https://steamcommunity.com/sharedfiles/filedetails/?id=3507103281)**,
  **[Resource Re-sorts](https://steamcommunity.com/sharedfiles/filedetails/?id=3507102808)**,
  **[Resource Page Warehouse Indicator](https://steamcommunity.com/sharedfiles/filedetails/?id=3649379621)**,
  **[Leonardfactory's Policy Yield Previews](https://steamcommunity.com/sharedfiles/filedetails/?id=3515801789)**,
  **[MantisMaestro's Compact Production Chooser](https://steamcommunity.com/sharedfiles/filedetails/?id=3507064673)**,
  **[Zatygold's Town Focus Info](https://steamcommunity.com/sharedfiles/filedetails/?id=3548476215)**,
  **[Drongo's Syncretism Revealer](https://steamcommunity.com/sharedfiles/filedetails/?id=3735281916)**,
  **[Discovery Lens](https://steamcommunity.com/sharedfiles/filedetails/?id=3508749073)**,
  **[Concise Specialists Lens](https://steamcommunity.com/sharedfiles/filedetails/?id=3506915277)**,
  **[More Lenses](https://steamcommunity.com/sharedfiles/filedetails/?id=3526524592)**,
  **[Improved Archaeology Lens](https://steamcommunity.com/sharedfiles/filedetails/?id=3660393011)**,
  **[Ends Movement Highlights](https://steamcommunity.com/sharedfiles/filedetails/?id=3751330962)**,
  **[Orion's Bonus Icons+](https://steamcommunity.com/sharedfiles/filedetails/?id=3610524341)**,
  **[Orion's Civilopedia+](https://steamcommunity.com/sharedfiles/filedetails/?id=3640054014)**,
  **[Mattifus's Memento Editor](https://steamcommunity.com/sharedfiles/filedetails/?id=3508036392)**
  and **[nasuellia-non-sticky-selection](https://steamcommunity.com/sharedfiles/filedetails/?id=3535775470)**.

## Saves

The mod only changes the interface. You can add it to a game in progress or
remove it without breaking the save.

## AI use

Claude Code was used to help create this mod.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT. See [LICENSE](LICENSE).
