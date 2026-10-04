// The settlement count in the top bar, split into cities and towns:
// "3 + 4/6", then the empire's population after its icon. It turns red
// when the empire is over the cap, and adds the happiness each settlement
// loses for it: "3 + 5/6 (-10 each)".
//
// The penalty is the game's TRAIT_MOD_PENALTY_OVER_SETTLEMENT_CAP_SETTLEMENTS:
// for each settlement over the cap, every settlement loses 5 happiness, with
// no limit. The amount is read from that modifier, in case a mod changes it.
//
// The cap is the game's own yield-bar-entry. This marks it rather than
// replacing it: a class for the colour, and spans of its own after the
// game's text, which the game leaves alone when it rewrites the "8/6". For
// the split, the game's text is hidden and a span shows the split instead.
// A hidden element in the top bar's mod slot, put there through
// ModdingRegistry, finds the entry each time the top bar is rebuilt. It
// also moves the entry into the mod slot, just before itself, so the
// settlements show after the empire's food and production.
//
// Some civs, such as Carthage, have a hard limit on cities, for which the
// game adds a City Limit pill of its own. With the split, that pill is
// hidden and the cities show against the limit instead: "1/1 + 0/3",
// gold at the limit, when towns can no longer become cities. Without the
// split, the game's pill moves to just after the settlements.
//
// Two options in Options > Add-ons turn the split and the warning off.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { addOptions, OPTION_GROUPS, readSettings, setStyle, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
const rem = (px) => `${(px / 18).toFixed(4)}rem`;
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "9";
const COMPONENT = "hud-overhaul-settlement-cap";
const OVER = "hud-overhaul-over-cap";
const PENALTY = "hud-overhaul-cap-penalty";
const SPLIT = "hud-overhaul-split"; // on the entry while the split shows
const COUNT = "hud-overhaul-settlement-count";
const POP = "hud-overhaul-settlement-pop";
const HIDDEN = "hud-overhaul-hidden";
const MODIFIER = "TRAIT_MOD_PENALTY_OVER_SETTLEMENT_CAP_SETTLEMENTS";

// [data-icon] lifts these over the yield pills' colours.
const STYLES = `
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
.${COUNT} { white-space: nowrap; }
.${POP} { display: flex; flex-direction: row; align-items: center; white-space: nowrap; margin-left: ${rem(6)}; }
.${POP} img { width: ${rem(17)}; height: ${rem(17)}; margin-right: ${rem(2)}; }
panel-yield-banner yield-bar-entry.${SPLIT} > span.whitespace-nowrap { display: none; }
panel-yield-banner yield-bar-entry.${HIDDEN} { display: none; }
`;

// The colour of the cities at the limit, in the pill and its tooltip.
export const LIMIT_COLOUR = "rgb(240, 200, 90)";

// The most cities the player can have, or 0 for no limit.
// hud-overhaul-tooltips.js shows it too.
export function cityLimit(player) {
	return player?.Cities?.getCityLimit?.() || 0;
}

// Writes the split, "3 + 4/6", into el. With a city limit the cities
// show against it in a span of their own, "1/1 + 0/3", gold at the
// limit. hud-overhaul-tooltips.js writes its heading's chip with it too.
export function writeSplit(el, cities, towns, cap, limit) {
	if (!limit) {
		el.textContent = Locale.compose("LOC_HUD_OVERHAUL_SETTLEMENT_SPLIT", cities, towns, cap);
		return;
	}
	// The span goes where the text puts the cities.
	const MARK = "\u0001";
	const [before, after = ""] = Locale.compose("LOC_HUD_OVERHAUL_SETTLEMENT_SPLIT", MARK, towns, cap).split(MARK);
	const count = document.createElement("span");
	count.textContent = Locale.compose("LOC_HUD_OVERHAUL_CITY_LIMIT_COUNT", cities, limit);
	if (cities >= limit) count.style.color = LIMIT_COLOUR;
	// The game's browser has no replaceChildren, and drops a space where
	// text meets a span, so those spaces are non-breaking.
	el.textContent = before.replace(/ $/, "\u00a0");
	el.append(count, after.replace(/^ /, "\u00a0"));
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
	}

	onDetach() {
		engine.off("PlayerSettlementCapChanged", this.onUpdate);
		engine.off("CityAddedToMap", this.onUpdate);
		engine.off("CityRemovedFromMap", this.onUpdate);
		engine.off("CityGovernmentLevelChanged", this.onUpdate);
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("CityPopulationChanged", this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}

	update() {
		const entry = this.Root.closest("panel-yield-banner")?.querySelector('yield-bar-entry[data-icon="YIELD_CITIES"]');
		if (!entry) return;
		if (entry.nextSibling !== this.Root) this.Root.parentNode?.insertBefore(entry, this.Root);
		const player = Players.get(GameContext.localObserverID);
		const stats = player?.Stats;
		this.updateSplit(entry, stats, cityLimit(player));
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

	updateSplit(entry, stats, limit) {
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
		writeSplit(span, stats.numCities, stats.numTowns, stats.settlementCap, limit);
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
	setStyle("hud-overhaul-settlements", STYLES);
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
