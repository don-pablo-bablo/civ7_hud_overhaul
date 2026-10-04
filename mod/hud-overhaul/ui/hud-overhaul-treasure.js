// Treasure convoys in the top bar, in the Exploration Age: a pill with the
// turns to the soonest convoy, and a tooltip with each settlement making
// them. It shows all through the age, "-" until a settlement makes them.
//
// A settlement makes convoys when the commerce screen says so
// (commerce-screen-model.js): its convoy points, from improved treasure
// resources and from effects that make convoys on their own, are above 0.
// Its treasure resources, the gold and GDP each convoy brings and the
// turns between convoys come from the same place.
//
// It goes in the slot the top bar keeps for mods, through ModdingRegistry,
// as hud-overhaul-yields.js does. It is the game's yield-bar-entry, so it is
// styled as the other pills, but its text is a span of its own: the entry
// only writes numbers. Clicking it opens the commerce screen's treasure tab.
//
// An option in Options > Add-ons turns it off.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { COMMERCE_TABS, openCommerce } from "./hud-overhaul-commerce.js";
import { addOptions, OPTION_GROUPS, readSettings, setStyle, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "10";
const COMPONENT = "hud-overhaul-treasure";
const ENTRY = "hud-overhaul-treasure-entry";
const TEXT = "hud-overhaul-treasure-text";

const STYLES = `
${COMPONENT} { display: flex; }
${COMPONENT}.hud-overhaul-off { display: none; }
.${ENTRY} { color: rgb(232, 206, 150); }
.${TEXT} { white-space: nowrap; }
`;

// The pill's data-icon, which hud-overhaul-tooltips.js finds it by. It is
// the badge the map and the commerce screen give treasure resources in the
// Distant Lands, the ones that make convoys, and stands for convoys
// throughout this mod.
export const ICON = "RESOURCECLASS_TREASURE_FLEET";

// Whether convoys are made in this age.
export function convoyAge() {
	return Game.age == Game.getHash("AGE_EXPLORATION");
}

// A settlement's treasure resources: [{ definition, improved }]. Only
// improved ones, with their improvement not pillaged, load convoys.
function treasureResources(city) {
	const list = [];
	for (const index of city.getPurchasedPlots?.() ?? []) {
		const { x, y } = GameplayMap.getLocationFromIndex(index);
		const definition = GameInfo.Resources.lookup(GameplayMap.getResourceType(x, y));
		if (definition?.ResourceClassType != "RESOURCECLASS_TREASURE") continue;
		const damaged = MapConstructibles.getHiddenFilteredConstructibles(x, y).some((id) => Constructibles.getByComponentID(id)?.damaged);
		list.push({ definition, improved: MapCities.getDistrict(x, y) != null && !damaged });
	}
	return list;
}

function makesConvoys(city) {
	const res = city.Resources;
	return !!res && !!city.isDistantLands && res.getProducedTreasureFleetPoints() + res.getAutoTreasureFleetValue() > 0;
}

// Each settlement making convoys, soonest first: { city, turns, goal, gold,
// gdp, resources }, goal being the turns between its convoys and gold and
// gdp what each brings home. hud-overhaul-tooltips.js lists them too.
export function convoys(player) {
	const list = [];
	for (const city of player.Cities?.getCities() ?? []) {
		if (!makesConvoys(city)) continue;
		const res = city.Resources;
		list.push({
			city,
			turns: res.getTurnsUntilTreasureGenerated(),
			goal: Game.Diplomacy.modifyByGameSpeed(res.getGlobalTurnsUntilTreasureGenerated()),
			gold: res.getProducedTreasureFleetGold(),
			gdp: res.getProducedTreasureFleetGDP(),
			resources: treasureResources(city),
		});
	}
	return list.sort((a, b) => a.turns - b.turns);
}

// Each settlement with treasure resources that makes no convoys:
// { city, resources, distant }, distant being whether it is in the Distant
// Lands, where its resources are only waiting to be improved.
export function idleTreasure(player) {
	const list = [];
	for (const city of player.Cities?.getCities() ?? []) {
		if (makesConvoys(city)) continue;
		const resources = treasureResources(city);
		if (resources.length) list.push({ city, resources, distant: !!city.isDistantLands });
	}
	return list;
}

// Each one on screen, for the option to update at once.
const attached = new Set();

class Treasure extends Component {
	entry = null;
	text = null;
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} treasure: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		// hud-overhaul-rows.js moves the pill into its place, which attaches it
		// again; it keeps the entry it has.
		if (!this.entry) {
			this.entry = document.createElement("yield-bar-entry");
			this.entry.dataset.icon = ICON;
			this.entry.classList.add(ENTRY);
			this.entry.addEventListener("action-activate", () => openCommerce(COMMERCE_TABS.treasure));
			this.text = document.createElement("span");
			this.text.classList.add(TEXT);
			this.entry.appendChild(this.text);
			this.Root.appendChild(this.entry);
		}
		attached.add(this);
		this.onUpdate();
		// In case the game draws the entry after this frame.
		requestAnimationFrame(this.onUpdate);
		engine.on("PlayerTurnActivated", this.onUpdate);
		engine.on("CityAddedToMap", this.onUpdate);
		engine.on("CityRemovedFromMap", this.onUpdate);
		engine.on("ConstructibleAddedToMap", this.onUpdate);
	}

	onDetach() {
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("CityAddedToMap", this.onUpdate);
		engine.off("CityRemovedFromMap", this.onUpdate);
		engine.off("ConstructibleAddedToMap", this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}

	update() {
		// The game's entry adds its icon's colour class from a list that
		// lacks this one, so it adds the class "undefined".
		this.entry.classList.remove("undefined");
		// The game draws the entry's icon and its own empty text after this
		// adds its text, and the game's UI ignores CSS order, so the text is
		// moved back to the end.
		if (this.entry.lastChild !== this.text) this.entry.appendChild(this.text);
		const player = Players.get(GameContext.localObserverID);
		const on = enabled() && !!player && convoyAge();
		this.Root.classList.toggle("hud-overhaul-off", !on);
		if (!on) return;
		const list = convoys(player);
		this.text.textContent = list.length ? Locale.compose("LOC_HUD_OVERHAUL_TREASURE_TURNS", list[0].turns) : "-";
		const lines = list.map(({ city, turns }) => Locale.compose("LOC_HUD_OVERHAUL_TREASURE_LINE", city.name, turns));
		this.entry.dataset.tooltipContent = [Locale.compose("LOC_HUD_OVERHAUL_TREASURE_TITLE"), ...lines].join("[N]");
	}
}

function enabled() {
	return readSettings().treasure !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-treasure",
			label: "LOC_HUD_OVERHAUL_OPTION_TREASURE",
			description: "LOC_HUD_OVERHAUL_OPTION_TREASURE_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("treasure", !!value);
				} catch (error) {
					console.error(`${TAG} treasure: cannot save setting: ${error}`);
				}
				for (const pill of attached) pill.onUpdate();
			},
		},
	], "treasure");
}

try {
	setStyle("hud-overhaul-treasure", STYLES);
	Controls.define(COMPONENT, { createInstance: Treasure });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} treasure: option not added: ${error}`));
	console.error(`${TAG} treasure loaded, civ7lab:build treasure ${BUILD}`);
} catch (error) {
	console.error(`${TAG} treasure: ${error}`);
}
