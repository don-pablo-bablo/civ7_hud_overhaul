// The settlement count in the top bar, split into cities and towns: the
// city and town icons with their counts, then a slot for each settlement
// the cap allows, then the empire's population after its icon. It turns
// red when the empire is over the cap, and adds the happiness each
// settlement loses for it: "(-10 each)".
//
// The slots fill with the cities, then the towns, each in the colour of
// its icon. Settlements over the cap are orange while every settlement
// still has 0 happiness or more, and red for those that took one below 0.
// Past the cap, faint orange slots show how many more settlements every
// settlement can take before one goes below 0.
//
// The penalty is the game's TRAIT_MOD_PENALTY_OVER_SETTLEMENT_CAP_SETTLEMENTS:
// for each settlement over the cap, every settlement loses 5 happiness, with
// no limit. The amount is read from that modifier, in case a mod changes it.
//
// The cap is the game's own yield-bar-entry. This marks it rather than
// replacing it: a class for the colour, and spans of its own after the
// game's text, which the game leaves alone when it rewrites the "8/6". For
// the split, the game's icon and text are hidden and a span shows the
// split instead.
// A hidden element in the top bar's mod slot, put there through
// ModdingRegistry, finds the entry each time the top bar is rebuilt. It
// also moves the entry into the mod slot, just before itself, so the
// settlements show after the empire's food and production.
//
// Some civs, such as Carthage, have a hard limit on cities, for which the
// game adds a City Limit pill of its own. With the split, that pill is
// hidden and the cities show against the limit instead: "1/1", gold at
// the limit, when towns can no longer become cities. Without the
// split, the game's pill moves to just after the settlements.
//
// Two options in Options > Add-ons turn the split and the warning off.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { addOptions, onTextSize, OPTION_GROUPS, readSettings, setStyle, textOffset, writeSetting } from "./hud-overhaul-settings.js";
import { FULL } from "./hud-overhaul-edition.js";

const TAG = "[hud-overhaul]";
const rem = (px) => `${(px / 18).toFixed(4)}rem`;
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "17";
const COMPONENT = "hud-overhaul-settlement-cap";
const OVER = "hud-overhaul-over-cap";
const PENALTY = "hud-overhaul-cap-penalty";
const SPLIT = "hud-overhaul-split"; // on the entry while the split shows
const COUNT = "hud-overhaul-settlement-count";
const POP = "hud-overhaul-settlement-pop";
const CITY = "hud-overhaul-settlement-city"; // the city icon
const TOWN = "hud-overhaul-settlement-town"; // the town icon
const SLOTS = "hud-overhaul-settlement-slots";
// A slot's class for each kind: a city, a town, over the cap, over and
// unhappy, room past the cap; an empty slot has none.
const SLOT = { city: CITY, town: TOWN, over: "hud-overhaul-slot-over", unhappy: "hud-overhaul-slot-unhappy", spare: "hud-overhaul-slot-spare" };
// The most faint slots past the cap, so very happy settlements do not
// stretch the bar. A "+" after them says there is more room; the tooltip
// gives the full count.
const MAX_SPARE = 5;
const MORE = "hud-overhaul-settlement-more";
const HIDDEN = "hud-overhaul-hidden";
const MODIFIER = "TRAIT_MOD_PENALTY_OVER_SETTLEMENT_CAP_SETTLEMENTS";

// The colours of the city and town icons and their slots, in the pill and
// its tooltip.
export const CITY_COLOUR = "rgb(150, 180, 215)";
export const TOWN_COLOUR = "rgb(235, 220, 185)";

// The icons' size and offsets that make them as tall as the digits, measured
// from screenshots at 1080p: the bar's text is 15px in HUD Overhaul and the
// game's 18px in the top bar mod (hud-overhaul-pills.js), and the game's
// pictures leave room around them. The population's picture sits higher in
// its square than the city's and town's. lead keeps the city's centre over
// the other pills' icons, which are 19px and the text size's offset.
const ICON = FULL ? { size: 17, top: 0, popTop: 1, lead: 1 } : { size: 20, top: -1, popTop: 0, lead: 0 };

// [data-icon] lifts these over the yield pills' colours. The icons are
// named under the bar's content to outrank the pills' icon size.
const styles = () => `
${COMPONENT} { display: none; }
panel-yield-banner yield-bar-entry.${OVER}[data-icon] {
	color: rgb(255, 170, 160);
	background-color: rgba(190, 40, 30, 0.35);
	border-color: rgba(230, 70, 60, 0.9);
}
panel-yield-banner yield-bar-entry.${OVER}[data-icon]:hover {
	background-color: rgba(190, 40, 30, 0.55);
}
.${PENALTY} { white-space: nowrap; margin-left: 0.2222rem; }
.${COUNT} { display: flex; flex-direction: row; align-items: center; white-space: nowrap; }
panel-yield-banner .panel-yield__top-bar-content .${COUNT} > img { width: ${rem(ICON.size + textOffset())}; height: ${rem(ICON.size + textOffset())}; margin: 0 ${rem(2)} 0 ${rem(5)}; position: relative; top: ${rem(ICON.top)}; }
panel-yield-banner .panel-yield__top-bar-content .${COUNT} > img:first-child { margin-left: ${rem(ICON.lead)}; }
.${COUNT} > img.${CITY} { filter: fxs-color-mask(${CITY_COLOUR}); }
.${COUNT} > img.${TOWN} { filter: fxs-color-mask(${TOWN_COLOUR}); }
.${SLOTS} { display: flex; flex-direction: row; align-items: center; margin-left: ${rem(7)}; }
.${SLOTS} > div { width: ${rem(5)}; height: ${rem(14)}; margin-right: ${rem(2)}; border-radius: ${rem(1)}; border: ${rem(1)} solid rgba(230, 210, 170, 0.5); }
.${SLOTS} > div.${CITY} { background-color: ${CITY_COLOUR}; border-color: ${CITY_COLOUR}; }
.${SLOTS} > div.${TOWN} { background-color: ${TOWN_COLOUR}; border-color: ${TOWN_COLOUR}; }
.${SLOTS} > div.${SLOT.over} { background-color: rgb(240, 150, 50); border-color: rgb(255, 190, 110); }
.${SLOTS} > div.${SLOT.unhappy} { background-color: rgb(230, 60, 50); border-color: rgb(255, 120, 110); }
.${SLOTS} > div.${SLOT.spare} { background-color: rgba(240, 150, 50, 0.3); border-color: rgb(240, 150, 50); }
.${MORE} { color: rgb(255, 180, 80); font-size: 1.4em; font-weight: bold; line-height: 1; margin-left: ${rem(-3)}; }
.${POP} { display: flex; flex-direction: row; align-items: center; white-space: nowrap; margin-left: ${rem(6)}; }
panel-yield-banner .panel-yield__top-bar-content .${POP} img { width: ${rem(ICON.size + textOffset())}; height: ${rem(ICON.size + textOffset())}; margin-right: ${rem(2)}; position: relative; top: ${rem(ICON.popTop)}; }
panel-yield-banner yield-bar-entry.${SPLIT} > span.whitespace-nowrap,
panel-yield-banner yield-bar-entry.${SPLIT} > img { display: none; }
panel-yield-banner yield-bar-entry.${HIDDEN} { display: none; }
`;

// The colour of the cities at the limit, in the pill and its tooltip.
export const LIMIT_COLOUR = "rgb(240, 200, 90)";

// The most cities the player can have, or 0 for no limit.
// hud-overhaul-tooltips.js shows it too.
export function cityLimit(player) {
	return player?.Cities?.getCityLimit?.() || 0;
}

// Happiness each settlement loses per settlement over the cap.
let perSettlement = null;
function penaltyAmount() {
	if (perSettlement == null) {
		const arg = GameInfo.ModifierArguments.find((a) => a.ModifierId == MODIFIER && a.Name == "Amount");
		perSettlement = Number(arg?.Value) || 5;
	}
	return perSettlement;
}

// The happiness of the least happy settlement, or null without any.
function leastHappiness(player) {
	const levels = (player?.Cities?.getCities() ?? []).map((city) => city.Yields?.getYield(YieldTypes.YIELD_HAPPINESS)).filter((value) => value != null);
	return levels.length ? Math.min(...levels) : null;
}

// How many more settlements past the cap every settlement can take before
// the least happy one goes below 0.
function spareAfterCap(least) {
	return least >= 0 ? Math.floor(least / penaltyAmount()) : 0;
}

// How many more settlements before the least happy one goes below 0: those
// left before the cap, then those past it that every settlement can take.
// Also whether one already has. Null without settlements.
// hud-overhaul-tooltips.js shows it.
export function happinessRoom(player) {
	const least = leastHappiness(player);
	const stats = player?.Stats;
	if (least == null || !stats) return null;
	if (least < 0) return { unhappy: true, more: 0 };
	return { unhappy: false, more: Math.max(0, stats.settlementCap - stats.numSettlements) + spareAfterCap(least) };
}

// Writes the pill's split into el: the city and town icons with their
// counts, the cities against the limit if there is one, then the slots.
function writeMeter(el, cities, towns, cap, limit, least) {
	const icon = (id, kind) => {
		const img = document.createElement("img");
		img.src = UI.getIconURL(id);
		img.classList.add(kind);
		return img;
	};
	const cityCount = document.createElement("span");
	cityCount.textContent = limit ? Locale.compose("LOC_HUD_OVERHAUL_CITY_LIMIT_COUNT", cities, limit) : String(cities);
	if (limit && cities >= limit) cityCount.style.color = LIMIT_COLOUR;
	const townCount = document.createElement("span");
	townCount.textContent = String(towns);
	const count = cities + towns;
	const over = Math.max(0, count - cap);
	// The last settlements over the cap, which took the least happy below 0.
	const unhappy = least < 0 ? Math.min(over, Math.ceil(-least / penaltyAmount())) : 0;
	const slots = document.createElement("div");
	slots.classList.add(SLOTS);
	const slot = (kind) => {
		const div = document.createElement("div");
		if (kind) div.classList.add(SLOT[kind]);
		slots.appendChild(div);
	};
	for (let i = 0; i < Math.max(count, cap); i++) {
		if (i >= count) slot(null);
		else if (i >= count - unhappy) slot("unhappy");
		else if (i >= cap) slot("over");
		else slot(i < cities ? "city" : "town");
	}
	const spare = least == null ? 0 : spareAfterCap(least);
	for (let i = 0; i < Math.min(spare, MAX_SPARE); i++) slot("spare");
	el.textContent = "";
	el.append(icon("YIELD_CITIES", CITY), cityCount, icon("YIELD_TOWNS", TOWN), townCount, slots);
	if (spare > MAX_SPARE) {
		const more = document.createElement("span");
		more.classList.add(MORE);
		more.textContent = "+";
		el.append(more);
	}
}

// Each one on screen, for the option to update at once.
const attached = new Set();

class SettlementCap extends Component {
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} settlements: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		attached.add(this);
		this.onUpdate();
		// In case the game draws the entry after this frame.
		requestAnimationFrame(this.onUpdate);
		engine.on("PlayerSettlementCapChanged", this.onUpdate);
		engine.on("CityAddedToMap", this.onUpdate);
		engine.on("CityRemovedFromMap", this.onUpdate);
		engine.on("CityGovernmentLevelChanged", this.onUpdate);
		engine.on("PlayerTurnActivated", this.onUpdate);
		engine.on("CityPopulationChanged", this.onUpdate);
		engine.on("CityYieldChanged", this.onUpdate);
	}

	onDetach() {
		engine.off("PlayerSettlementCapChanged", this.onUpdate);
		engine.off("CityAddedToMap", this.onUpdate);
		engine.off("CityRemovedFromMap", this.onUpdate);
		engine.off("CityGovernmentLevelChanged", this.onUpdate);
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("CityPopulationChanged", this.onUpdate);
		engine.off("CityYieldChanged", this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}

	update() {
		const entry = this.Root.closest("panel-yield-banner")?.querySelector('yield-bar-entry[data-icon="YIELD_CITIES"]');
		if (!entry) return;
		if (entry.nextSibling !== this.Root) this.Root.parentNode?.insertBefore(entry, this.Root);
		const player = Players.get(GameContext.localObserverID);
		const stats = player?.Stats;
		this.updateSplit(entry, player, cityLimit(player));
		this.updateLimitPill(entry);
		this.updatePopulation(entry);
		const over = enabled() && stats ? stats.numSettlements - stats.settlementCap : 0;
		entry.classList.toggle(OVER, over > 0);
		let span = entry.querySelector(`.${PENALTY}`);
		if (over <= 0) {
			span?.remove();
			return;
		}
		if (!span) {
			span = document.createElement("span");
			span.classList.add(PENALTY);
			entry.appendChild(span);
		}
		span.textContent = Locale.compose("LOC_HUD_OVERHAUL_SETTLEMENT_PENALTY", -over * penaltyAmount());
	}

	updateSplit(entry, player, limit) {
		const stats = player?.Stats;
		const on = splitEnabled() && !!stats;
		entry.classList.toggle(SPLIT, on);
		let span = entry.querySelector(`.${COUNT}`);
		if (!on) {
			span?.remove();
			return;
		}
		if (!span) {
			span = document.createElement("span");
			span.classList.add(COUNT);
		}
		// After the game's text and before the population and penalty, also
		// when the game draws its text after this first runs.
		const next = entry.querySelector(`.${POP}`) ?? entry.querySelector(`.${PENALTY}`);
		if (span.nextSibling !== next || span.parentNode !== entry) entry.insertBefore(span, next);
		writeMeter(span, stats.numCities, stats.numTowns, stats.settlementCap, limit, leastHappiness(player));
	}

	// The game's City Limit pill: hidden while the split shows the limit,
	// otherwise just after the settlements.
	updateLimitPill(entry) {
		const pill = this.Root.closest("panel-yield-banner")?.querySelector('yield-bar-entry[data-icon="YIELD_CITY_CAP"]');
		if (!pill) return;
		const hide = entry.classList.contains(SPLIT);
		pill.classList.toggle(HIDDEN, hide);
		if (!hide && entry.nextSibling !== pill) entry.after(pill);
	}

	// The empire's population, after the count and before the penalty.
	updatePopulation(entry) {
		const cities = Players.get(GameContext.localObserverID)?.Cities?.getCities();
		let span = entry.querySelector(`.${POP}`);
		if (!cities) {
			span?.remove();
			return;
		}
		if (!span) {
			span = document.createElement("span");
			span.classList.add(POP);
			const img = document.createElement("img");
			img.src = UI.getIconURL("YIELD_POPULATION");
			span.append(img, document.createElement("span"));
		}
		const penalty = entry.querySelector(`.${PENALTY}`);
		if (span.nextSibling !== penalty || span.parentNode !== entry) entry.insertBefore(span, penalty);
		span.lastChild.textContent = String(cities.reduce((sum, city) => sum + city.population, 0));
	}
}

function enabled() {
	return readSettings().settlementCap !== false;
}

function splitEnabled() {
	return readSettings().settlementSplit !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-settlement-split",
			label: "LOC_HUD_OVERHAUL_OPTION_SETTLEMENT_SPLIT",
			description: "LOC_HUD_OVERHAUL_OPTION_SETTLEMENT_SPLIT_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = splitEnabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("settlementSplit", !!value);
				} catch (error) {
					console.error(`${TAG} settlements: cannot save setting: ${error}`);
				}
				for (const cap of attached) cap.onUpdate();
			},
		},
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-settlement-cap",
			label: "LOC_HUD_OVERHAUL_OPTION_SETTLEMENT_CAP",
			description: "LOC_HUD_OVERHAUL_OPTION_SETTLEMENT_CAP_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("settlementCap", !!value);
				} catch (error) {
					console.error(`${TAG} settlements: cannot save setting: ${error}`);
				}
				for (const cap of attached) cap.onUpdate();
			},
		},
	], "settlements");
}

try {
	const restyle = () => setStyle("hud-overhaul-settlements", styles());
	restyle();
	onTextSize(restyle);
	Controls.define(COMPONENT, { createInstance: SettlementCap });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} settlements: option not added: ${error}`));
	console.error(`${TAG} settlements loaded, civ7lab:build settlements ${BUILD}`);
} catch (error) {
	console.error(`${TAG} settlements: ${error}`);
}
