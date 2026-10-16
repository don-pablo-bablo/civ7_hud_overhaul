// Trade routes in the top bar: a pill with the routes in use against the
// limit, "2/5", as Civilization VI showed them. Its tooltip has each route
// with the resources it brings, each leader's routes against that leader's
// limit, the numbers the leader ribbon shows on hover, and the settlements
// a route could go to now, or why not. It shows from the start of the game,
// 0/0 until a leader is met.
//
// The routes are the commerce screen's (populateTradeRoutes in
// commerce-screen-model.js): every route the game projects from your
// settlements, sorted by its status into active, available and not.
//
// The limit is per leader, so the total is the sum over the leaders met.
//
// It goes in the slot the top bar keeps for mods, through ModdingRegistry,
// as hud-overhaul-treasure.js does. It is the game's yield-bar-entry, so it is
// styled as the other pills, but its text is a span of its own: the entry
// writes a "+" before a single number.
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
const BUILD = "19";
const COMPONENT = "hud-overhaul-trade";
const ENTRY = "hud-overhaul-trade-entry";
const TEXT = "hud-overhaul-trade-text";

const STYLES = `
${COMPONENT} { display: flex; }
${COMPONENT}.hud-overhaul-off { display: none; }
.${ENTRY} { color: rgb(220, 212, 196); }
.${TEXT} { white-space: nowrap; }
`;

// The pill's data-icon, which hud-overhaul-tooltips.js finds it by.
export const ICON = "YIELD_TRADES";

// [name, routes to them, their limit, their icon, city-state] for each
// major leader and city-state met. A city-state goes by its settlement's
// name, as players know it, not its people's. The icon is a leader's portrait, or a
// city-state's type, as the diplomacy screen shows it. A city-state takes
// one route; an independent power, before it becomes a city-state, takes
// none. hud-overhaul-tooltips.js lists them too.
export function partners(player) {
	const list = [];
	for (const other of Players.getAlive()) {
		if (!(other.isMajor || other.isMinor) || other.id == player.id || !player.Diplomacy?.hasMet(other.id)) continue;
		const capital = other.isMinor ? other.Cities?.getCapital?.() : null;
		list.push([
			Locale.compose(capital ? capital.name : other.name),
			player.Trade.countPlayerTradeRoutesTo(other.id),
			player.Trade.getTradeCapacityFromPlayer(other.id),
			portrait(other),
			other.isMinor,
		]);
	}
	return list;
}

// A leader's portrait, or a city-state's type, as the diplomacy screen
// shows it, or "" if neither is found.
function portrait(other) {
	if (other.isMinor) {
		const type = GameInfo.CityStateTypes.lookup(other.getCityStateCityStateType?.())?.CityStateType;
		return type ? UI.getIconURL(`CITY_STATE_${type}`) : "";
	}
	const leader = GameInfo.Leaders.lookup(other.leaderType)?.LeaderType;
	return leader ? UI.getIconURL(leader, "LEADER") : "";
}

// Why a route cannot start, for each status that stops one, in the order
// shown. The capacity status shows only once the limit is reached, as the
// commerce screen has it.
const REASONS = [
	["AT_WAR", "LOC_HUD_OVERHAUL_TIP_TRADE_AT_WAR"],
	["NEED_MORE_FRIENDSHIP", "LOC_HUD_OVERHAUL_TIP_TRADE_AT_LIMIT"],
	["DISTANCE", "LOC_HUD_OVERHAUL_TIP_TRADE_TOO_FAR"],
	["NO_URBAN_SEA_ROUTE", "LOC_HUD_OVERHAUL_TIP_TRADE_NO_SEA_ROUTE"],
	["OVER_OCEAN", "LOC_HUD_OVERHAUL_TIP_TRADE_OVER_OCEAN"],
];

// { active, available, unavailable }, each a list of routes: { city, town,
// capital, owner, leader, portrait, cityState, sea, from, resources:
// [{ icon }], gold, reasons: [text], location }. For a city-state,
// `portrait` is its type's icon. `from` is your settlement nearest it, `location` where the
// other settlement is, `gold` what the route pays its owner.
// Routes that would bring no resources are left out, as the commerce screen
// leaves them out.
export function tradeRoutes(player) {
	const lists = { active: [], available: [], unavailable: [] };
	const trade = player.Trade;
	if (!trade) return lists;
	const status = TradeRouteStatus;
	const options = TradeRouteSearchOptions.INCLUDE_FAILED + TradeRouteSearchOptions.EXTENDED_STATUS;
	for (const route of trade.projectPossibleTradeRoutes(options) ?? []) {
		const has = (name) => route.status?.includes(status[name]) ?? false;
		if (has("NO_RESOURCES")) continue;
		const city = Cities.get(route.targetCityId);
		const from = Cities.get(route.nearestCityId);
		const owner = city ? Players.get(city.owner) : null;
		if (!city || !owner) continue;
		const resources = [];
		for (const payload of route.importPayloads ?? []) {
			const info = GameInfo.Resources.lookup(payload.uniqueResource?.resource);
			if (info) resources.push({ icon: UI.getIconURL(info.ResourceType) });
		}
		const gold = (route.exportYields ?? []).filter((y) => y.yieldType == YieldTypes.YIELD_GOLD).reduce((sum, y) => sum + y.amount, 0);
		const atLimit = trade.countPlayerTradeRoutesTo(city.owner) >= trade.getTradeCapacityFromPlayer(city.owner);
		const reasons = REASONS.filter(([name]) => has(name) && (name != "NEED_MORE_FRIENDSHIP" || atLimit)).map(([, key]) => Locale.compose(key));
		const entry = {
			city: Locale.compose(city.name),
			town: city.isTown,
			capital: city.isCapital,
			owner: city.owner,
			leader: Locale.compose(owner.name),
			portrait: portrait(owner),
			cityState: owner.isMinor,
			sea: route.domain != DomainType.DOMAIN_LAND,
			from: from ? Locale.compose(from.name) : "",
			location: city.location,
			resources,
			gold,
			reasons,
		};
		if (has("ALREADY_EXISTS")) lists.active.push(entry);
		else if (has("SUCCESS")) lists.available.push(entry);
		else lists.unavailable.push(entry);
	}
	const order = (a, b) => b.resources.length - a.resources.length || a.city.localeCompare(b.city);
	for (const list of Object.values(lists)) list.sort(order);
	return lists;
}

// How many Merchants the player has, the units that start routes.
export function merchants(player) {
	const unit = GameInfo.Units.lookup("UNIT_MERCHANT");
	return unit && player.Units ? player.Units.getNumUnitsOfType(unit.$hash) : 0;
}

// Each one on screen, for the option to update at once.
const attached = new Set();

class Trade extends Component {
	entry = null;
	text = null;
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} trade: ${error}`);
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
			// Clicked, it opens the commerce screen's trade routes tab.
			this.entry.addEventListener("action-activate", () => openCommerce(COMMERCE_TABS.trade));
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
		engine.on("TradeRouteAddedToMap", this.onUpdate);
		engine.on("TradeRouteRemovedFromMap", this.onUpdate);
		engine.on("TradeRouteChanged", this.onUpdate);
		engine.on("DiplomacyMeetMajors", this.onUpdate);
		engine.on("DiplomacyRelationshipChanged", this.onUpdate);
	}

	onDetach() {
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("TradeRouteAddedToMap", this.onUpdate);
		engine.off("TradeRouteRemovedFromMap", this.onUpdate);
		engine.off("TradeRouteChanged", this.onUpdate);
		engine.off("DiplomacyMeetMajors", this.onUpdate);
		engine.off("DiplomacyRelationshipChanged", this.onUpdate);
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
		const on = enabled() && !!player?.Trade;
		this.Root.classList.toggle("hud-overhaul-off", !on);
		if (!on) return;
		const list = partners(player);
		const used = list.reduce((sum, [, routes]) => sum + routes, 0);
		const limit = list.reduce((sum, [, , cap]) => sum + cap, 0);
		this.text.textContent = Locale.compose("LOC_HUD_OVERHAUL_TRADE_COUNT", used, limit);
		const lines = list.map(([name, routes, cap]) => Locale.compose("LOC_HUD_OVERHAUL_TRADE_LINE", name, routes, cap));
		this.entry.dataset.tooltipContent = [Locale.compose("LOC_HUD_OVERHAUL_TRADE_TITLE"), ...lines].join("[N]");
	}
}

function enabled() {
	return readSettings().tradeRoutes !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-trade",
			label: "LOC_COMMERCE_TRADE_ROUTES_TITLE",
			description: "LOC_HUD_OVERHAUL_OPTION_TRADE_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("tradeRoutes", !!value);
				} catch (error) {
					console.error(`${TAG} trade: cannot save setting: ${error}`);
				}
				for (const pill of attached) pill.onUpdate();
			},
		},
	], "trade");
}

try {
	setStyle("hud-overhaul-trade", STYLES);
	Controls.define(COMPONENT, { createInstance: Trade });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} trade: option not added: ${error}`));
	console.error(`${TAG} trade loaded, civ7lab:build trade ${BUILD}`);
} catch (error) {
	console.error(`${TAG} trade: ${error}`);
}
