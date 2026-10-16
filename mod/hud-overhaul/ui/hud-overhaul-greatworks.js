// Great works in the top bar: a pill with the dock's great works icon and
// how many works the empire has, on display or in storage, against its
// slots: "7/3" says it needs more buildings with slots. Its tooltip, in
// hud-overhaul-tooltips.js, lists where they are and what they yield.
//
// The works are the great works screen's (model-great-works.js): each
// settlement's buildings with slots, from
// city.Constructibles.getGreatWorkBuildings(), and the works in storage,
// from player.Culture.getArchivedGreatWork().
//
// Clicked, it opens the great works screen, as the dock's button does.
//
// It goes in the slot the top bar keeps for mods, through ModdingRegistry,
// as hud-overhaul-resources.js does. It is the game's yield-bar-entry, so it
// is styled as the other pills, but the entry's own icon is hidden and the
// pill draws its own.
//
// An option in Options > Add-ons turns it off.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ContextManager } from "../../core/ui/context-manager/context-manager.js";
import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { addOptions, onTextSize, OPTION_GROUPS, readSettings, setStyle, textOffset, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "11";
const COMPONENT = "hud-overhaul-greatworks";
const ENTRY = "hud-overhaul-greatworks-entry";
const TEXT = "hud-overhaul-greatworks-text";
export const LEAD = "blp:sub_greatworks"; // the dock's great works button
const SCREEN = "screen-great-works";
// The pill's data-icon, which hud-overhaul-tooltips.js finds it by.
export const ICON = "HUD_OVERHAUL_GREAT_WORKS";

// The yields a great work can give, in the order shown.
export const WORK_YIELDS = ["YIELD_CULTURE", "YIELD_SCIENCE", "YIELD_GOLD", "YIELD_HAPPINESS", "YIELD_PRODUCTION", "YIELD_FOOD"];

// Artifact names are lower case in the game's text ("lamellar armor").
function capitalise(text) {
	return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

// { settlements: [{ name, slots, buildings: [{ type, name, slots,
// works, yields: {type: amount} }], yields }], stored, total, slots, filled,
// yields }, settlements with the most works first. Each work is { name,
// image }, the image the great works screen shows.
export function greatWorks(player) {
	const work = (index) => {
		const info = GameInfo.GreatWorks.lookup(Game.Culture.getGreatWorkType(index));
		return info ? { name: capitalise(Locale.compose(info.Name)), image: info.Image ?? "" } : null;
	};
	const stored = [];
	const culture = player.Culture;
	const archived = culture ? culture.getNumWorksInArchive() : 0;
	for (let i = 0; i < archived; i++) {
		const info = work(culture.getArchivedGreatWork(i));
		if (info) stored.push(info);
	}
	const yields = {};
	const settlements = [];
	for (const city of player.Cities?.getCities() ?? []) {
		const buildings = [];
		for (const building of city.Constructibles?.getGreatWorkBuildings() ?? []) {
			const instance = Constructibles.getByComponentID(building.constructibleID);
			const info = instance ? GameInfo.Constructibles.lookup(instance.type) : null;
			const works = building.slots.map((slot) => work(slot.greatWorkIndex)).filter((info) => info);
			const own = {};
			for (const type of WORK_YIELDS) {
				const amount = city.Constructibles.getBuildingYieldFromGreatWorks(YieldTypes[type], building.constructibleID);
				if (!amount) continue;
				own[type] = amount;
				yields[type] = (yields[type] ?? 0) + amount;
			}
			buildings.push({
				type: info?.ConstructibleType ?? "",
				name: info ? Locale.compose(info.Name) : "",
				slots: city.Constructibles.getNumGreatWorkSlots(building.constructibleID),
				works,
				yields: own,
			});
		}
		if (!buildings.length) continue;
		const own = {};
		for (const building of buildings) for (const [type, amount] of Object.entries(building.yields)) own[type] = (own[type] ?? 0) + amount;
		settlements.push({
			name: Locale.compose(city.name),
			location: city.location,
			isCapital: city.isCapital,
			isTown: city.isTown,
			slots: buildings.reduce((sum, building) => sum + building.slots, 0),
			works: buildings.reduce((sum, building) => sum + building.works.length, 0),
			buildings,
			yields: own,
		});
	}
	settlements.sort((a, b) => b.works - a.works || b.slots - a.slots);
	const filled = settlements.reduce((sum, settlement) => sum + settlement.works, 0);
	const slots = settlements.reduce((sum, settlement) => sum + settlement.slots, 0);
	return { settlements, stored, total: filled + stored.length, slots, filled, yields };
}

export function openGreatWorks() {
	ContextManager.push(SCREEN, { singleton: true, createMouseGuard: true });
}

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// The icon grows with the player's text size.
const styles = () => `
${COMPONENT} { display: flex; }
${COMPONENT}.hud-overhaul-off { display: none; }
.${ENTRY} { color: rgb(215, 195, 225); }
.${ENTRY} > img { display: none; }
.${TEXT} { display: flex; flex-direction: row; align-items: center; white-space: nowrap; }
panel-yield-banner .panel-yield__top-bar-content .${TEXT} img {
	width: ${rem(22 + textOffset())};
	height: ${rem(22 + textOffset())};
	margin-right: ${rem(4)};
}
`;

// Each one on screen, for the option to update at once.
const attached = new Set();

const EVENTS = ["PlayerTurnActivated", "GreatWorkCreated", "GreatWorkArchived", "GreatWorkMoved", "GreatWorkSlotCreated", "CityProductionCompleted"];

class GreatWorks extends Component {
	entry = null;
	text = null;
	count = null;
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} great works: ${error}`);
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
			this.entry.addEventListener("action-activate", openGreatWorks);
			this.text = document.createElement("div");
			this.text.classList.add(TEXT);
			const lead = document.createElement("img");
			lead.src = LEAD;
			this.count = document.createElement("span");
			this.text.append(lead, this.count);
			this.entry.appendChild(this.text);
			this.Root.appendChild(this.entry);
		}
		attached.add(this);
		this.onUpdate();
		// In case the game draws the entry after this frame.
		requestAnimationFrame(this.onUpdate);
		for (const name of EVENTS) engine.on(name, this.onUpdate);
	}

	onDetach() {
		for (const name of EVENTS) engine.off(name, this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}

	update() {
		// The game's entry adds its icon's colour class from a list that
		// lacks this one, so it adds the class "undefined".
		this.entry.classList.remove("undefined");
		// The game draws the entry's icon and its own empty text after this
		// adds its text, so the text is moved back to the end.
		if (this.entry.lastChild !== this.text) this.entry.appendChild(this.text);
		const player = Players.get(GameContext.localObserverID);
		const on = enabled() && !!player?.Cities;
		this.Root.classList.toggle("hud-overhaul-off", !on);
		if (!on) return;
		const { total, slots } = greatWorks(player);
		this.count.textContent = Locale.compose("LOC_HUD_OVERHAUL_GREAT_WORKS_COUNT", total, slots);
		// Text the game's tooltip can fall back on; hud-overhaul-tooltips.js
		// draws the detailed one.
		this.entry.dataset.tooltipContent = Locale.compose("LOC_UI_GREAT_WORKS_TITLE");
	}
}

function enabled() {
	return readSettings().greatWorks !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-great-works",
			label: "LOC_UI_GREAT_WORKS_TITLE",
			description: "LOC_HUD_OVERHAUL_OPTION_GREAT_WORKS_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("greatWorks", !!value);
				} catch (error) {
					console.error(`${TAG} great works: cannot save setting: ${error}`);
				}
				for (const pill of attached) pill.onUpdate();
			},
		},
	], "greatworks");
}

try {
	const restyle = () => setStyle("hud-overhaul-greatworks", styles());
	restyle();
	onTextSize(restyle);
	Controls.define(COMPONENT, { createInstance: GreatWorks });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} great works: option not added: ${error}`));
	console.error(`${TAG} great works loaded, civ7lab:build greatworks ${BUILD}`);
} catch (error) {
	console.error(`${TAG} great works: ${error}`);
}
