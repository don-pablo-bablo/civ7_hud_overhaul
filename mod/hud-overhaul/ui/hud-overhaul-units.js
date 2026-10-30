// Your units in the top bar: a parchment pill headed by the army
// commander's icon, then the warrior's with your military units, the
// founder's with your civilians and the missionary's with your missionaries,
// all four in one light tint. The missionaries show in the Exploration Age
// only, at 0 too, as a player counting them wants to see none. In the other
// ages they count as civilians. Its tooltip
// (hud-overhaul-tooltips.js) lists them by kind; locked, it lists each unit
// with where it is, and a click on one selects it and moves the camera to
// it.
//
// Military counts the game's military units and their commanders, the
// commanders first. Missionaries are the units that spread religion, the
// civs' own missionaries among them. The rest, such as settlers, scouts and
// merchants, are civilians. Trade ships and caravans are left out: the
// game moves them along their routes, and they take no orders.
//
// It goes in the slot the top bar keeps for mods, through ModdingRegistry,
// as hud-overhaul-trade.js does, and is styled as the other pills. An option
// in Options > Add-ons turns it off.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { unitStrength } from "./hud-overhaul-strength.js";
import { addOptions, onTextSize, OPTION_GROUPS, readSettings, setStyle, textOffset, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "18";
const COMPONENT = "hud-overhaul-units";
const ENTRY = "hud-overhaul-units-entry";
const TEXT = "hud-overhaul-units-text";

const KIND = "hud-overhaul-units-kind"; // the icon before each count
const MISSIONARY_KIND = "hud-overhaul-units-missionary";

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// The pill's data-icon, which hud-overhaul-tooltips.js finds it by.
export const ICON = "UNIT_ARMY_COMMANDER";
// Every icon in the pill in a lighter shade of its colour
// (hud-overhaul-pills.js), as plain white glares.
const TINT = "rgb(235, 212, 175)";
// [icon, tint] for military units, civilians and missionaries. hud-overhaul-tooltips.js
// marks them the same way.
export const MILITARY = ["UNIT_WARRIOR", TINT];
export const CIVILIAN = ["UNIT_FOUNDER", TINT];
export const MISSIONARY = ["UNIT_MISSIONARY", TINT];

// The icon by its font icon, the game's plain white one, where it has one,
// as the text's [icon:] shows it.
export function iconURL(name) {
	return UI.getIconURL(name, "FONTICON");
}

// Sizes that hold text grow by offset, the px the player's text size adds
// (textOffset in hud-overhaul-settings.js). The commander's shield looks
// large at the pills' 19px, so it is drawn smaller, clear of the pill's
// rounded end, on the counts' centre line. The rules name the bar's
// content to outrank hud-overhaul-pills.js's icon size.
const styles = (offset = 0) => `
${COMPONENT} { display: flex; }
${COMPONENT}.hud-overhaul-off { display: none; }
.${ENTRY} { color: rgb(220, 205, 190); }
.${TEXT} { display: flex; flex-direction: row; align-items: center; white-space: nowrap; }
.harness panel-yield-banner .panel-yield__top-bar-content yield-bar-entry.${ENTRY} img {
	width: ${rem(15 + offset)};
	height: ${rem(15 + offset)};
	margin-left: ${rem(4)};
	margin-right: 0;
}
.${KIND} {
	width: ${rem(17 + offset)};
	height: ${rem(17 + offset)};
	margin: 0 ${rem(3)} 0 ${rem(6)};
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center;
}
.${KIND}:first-child { margin-left: ${rem(5)}; }
/* The missionary fills more of its square than the others: drawn smaller,
   with the room it gives up before it, it reads as their size. */
.${KIND}.${MISSIONARY_KIND} {
	width: ${rem(15 + offset)};
	height: ${rem(15 + offset)};
	margin: 0 ${rem(4)} 0 ${rem(8)};
}
`;

// Off the map: a unit packed into its commander's army.
const OFF_MAP = -9999;
// Units that run a trade route on their own.
const ROUTE_UNITS = ["UNIT_TRADE_SHIP", "UNIT_TRADE_CARAVAN"];

// Military units and commanders count as military.
function isMilitary(unit, info) {
	return info?.CoreClass === "CORE_CLASS_MILITARY" || !!unit.isCommanderUnit;
}

// Units that spread religion: the missionary and the civs' own.
function isMissionary(info) {
	return info.SpreadCharges > 0;
}

// Missionaries have a count of their own in the Exploration Age only.
export function missionariesShown() {
	return Game.age == Game.getHash("AGE_EXPLORATION");
}

// The list a unit goes in: "military", "missionary" or "civilian".
function kindOf(unit, info, missionaries) {
	if (isMilitary(unit, info)) return "military";
	return missionaries && isMissionary(info) ? "missionary" : "civilian";
}

// Where a unit is: its own plot, or its army's when packed into it.
function locationOf(unit) {
	if (unit.location.x !== OFF_MAP) return unit.location;
	return Armies.get(unit.armyId)?.location ?? null;
}

// The settlement whose land a unit is on, or "" outside any.
function placeOf(location) {
	if (!location) return "";
	const id = GameplayMap.getOwningCityFromXY(location.x, location.y);
	const city = id ? Cities.get(id) : null;
	return city ? Locale.compose(city.name) : "";
}

// { military, civilian, missionary }: every unit counted, as the pill shows
// them.
export function unitCounts(player) {
	const count = { military: 0, civilian: 0, missionary: 0 };
	const missionaries = missionariesShown();
	for (const unit of player.Units?.getUnits() ?? []) {
		const info = GameInfo.Units.lookup(unit.type);
		if (!info || ROUTE_UNITS.includes(info.UnitType)) continue;
		count[kindOf(unit, info, missionaries)]++;
	}
	return count;
}

// { military, civilian, missionary, count }. Each list holds { id, type, name, icon,
// domain, location, place, commander, strength, hp, maxHp, moves, maxMoves },
// commanders first, then
// by place and name; `count` is unitCounts', every unit counted. A
// commander also has `army`: the units packed into it, in the same shape,
// and its slots for them. Packed units are listed only there. `hp` and
// `moves` are what is left of `maxHp` and `maxMoves`, as the unit panel
// shows them. `strength` is 0 for commanders and civilians: the game gives
// them one, for defence only.
export function units(player) {
	const lists = { military: [], civilian: [], missionary: [], count: unitCounts(player) };
	const packed = [];
	const missionaries = missionariesShown();
	for (const unit of player.Units?.getUnits() ?? []) {
		const info = GameInfo.Units.lookup(unit.type);
		if (!info || ROUTE_UNITS.includes(info.UnitType)) continue;
		const kind = kindOf(unit, info, missionaries);
		const military = kind === "military";
		const commander = !!unit.isCommanderUnit;
		const location = locationOf(unit);
		const maxHp = unit.Health?.maxDamage || 100;
		const entry = {
			id: unit.id,
			type: info.UnitType,
			name: Locale.compose(info.Name),
			icon: UI.getIconURL(info.UnitType),
			domain: info.Domain,
			location,
			place: placeOf(location),
			commander,
			strength: military && !commander ? unitStrength(unit) : 0,
			hp: maxHp - (unit.Health?.damage ?? 0),
			maxHp,
			moves: unit.Movement?.movementMovesRemaining ?? 0,
			maxMoves: unit.Movement?.maxMoves ?? 0,
		};
		if (commander) {
			const army = Armies.get(unit.armyId);
			entry.army = { key: unit.armyId?.id, units: [], slots: army?.combatUnitCapacity ?? 0 };
		}
		if (unit.location.x === OFF_MAP) packed.push([unit.armyId?.id, entry]);
		else lists[kind].push(entry);
	}
	// Each packed unit under its commander, or on its own if none is found.
	for (const [key, entry] of packed) {
		const commander = lists.military.find((unit) => unit.army?.key === key);
		if (commander) commander.army.units.push(entry);
		else lists.military.push(entry);
	}
	// Commanders first, then by where each unit is, so those in one
	// settlement sit together, unclaimed land last; then by name.
	const byName = (a, b) => a.name.localeCompare(b.name);
	const order = (a, b) => b.commander - a.commander || !a.place - !b.place || a.place.localeCompare(b.place) || byName(a, b);
	lists.military.sort(order);
	lists.civilian.sort(order);
	lists.missionary.sort(order);
	for (const unit of lists.military) unit.army?.units.sort(byName);
	return lists;
}

// Selects a unit and moves the camera to it.
export function goTo(unit) {
	if (unit.location) Camera.lookAtPlot(unit.location);
	UI.Player.selectUnit(unit.id);
}

// Each one on screen, for the option to update at once.
const attached = new Set();

class Units extends Component {
	entry = null;
	text = null;
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} units: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		// update() moves the pill, which attaches it again; it keeps the entry
		// it has.
		if (!this.entry) {
			this.entry = document.createElement("yield-bar-entry");
			this.entry.dataset.icon = ICON;
			this.entry.classList.add(ENTRY);
			this.text = document.createElement("div");
			this.text.classList.add(TEXT);
			for (const [name, tint] of [MILITARY, CIVILIAN, MISSIONARY]) {
				const kind = document.createElement("div");
				kind.classList.add(KIND);
				if (name === MISSIONARY[0]) kind.classList.add(MISSIONARY_KIND);
				kind.style.backgroundImage = `url("${iconURL(name)}")`;
				kind.style.fxsBackgroundImageTint = tint;
				this.text.append(kind, document.createElement("span"));
			}
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
		// This script loads after the other pills', as it waits for
		// hud-overhaul-military.js, so it is moved to after the settlements.
		const settlements = this.Root.parentNode?.querySelector("hud-overhaul-settlement-cap");
		if (settlements && settlements.nextSibling !== this.Root) settlements.after(this.Root);
		// The game's entry adds its icon's colour class from a list that
		// lacks this one, so it adds the class "undefined".
		this.entry.classList.remove("undefined");
		// The game draws its own empty text after this adds its text, so the
		// text is moved back to the end.
		if (this.entry.lastChild !== this.text) this.entry.appendChild(this.text);
		// The game draws its icon as the unit flag; the font icon matches the
		// others.
		const image = this.entry.querySelector("img");
		const url = `url("${iconURL(ICON)}")`;
		if (image && image.style.backgroundImage !== url) {
			image.style.backgroundImage = url;
			image.style.fxsBackgroundImageTint = TINT;
		}
		const player = Players.get(GameContext.localObserverID);
		const on = enabled() && !!player?.Units;
		this.Root.classList.toggle("hud-overhaul-off", !on);
		if (!on) return;
		const count = unitCounts(player);
		const [, military, , civilian, missionaryIcon, missionary] = this.text.children;
		const missionaries = missionariesShown();
		missionaryIcon.style.display = missionaries ? "" : "none";
		missionary.style.display = missionaries ? "" : "none";
		military.textContent = String(count.military);
		civilian.textContent = String(count.civilian);
		missionary.textContent = String(count.missionary);
		this.entry.dataset.tooltipContent = Locale.compose("LOC_UI_PRODUCTION_CATEGORY_UNITS");
	}
}

const EVENTS = ["PlayerTurnActivated", "UnitAddedToMap", "UnitRemovedFromMap"];

function enabled() {
	return readSettings().units !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-units",
			label: "LOC_UI_PRODUCTION_CATEGORY_UNITS",
			description: "LOC_HUD_OVERHAUL_OPTION_UNITS_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("units", !!value);
				} catch (error) {
					console.error(`${TAG} units: cannot save setting: ${error}`);
				}
				for (const pill of attached) pill.onUpdate();
			},
		},
	], "units");
}

try {
	const restyle = () => setStyle("hud-overhaul-units", styles(textOffset()));
	restyle();
	onTextSize(restyle);
	Controls.define(COMPONENT, { createInstance: Units });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} units: option not added: ${error}`));
	console.error(`${TAG} units loaded, civ7lab:build units ${BUILD}`);
} catch (error) {
	console.error(`${TAG} units: ${error}`);
}
