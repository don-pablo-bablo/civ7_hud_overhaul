// Detailed tooltips for the top bar's pills, in the style of the game's
// plot tooltip: a title, chips with the totals, then a section for each
// part.
//
// - Yields: every settlement, biggest first with a bar for its share, then
//   the empire's other sources as the game names them. Gold and influence
//   add the treasury, science and culture what is being researched,
//   happiness the next celebration.
// - Settlements: the cities and towns with their population.
// - Happiness levels: the settlements at each level.
// - Victories: each victory's leaderboard.
// - Treasure convoys: the settlements making them.
// - Trade routes: each route running, each leader's routes against their
//   limit, and where a route could go next.
// - Resources: each one held, where it is assigned and what it does.
// - Great works: where each is displayed and what it yields.
// - Religion: your beliefs, the religion of each settlement's urban and
//   rural people, and each religion's share of the world.
//
// The game's tooltips take only text, but an element with
// data-tooltip-component gets that component as its tooltip
// (DefaultTooltipRenderer in core/ui/tooltips/tooltip-controller.js). Each
// pill gets one of the components here. The text classes are the game's
// own (text-xs is its tooltip text), so they follow the player's text size.
// With the tooltips part off, the pills keep the game's text tooltips.
// At the player's size for tooltips, every size here and those classes
// inside a tooltip grow or shrink by it, and the game's frame widens to fit.
//
// The yields' sources are the game's breakdown, player.Stats.getYields(),
// the tree the Yields report reads: each settlement under its name, and
// other named entries such as the base yield and costs.
//
// Pressing the game's tooltip inspect key (K unless rebound) over a pill
// locks its tooltip where it is, as the plot tooltip does, so it stays while
// the player moves about the map. The key again or Escape closes it; the
// key over another pill locks that one's instead. A locked tooltip shows
// more: each settlement's yield by source, and its focus, growth and
// specialists. Each tooltip ends with the game's "INSPECT [K]" hint,
// "CLOSE [K]" once locked. A click on a locked tooltip opens the screen with
// more: the yields report, the victories screen, the commerce screen, the
// great works screen or the religion screen.
//
// A hidden element in the top bar's mod slot, put there through
// ModdingRegistry, marks the pills each time the top bar is rebuilt.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ContextManager } from "../../core/ui/context-manager/context-manager.js";
import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { enabled, onSize, onTextSize, partOn, setStyle, size, textOffset } from "./hud-overhaul-settings.js";
import { celebration } from "./hud-overhaul-celebration.js";
import { COMMERCE_TABS, openCommerce } from "./hud-overhaul-commerce.js";
import { greatWorks, ICON as GREAT_WORKS, LEAD as GREAT_WORKS_ICON, openGreatWorks, WORK_YIELDS } from "./hud-overhaul-greatworks.js";
import { CLASSES as RESOURCE_CLASSES, holdings, ICON as RESOURCES } from "./hud-overhaul-resources.js";
import { openReligion, religion, ICON as RELIGION } from "./hud-overhaul-religion.js";
import { ICON as TRADE, merchants, partners, tradeRoutes } from "./hud-overhaul-trade.js";
import { convoyAge, convoys, ICON as TREASURE, idleTreasure } from "./hud-overhaul-treasure.js";
import { cityLimit, LIMIT_COLOUR, writeSplit } from "./hud-overhaul-settlements.js";
import { CIVILIAN, goTo, ICON as UNITS, iconURL, MILITARY as MILITARY_UNITS, units } from "./hud-overhaul-units.js";
import { combatStrength } from "./hud-overhaul-strength.js";
import { ICON as VICTORIES, ordinal, standings, victoryClasses } from "./hud-overhaul-victories.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "98";
const COMPONENT = "hud-overhaul-tooltips";
const PINNED = "hud-overhaul-tip-pinned";
const QUIET = "hud-overhaul-tip-quiet"; // on <html> while one is locked and the mouse is on the top bar
const MARKED = "hudOverhaulTip"; // dataset flag on a pill or the top bar once its listeners are added
const MAX_ROWS = 8; // settlements listed before "and N more"

// The player's size for tooltips against the mod's own. Every size drawn
// in a tooltip goes through rem, so it follows; the game's frame, which is
// not scaled, through frameRem.
let scale = size("tooltips");
const rem = (px) => `${((px * scale) / 18).toFixed(4)}rem`;
const frameRem = (px) => `${(px / 18).toFixed(4)}rem`;

// [yield, its name, its colour as r, g, b], the pills' colours from
// hud-overhaul-pills.js.
const YIELDS = [
	["YIELD_GOLD", "LOC_YIELD_GOLD", "212, 160, 23"],
	["YIELD_SCIENCE", "LOC_YIELD_SCIENCE", "59, 143, 217"],
	["YIELD_CULTURE", "LOC_YIELD_CULTURE", "155, 89, 208"],
	["YIELD_HAPPINESS", "LOC_YIELD_HAPPINESS", "224, 138, 46"],
	["YIELD_DIPLOMACY", "LOC_YIELD_DIPLOMACY", "63, 179, 154"],
	["YIELD_FOOD", "LOC_YIELD_FOOD", "96, 168, 56"],
	["YIELD_PRODUCTION", "LOC_YIELD_PRODUCTION", "184, 104, 52"],
];
const FOOD = YIELDS.find(([type]) => type == "YIELD_FOOD")[2]; // for growth bars
const NEGATIVE = "224, 113, 95"; // a loss's bar, as .hud-overhaul-tip-negative's text

// A panel wider than the game's tooltip frame allows, and the frame's own
// padding (p-3) on each side.
const WIDE = "hud-overhaul-tip-wide";
const WIDE_PX = 380;
const NARROW_PX = 320; // any other panel's widest
const FRAME_PADDING = 12;
// Room the locked tooltip keeps on the right for its scrollbar.
const SCROLLBAR = 16;

// The game's text classes used in the tooltips, and their px at Small.
const TEXT_CLASSES = { "2xs": 12, xs: 14, sm: 16 };

// At the player's size, the game's text classes inside a tooltip, and its
// plain text, at that size too.
function scaledText() {
	if (scale === 1) return "";
	const inside = (name) => [`.hud-overhaul-tip .text-${name}`, `.${PINNED} .text-${name}`, `.${PINNED}.text-${name}`].join(", ");
	const rules = Object.entries(TEXT_CLASSES).map(([name, px]) => `${inside(name)} { font-size: ${rem(px + textOffset())}; }`);
	return [`.hud-overhaul-tip { font-size: ${rem(14 + textOffset())}; }`, ...rules].join("\n");
}

const styles = () => `
${COMPONENT} { display: none; }
.hud-overhaul-tip { display: flex; flex-direction: column; min-width: ${rem(260)}; max-width: ${rem(NARROW_PX)}; }
.hud-overhaul-tip-head { display: flex; flex-direction: column; align-items: center; }
.hud-overhaul-tip-chips { display: flex; flex-direction: row; justify-content: center; }
.hud-overhaul-tip-chip {
	display: flex;
	flex-direction: row;
	align-items: center;
	border-radius: ${rem(12)};
	border: ${rem(1)} solid #53565D;
	background-color: #23252b;
	padding: 0 ${rem(10)} 0 ${rem(4)};
	margin: ${rem(4)} ${rem(3)} 0 ${rem(3)};
}
.hud-overhaul-tip-section { color: #a8936a; letter-spacing: 0.1em; margin-bottom: ${rem(2)}; }
.hud-overhaul-tip-heading { margin-top: ${rem(10)}; }
.hud-overhaul-tip-heading-rule { width: 100%; height: ${rem(4)}; margin: 0 0 ${rem(4)} 0; }
.hud-overhaul-tip-rule { height: ${rem(1)}; background-color: rgba(77, 83, 102, 0.7); margin: ${rem(3)} 0; }
.hud-overhaul-tip-row { display: flex; flex-direction: row; align-items: center; padding: ${rem(2)} 0; }
.hud-overhaul-tip-name { flex: 1 1 auto; margin-left: ${rem(6)}; }
.hud-overhaul-tip-tag { color: #8d97a6; margin-left: ${rem(5)}; }
.hud-overhaul-tip-value { display: flex; flex-direction: row; align-items: center; margin-left: ${rem(12)}; }
.hud-overhaul-tip-bar { height: ${rem(3)}; border-radius: ${rem(2)}; margin: ${rem(1)} 0 ${rem(2)} ${rem(26)}; }
.hud-overhaul-tip-negative { color: #e0715f; }
.hud-overhaul-tip-place { width: ${rem(26)}; color: #a8936a; }
.hud-overhaul-tip-you { color: #f2d48a; }
.hud-overhaul-tip-track { height: ${rem(3)}; border-radius: ${rem(2)}; margin: ${rem(1)} 0 ${rem(2)} ${rem(26)}; width: 85%; background-color: rgba(255, 255, 255, 0.08); }
.hud-overhaul-tip-fill { height: 100%; border-radius: ${rem(2)}; }
/* Under a growth line, level with its text: the line's indent and icon. */
.hud-overhaul-tip-track.hud-overhaul-tip-growth { width: 50%; margin: ${rem(-2)} 0 ${rem(4)} ${rem(24 + 22)}; }
.hud-overhaul-tip-hint { display: flex; flex-direction: row; align-items: center; justify-content: center; margin-top: ${rem(8)}; letter-spacing: -0.5px; }
.hud-overhaul-tip-key {
	display: flex;
	align-items: center;
	justify-content: center;
	width: ${rem(32)};
	height: ${rem(32)};
	margin-left: ${rem(8)};
	background-image: url("blp:keyboard_icon_key");
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center;
}
.${PINNED} { position: absolute; z-index: 100; pointer-events: auto; cursor: pointer; }
/* No hover tooltips on the top bar under a locked one: they would show
   behind it. #tooltip-root is the pills' frame, fxs-tooltip the older one. */
html.${QUIET} #tooltip-root, html.${QUIET} fxs-tooltip { visibility: hidden !important; }
.hud-overhaul-tip-grid { display: flex; flex-direction: column; margin-left: ${rem(22)}; }
.hud-overhaul-tip-line { display: flex; flex-direction: row; align-items: center; }
.hud-overhaul-tip-line .hud-overhaul-tip-chip { margin: ${rem(3)} ${rem(4)} 0 0; }
.hud-overhaul-tip-small { padding: 0 ${rem(6)} 0 ${rem(2)}; }
.hud-overhaul-tip-names { color: #cbbd9c; margin-left: ${rem(26)}; }
.hud-overhaul-tip-wrap { display: flex; flex-direction: row; flex-wrap: wrap; }
.hud-overhaul-tip-nowrap { white-space: nowrap; margin-right: ${rem(4)}; }
.hud-overhaul-tip-idle { opacity: 0.5; }
.hud-overhaul-tip-effect { color: #a9b0bb; margin: 0 0 ${rem(3)} ${rem(24)}; }
/* The religion tooltip, wider for its urban and rural columns. */
.hud-overhaul-tip.${WIDE} { min-width: ${rem(WIDE_PX)}; max-width: ${rem(WIDE_PX)}; }
/* Its share tracks run to the right edge, under the shares. */
.hud-overhaul-tip.${WIDE} .hud-overhaul-tip-track { width: auto; }
/* A settlement's urban or rural people: icon, count and religion, each of a
   fixed width so the columns line up from row to row and with their key. */
.hud-overhaul-tip-people { width: ${rem(58)}; margin-left: ${rem(10)}; }
.hud-overhaul-tip-count { width: ${rem(20)}; margin: 0 ${rem(4)} 0 ${rem(2)}; text-align: right; }
.hud-overhaul-tip-dash { width: ${rem(16)}; margin-left: 0; text-align: center; }
.hud-overhaul-tip-key-text { color: #8d97a6; margin-left: ${rem(5)}; }
.hud-overhaul-tip-holy { color: #e5c77a; margin-left: ${rem(6)}; white-space: nowrap; }
.hud-overhaul-tip-scrolled { padding-right: ${rem(SCROLLBAR)}; }
.hud-overhaul-tip-footer { display: flex; flex-direction: column; align-items: center; }
.hud-overhaul-tip-message { color: #c5b48d; text-align: center; margin-top: ${rem(4)}; }
.hud-overhaul-tip-head-link { cursor: pointer; border-radius: ${rem(4)}; padding-bottom: ${rem(4)}; }
.hud-overhaul-tip-head-link:hover { background-color: rgba(255, 255, 255, 0.08); }
.hud-overhaul-tip-unit, .hud-overhaul-tip-click { cursor: pointer; border-radius: ${rem(3)}; }
.hud-overhaul-tip-unit:hover, .hud-overhaul-tip-click:hover { background-color: rgba(255, 255, 255, 0.08); }
.hud-overhaul-tip-nested { margin-left: ${rem(22)}; }
/* A unit's health, moves and strength under its name, each in a column of
   its own, wide enough for its widest value. */
.hud-overhaul-tip-stats { display: flex; flex-direction: row; justify-content: flex-end; margin-bottom: ${rem(2)}; }
.hud-overhaul-tip-stat { display: flex; flex-direction: row; align-items: center; margin-left: ${rem(10)}; }
.hud-overhaul-tip-stat-text { margin-left: ${rem(3)}; }
.hud-overhaul-tip-stat-gap { width: ${rem(14)}; flex-shrink: 0; }
/* A chevron drawn with two borders of a turned square, down while the army
   is closed and up while it is open. The game's own min-max arrow does not
   show here. */
.hud-overhaul-tip-toggle {
	display: flex;
	align-items: center;
	justify-content: center;
	width: ${rem(24)};
	height: ${rem(16)};
	flex-shrink: 0;
	margin-left: ${rem(6)};
	cursor: pointer;
}
/* A resource's icon with its class's badge over its bottom edge. */
.hud-overhaul-tip-badged { position: relative; flex-shrink: 0; margin-right: ${rem(3)}; }
.hud-overhaul-tip-badge { position: absolute; bottom: ${rem(-3)}; }
/* A group's heading in a locked tooltip, which opens and closes it. */
.hud-overhaul-tip-group { display: flex; flex-direction: row; align-items: center; justify-content: space-between; cursor: pointer; }
.hud-overhaul-tip-chevron {
	width: ${rem(8)};
	height: ${rem(8)};
	border-right: ${rem(2)} solid #e5d2ac;
	border-bottom: ${rem(2)} solid #e5d2ac;
	transform: translateY(${rem(-2)}) rotate(45deg);
}
.hud-overhaul-tip-chevron.hud-overhaul-tip-chevron-up { transform: translateY(${rem(2)}) rotate(-135deg); }
.hud-overhaul-tip-stat-health { width: ${rem(44)}; }
.hud-overhaul-tip-stat-moves { width: ${rem(56)}; }
.hud-overhaul-tip-stat-strength { width: ${rem(40)}; }
${scaledText()}
`;

// +5, -2.5, 0.
function signed(value) {
	const rounded = Math.round(value * 10) / 10;
	const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
	return rounded > 0 ? `+${text}` : text;
}

function div(className, text) {
	const el = document.createElement("div");
	if (className) el.className = className;
	if (text !== undefined) el.textContent = text;
	return el;
}

function icon(url, px, gap = 0) {
	const el = div("shrink-0");
	el.style.backgroundImage = `url("${url}")`;
	el.style.backgroundSize = "contain";
	el.style.backgroundRepeat = "no-repeat";
	el.style.backgroundPosition = "center";
	el.style.width = rem(px);
	el.style.height = rem(px);
	if (gap) el.style.marginRight = rem(gap);
	return el;
}

// The game's name for a yield, without the icon it starts with.
function plain(key) {
	return Locale.compose(key).replace(/\[icon:[^\]]*\]\s*/g, "");
}

function chip(url, text, px = 20, gap = 0) {
	const el = div("hud-overhaul-tip-chip font-body text-xs");
	if (url) el.append(icon(url, px, gap));
	el.append(div("", text));
	return el;
}

// One chip with several icon and text pairs, as the settlement pill reads.
function chipOf(...pairs) {
	const el = div("hud-overhaul-tip-chip font-body text-xs");
	pairs.forEach(([url, text], i) => {
		const part = icon(url, 20);
		if (i) part.style.marginLeft = rem(6);
		el.append(part, text instanceof Element ? text : div("", text));
	});
	return el;
}

function chips(...list) {
	const row = div("hud-overhaul-tip-chips");
	row.append(...list);
	return row;
}

function head(box, title, ...rows) {
	const el = div("hud-overhaul-tip-head");
	el.append(div("font-title uppercase text-gradient-secondary text-sm", title), ...rows);
	box.append(el);
}

function headingRule() {
	return div("hud-overhaul-tip-heading-rule img-shell-line-divider");
}

// A faint rule between settlements that take several lines, for the eye to
// find where each starts.
function rule(box) {
	box.append(div("hud-overhaul-tip-rule"));
}

// A major heading, such as Cities or Towns, over the game's gold rule, as
// its own panels head a section.
function section(box, text) {
	box.append(div("hud-overhaul-tip-section hud-overhaul-tip-heading font-title text-2xs uppercase", text), headingRule());
}

// One line: an icon, a name, a grey tag, and a value with its icon.
function row(box, url, name, tag, value, valueIcon, negative) {
	const el = div("hud-overhaul-tip-row font-body text-xs");
	if (url) el.append(icon(url, 18));
	el.append(div("hud-overhaul-tip-name", name));
	if (tag) el.append(div("hud-overhaul-tip-tag text-2xs", tag));
	const right = div(`hud-overhaul-tip-value${negative ? " hud-overhaul-tip-negative" : ""}`);
	right.append(value instanceof Element ? value : div("", value));
	if (valueIcon) right.append(icon(valueIcon, 16));
	el.append(right);
	box.append(el);
}

// Names separated by commas, wrapping between names but never inside one.
function nameList(names) {
	const el = div("hud-overhaul-tip-names hud-overhaul-tip-wrap font-body text-xs");
	names.forEach((name, i) => el.append(div("hud-overhaul-tip-nowrap", i < names.length - 1 ? `${name},` : name)));
	return el;
}

function more(box, count) {
	if (count > 0) box.append(div("hud-overhaul-tip-tag font-body text-2xs", Locale.compose("LOC_HUD_OVERHAUL_TIP_MORE", count)));
}

// A row in a locked tooltip that does `action` when clicked, lit under the
// mouse as the unit rows are.
function clickable(el, action) {
	el.classList.add("hud-overhaul-tip-click");
	el.addEventListener("click", (event) => {
		event.stopPropagation();
		try {
			action();
		} catch (error) {
			console.error(`${TAG} tooltips: ${error}`);
		}
	});
}

// A settlement's place in a locked tooltip: a block added to `box` for its
// row and the lines under it, which moves the map to it on a click. The
// tooltip stays open, as for units. City details are left closed: they
// have less in them than Civ VI's city screen had.
function settlementBlock(box, location) {
	const block = div("");
	box.append(block);
	clickable(block, () => {
		if (location) Camera.lookAtPlot(location);
	});
	return block;
}

function none(box) {
	box.append(div("hud-overhaul-tip-tag font-body text-2xs", Locale.compose("LOC_HUD_OVERHAUL_HAPPINESS_NONE")));
}

// A settlement's icon, the victories screen's: the capital's, a city's or a
// town's. With no settlement, as for a count of them all, a city's.
function settlementIcon(settlement) {
	if (settlement?.isCapital) return "blp:victories_capital_256";
	return settlement?.isTown ? "blp:victories_towns_256" : "blp:victories_city_256";
}

function kind(city) {
	if (city.isCapital) return Locale.compose("LOC_HUD_OVERHAUL_TIP_CAPITAL");
	return Locale.compose(city.isTown ? "LOC_HUD_OVERHAUL_TIP_TOWN" : "LOC_HUD_OVERHAUL_TIP_CITY");
}

// The named sources in the game's breakdown of a player's yield: each
// settlement, the base yield, costs. Its grouping steps are LOC_ATTR_ keys
// or have no name, and are walked through.
function sources(node, list, sign = 1) {
	if (!node) return list;
	const name = node.description;
	if (name && !name.startsWith("LOC_ATTR_") && name != attr("LOC_ATTR_TOTAL_YIELD")) {
		if (node.value) list.push([Locale.compose(name), sign * node.value]);
		return list;
	}
	// A cost the game takes off as a negative step over a positive one, such
	// as gold maintenance (-50) over "Total Maintenance" (50): the steps
	// under it take its sign.
	const steps = node.steps ?? [];
	const under = steps.reduce((sum, step) => sum + (step.value || 0), 0);
	const turn = node.value < 0 && under > 0 ? -sign : sign;
	for (const step of steps) sources(step, list, turn);
	if (node.base) sources(node.base, list, sign);
	if (node.modifier?.value) {
		if (node.modifier.steps?.length) for (const step of node.modifier.steps) sources(step, list, sign);
		else list.push([Locale.compose("LOC_GLOBAL_YIELDS_OTHER"), sign * node.modifier.value]);
	}
	return list;
}

// The game's breakdown labels its steps in the player's language, so its
// steps are found by the text of its own keys.
const attr = (key) => Locale.compose(key);

// The named steps under node, not looking inside them.
function named(node, list = []) {
	if (!node) return list;
	const name = node.description;
	if (name && !name.startsWith("LOC_ATTR_")) {
		list.push(node);
		return list;
	}
	for (const step of node.steps ?? []) named(step, list);
	if (node.base) named(node.base, list);
	if (node.modifier) named(node.modifier, list);
	return list;
}

// What specialists add inside a group, which the game counts in it: their
// science and culture are in the buildings' line.
function fromSpecialists(node) {
	const label = attr("LOC_ATTR_YIELD_FROM_WORKERS");
	let total = 0;
	const walk = (step) => {
		if (!step) return;
		if (step.description == label) {
			total += step.value;
			return;
		}
		for (const child of step.steps ?? []) walk(child);
		if (step.base) walk(step.base);
		if (step.modifier) walk(step.modifier);
	};
	for (const step of node.steps ?? []) walk(step);
	if (node.base) walk(node.base);
	return total;
}

// The game's deductions, one line each: building maintenance, and the
// specialists' upkeep, which it names "From Specialists" as their yield.
function deductions(node, list) {
	const through = [attr("LOC_ATTR_YIELD_DEDUCTIONS"), attr("LOC_ATTR_HAPPINESS_UPKEEP")];
	const workers = attr("LOC_ATTR_MAINTENANCE_FROM_WORKERS");
	const parts = [];
	const walk = (step) => {
		for (const part of named(step)) {
			if (through.includes(part.description)) {
				for (const child of part.steps ?? []) walk(child);
				if (part.base) walk(part.base);
			} else if (part.value) {
				parts.push([part.description == workers ? Locale.compose("LOC_HUD_OVERHAUL_TIP_SPECIALIST_MAINTENANCE") : Locale.compose(part.description), -part.value]);
			}
		}
	};
	for (const step of node.steps ?? []) walk(step);
	if (node.base) walk(node.base);
	const counted = parts.reduce((sum, [, amount]) => sum + amount, 0);
	// Whatever the parts do not name, as the game's own deductions line.
	if (Math.abs(node.value - counted) >= 0.05) parts.push([Locale.compose(node.description), node.value - counted]);
	list.push(...parts);
}

// A settlement's yield by where it comes from, as the game groups it under
// "Income": [["From Buildings", 8], ["From Improvements", 7]]. Specialists
// get lines of their own, for their yield and their upkeep.
function groups(node, list) {
	if (!node) return list;
	const name = node.description;
	if (name == attr("LOC_ATTR_YIELD_MINUS_DEDUCTIONS")) {
		if (node.value) deductions(node, list);
		return list;
	}
	if (name && name != attr("LOC_ATTR_TOTAL_YIELD") && name != attr("LOC_ATTR_YIELD_INCOME") && !name.startsWith("LOC_ATTR_")) {
		if (!node.value) return list;
		const specialists = name == attr("LOC_ATTR_YIELD_FROM_WORKERS") ? 0 : fromSpecialists(node);
		if (Math.abs(node.value - specialists) >= 0.05) list.push([Locale.compose(name), node.value - specialists]);
		if (specialists) list.push([attr("LOC_ATTR_YIELD_FROM_WORKERS"), specialists]);
		return list;
	}
	for (const step of node.steps ?? []) groups(step, list);
	if (node.base) groups(node.base, list);
	return list;
}

// A settlement's yield by where it comes from, with its great works, which
// the game's breakdown leaves unnamed: for culture it leaves them out, so
// the parts fall short of the total by their yield, and for happiness it
// counts them in the buildings' line. Either way they get a line of their
// own, taken out of the buildings' line when it counted them. Anything else
// the parts fall short by shows as other.
function cityGroups(city, type, index, total) {
	// One line per source: the game lists some, such as resources in
	// supply, once for each.
	const merged = new Map();
	for (const [name, amount] of groups(city.Yields.getYields()?.[index], [])) merged.set(name, (merged.get(name) ?? 0) + amount);
	const list = [...merged];
	let works = 0;
	if (WORK_YIELDS.includes(type)) {
		for (const building of city.Constructibles?.getGreatWorkBuildings() ?? []) {
			works += city.Constructibles.getBuildingYieldFromGreatWorks(YieldTypes[type], building.constructibleID);
		}
	}
	let gap = total - list.reduce((sum, [, amount]) => sum + amount, 0);
	const near = (a, b) => Math.abs(a - b) < 0.05;
	if (works && near(gap, works)) {
		list.push([Locale.compose("LOC_HUD_OVERHAUL_TIP_FROM_GREAT_WORKS"), works]);
		gap -= works;
	} else if (works && list.length && list[0][1] >= works) {
		// The buildings' line, the first source the game names.
		list[0] = [list[0][0], list[0][1] - works];
		list.splice(1, 0, [Locale.compose("LOC_HUD_OVERHAUL_TIP_FROM_GREAT_WORKS"), works]);
	}
	if (!near(gap, 0)) list.push([Locale.compose("LOC_GLOBAL_YIELDS_OTHER"), gap]);
	return list;
}

// Hovered, the biggest settlements; locked, every one, each with where its
// yield comes from.
function yieldPanel(type, name, colour, detailed) {
	const player = Players.get(GameContext.localObserverID);
	const box = div("hud-overhaul-tip");
	if (!player?.Stats) return box;
	const yieldType = YieldTypes[type];
	const url = UI.getIconURL(type, "YIELD");
	const total = player.Stats.getNetYield(yieldType);
	const perTurn = chip(url, Locale.compose("LOC_HUD_OVERHAUL_TIP_PER_TURN", signed(total)));
	const rows = [];
	if (type == "YIELD_GOLD" && player.Treasury) rows.push(chips(chip(url, String(Math.floor(player.Treasury.goldBalance))), perTurn));
	else if (type == "YIELD_DIPLOMACY" && player.DiplomacyTreasury) rows.push(chips(chip(url, String(Math.floor(player.DiplomacyTreasury.diplomacyBalance))), perTurn));
	else rows.push(chips(perTurn));
	const tree = type == "YIELD_SCIENCE" ? player.Techs : type == "YIELD_CULTURE" ? player.Culture : null;
	const node = tree && GameInfo.ProgressionTreeNodes.lookup(tree.getResearching()?.type);
	if (node) {
		const text = Locale.compose("LOC_HUD_OVERHAUL_TIP_RESEARCHING", Locale.compose(node.Name), tree.getTurnsLeft());
		rows.push(chips(chip(`fs://game/${node.IconString}`, text, 26, 5)));
	}
	if (type == "YIELD_HAPPINESS") {
		const line = celebration(player);
		// The pill's tooltip line is a sentence; a chip drops its full stop.
		if (line) rows.push(chips(chip("blp:fonticon_celebration", Locale.compose(line[1], line[2]).replace(/\.$/, ""))));
	}
	head(box, plain(name), ...rows);

	const cities = player.Cities.getCities()
		.map((city) => [city, city.Yields.getNetYield(yieldType)])
		.sort((a, b) => b[1] - a[1]);
	const most = Math.max(1, ...cities.map(([, value]) => Math.abs(value)));
	section(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_SETTLEMENTS"));
	const index = GameInfo.Yields.findIndex((row) => row.YieldType == type);
	for (const [i, [city, value]] of (detailed ? cities : cities.slice(0, MAX_ROWS)).entries()) {
		if (detailed && i) rule(box);
		// Locked, the settlement and all its lines go to it on a click.
		const block = detailed ? settlementBlock(box, city.location) : box;
		row(block, settlementIcon(city), Locale.compose(city.name), kind(city), signed(value), url, value < 0);
		// A bar for each settlement's share, when there is more than one,
		// straight under its name: red for a loss, as its number is.
		if (cities.length > 1) {
			const bar = div("hud-overhaul-tip-bar");
			bar.style.width = `${Math.round((Math.abs(value) / most) * 85)}%`;
			bar.style.backgroundColor = `rgba(${value < 0 ? NEGATIVE : colour}, 0.7)`;
			block.append(bar);
		}
		// Each source on a line of its own, under the settlement.
		for (const [source, amount] of detailed ? cityGroups(city, type, index, value) : []) {
			const line = div("hud-overhaul-tip-row hud-overhaul-tip-effect hud-overhaul-tip-tag font-body text-2xs");
			line.append(div("hud-overhaul-tip-name", source), div("hud-overhaul-tip-value", signed(amount)));
			block.append(line);
		}
	}
	if (!detailed) more(box, cities.length - MAX_ROWS);
	if (!cities.length) none(box);

	const names = new Set(cities.map(([city]) => Locale.compose(city.name)));
	const other = sources(player.Stats.getYields()?.[index], []).filter(([source]) => !names.has(source));
	if (other.length) {
		section(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_EMPIRE"));
		for (const [source, value] of other) row(box, null, source, "", signed(value), url, value < 0);
	}
	return box;
}

// Every city and town, biggest first; locked, each with its focus, growth,
// population split and specialists, and the cities' and towns' headings
// open and close them.
function settlementsPanel(detailed) {
	const player = Players.get(GameContext.localObserverID);
	const box = div("hud-overhaul-tip");
	const stats = player?.Stats;
	if (!stats) return box;
	const all = player.Cities.getCities().sort((a, b) => b.population - a.population);
	const cities = all.filter((city) => !city.isTown);
	const towns = all.filter((city) => city.isTown);
	const population = all.reduce((sum, city) => sum + city.population, 0);
	const popIcon = UI.getIconURL("YIELD_POPULATION");
	const over = stats.numSettlements - stats.settlementCap;
	const cap = over > 0 ? Locale.compose("LOC_HUD_OVERHAUL_TIP_OVER_CAP", over) : Locale.compose("LOC_HUD_OVERHAUL_TIP_UNDER_CAP", -over);
	// Some civs, such as Carthage, have a hard limit on cities.
	// Its chip goes on a line of its own under the cap's, gold at the limit.
	const limit = cityLimit(player);
	// A span, as in the pill: the game stacks a div's text and spans in
	// lines of their own.
	const split = document.createElement("span");
	split.style.whiteSpace = "nowrap";
	writeSplit(split, cities.length, towns.length, stats.settlementCap, limit);
	const caps = [chips(chip(null, cap))];
	if (limit) {
		const left = limit - cities.length;
		const text = left > 0 ? Locale.compose("LOC_HUD_OVERHAUL_TIP_UNDER_CITY_LIMIT", left) : Locale.compose("LOC_HUD_OVERHAUL_TIP_AT_CITY_LIMIT");
		const limitChip = chip(UI.getIconURL("YIELD_CITY_CAP"), text);
		if (left <= 0) limitChip.lastChild.style.color = LIMIT_COLOUR;
		caps.push(chips(limitChip));
	}
	head(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_SETTLEMENTS"), chips(chipOf([settlementIcon(), split], [popIcon, String(population)])), ...caps);
	for (const [title, list] of [
		["LOC_HUD_OVERHAUL_TIP_CITIES", cities],
		["LOC_HUD_OVERHAUL_TIP_TOWNS", towns],
	]) {
		if (!group(box, title, Locale.compose(title, list.length), null, detailed, list.length)) continue;
		// Every one, hovered too: a line each is short enough.
		for (const [i, city] of list.entries()) {
			if (detailed && i) rule(box);
			if (!detailed) {
				row(box, settlementIcon(city), Locale.compose(city.name), city.isCapital ? kind(city) : "", String(city.population), popIcon);
				continue;
			}
			// Locked, the settlement and all its lines go to it on a click.
			const block = settlementBlock(box, city.location);
			row(block, settlementIcon(city), Locale.compose(city.name), city.isCapital ? kind(city) : "", String(city.population), popIcon);
			// Locked, a line each for a town's focus, the turns to grow, the
			// urban and rural population, and a city's specialists. Each
			// line is one or more icon and text pairs.
			const lines = [];
			// A town with no focus is growing, as the town screen says.
			if (city.isTown) {
				const focus = GameInfo.Projects.lookup(city.Growth?.projectType ?? -1);
				lines.push([focus ? [UI.getIconURL(focus.ProjectType), Locale.compose(focus.Name)] : [UI.getIconURL("PROJECT_GROWTH"), Locale.compose("LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH")]]);
			}
			const growth = city.Growth;
			const turns = growth?.turnsUntilGrowth ?? -1;
			if (turns > 0) {
				const line = [[UI.getIconURL("GROWTH_RATE"), Locale.compose("LOC_HUD_OVERHAUL_TIP_GROWS_IN", turns)]];
				// The food stored towards growth, as a bar under the line.
				const needed = growth.getNextGrowthFoodThreshold?.()?.value;
				if (needed > 0) line.progress = Math.max(0, Math.min(1, growth.currentFood / needed));
				lines.push(line);
			}
			lines.push([
				["blp:city_urban", Locale.compose("LOC_HUD_OVERHAUL_TIP_URBAN", city.urbanPopulation)],
				["blp:city_rural", Locale.compose("LOC_HUD_OVERHAUL_TIP_RURAL", city.ruralPopulation)],
			]);
			if (!city.isTown && city.Workers) lines.push([["blp:agecard_crisis_specialists", Locale.compose("LOC_HUD_OVERHAUL_TIP_SPECIALISTS", city.Workers.getNumWorkers(false))]]);
			for (const pairs of lines) {
				const line = div("hud-overhaul-tip-row hud-overhaul-tip-effect hud-overhaul-tip-tag font-body text-2xs");
				pairs.forEach(([url, text], i) => {
					const name = div("", text);
					name.style.marginLeft = rem(1);
					if (i < pairs.length - 1) name.style.marginRight = rem(8);
					line.append(icon(url, 21), name);
				});
				block.append(line);
				if (pairs.progress === undefined) continue;
				const track = div("hud-overhaul-tip-track hud-overhaul-tip-growth");
				const fill = div("hud-overhaul-tip-fill");
				fill.style.width = `${Math.round(pairs.progress * 100)}%`;
				fill.style.backgroundColor = `rgba(${FOOD}, 0.8)`;
				track.append(fill);
				block.append(track);
			}
		}
		if (!list.length) none(box);
	}
	return box;
}

// Settlements at each happiness level: { stages: [[stage, min, max]],
// levels: [[name, happiness, city]] per stage }, best first.
function levelsData(player) {
	const stages = [...GameInfo.HappinessStages]
		.map((row) => [row.HappinessStageType.replace("HAPPINESS_STAGE_", ""), row.StageMinThreshold ?? -Infinity, row.StageMaxThreshold ?? Infinity])
		.sort((a, b) => b[1] - a[1]);
	const levels = stages.map(() => []);
	for (const city of player.Cities.getCities()) {
		const happiness = city.Yields.getYield(YieldTypes.YIELD_HAPPINESS);
		const index = stages.findIndex(([, min, max]) => happiness >= min && happiness <= max);
		if (index >= 0) levels[index].push([Locale.compose(city.name), happiness, city]);
	}
	return { stages, levels };
}

// Hovered, each level's settlements as one line of names; locked, a row
// each with its happiness.
export function levelsBox({ stages, levels }, detailed) {
	const box = div("hud-overhaul-tip");
	const total = levels.reduce((sum, list) => sum + list.length, 0);
	const count = Locale.compose(total == 1 ? "LOC_HUD_OVERHAUL_TIP_ONE_SETTLEMENT" : "LOC_HUD_OVERHAUL_TIP_N_SETTLEMENTS", total);
	head(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_LEVELS"), chips(chip(settlementIcon(), count)));
	const happy = UI.getIconURL("YIELD_HAPPINESS", "YIELD");
	stages.forEach(([stage], i) => {
		const title = div("hud-overhaul-tip-row hud-overhaul-tip-heading");
		title.append(icon(UI.getIconURL(`YIELD_${stage}`, "YIELD"), 20));
		title.append(div("hud-overhaul-tip-section hud-overhaul-tip-name font-title text-2xs uppercase", `${plain(`LOC_UI_CITY_DETAILS_${stage}`)} (${levels[i].length})`));
		box.append(title, headingRule());
		// Locked, the heading opens and closes its level.
		const key = `levels-${stage}`;
		const closed = detailed && levels[i].length && closedGroups.has(key);
		if (detailed && levels[i].length) groupToggle(title, key, closed);
		if (closed) return;
		const list = [...levels[i]].sort((a, b) => b[1] - a[1]);
		if (!detailed) {
			if (list.length) box.append(nameList(list.map(([name]) => name)));
			return;
		}
		list.forEach(([name, happiness, city], i) => {
			if (i) rule(box);
			row(settlementBlock(box, city.location), settlementIcon(city), name, "", signed(happiness), happy, happiness < 0);
		});
	});
	return box;
}

function levelsPanel(detailed) {
	const player = Players.get(GameContext.localObserverID);
	return player?.Cities ? levelsBox(levelsData(player), detailed) : div("hud-overhaul-tip");
}

// Hovered, the top three and you; locked, every leader.
// Each victory's tab on the victories screen, by the names its tabs have
// (victories-screen.js); the summary for any other.
const VICTORY_TABS = {
	VICTORY_CLASS_MILITARY: "military",
	VICTORY_CLASS_CULTURE: "cultural",
	VICTORY_CLASS_ECONOMIC: "economic",
	VICTORY_CLASS_SCIENCE: "scientific",
};

// The victories screen on one tab, as the end of game screen opens it.
function openVictoryTab(tab) {
	ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true, attributes: { activeTabId: tab ?? "summary" } });
}

function victoriesPanel(detailed) {
	const box = div("hud-overhaul-tip");
	head(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_VICTORIES"));
	const classes = victoryClasses();
	for (const victory of standings()) {
		const [, emblem, colour] = classes[victory.cls];
		// Locked, the victory and its leaders open its tab of the victories
		// screen on a click.
		const block = detailed ? div("") : box;
		if (detailed) {
			box.append(block);
			clickable(block, () => {
				closePinned();
				openVictoryTab(VICTORY_TABS[victory.cls]);
			});
		}
		// Headed as the other tooltips' groups: the emblem, the name and your
		// place, over the rule, and under it the points to win. Locked, the
		// heading opens and closes the victory.
		const title = div("hud-overhaul-tip-row hud-overhaul-tip-heading");
		title.append(icon(emblem, 20));
		title.append(div("hud-overhaul-tip-section hud-overhaul-tip-name font-title text-2xs uppercase", victory.name));
		title.append(div("hud-overhaul-tip-you font-body text-xs", ordinal(victory.mine.place)));
		block.append(title, headingRule());
		const key = `victory-${victory.cls}`;
		const closed = detailed && closedGroups.has(key);
		if (detailed) groupToggle(title, key, closed);
		if (closed) continue;
		const goal = div("hud-overhaul-tip-tag font-body text-2xs", victory.goal > 0 ? Locale.compose("LOC_HUD_OVERHAUL_TIP_GOAL", victory.goal) : Locale.compose("LOC_HUD_OVERHAUL_TIP_MOST_POINTS"));
		goal.style.margin = `0 0 ${rem(2)} 0`;
		block.append(goal);
		// The top three, and you if not among them.
		const shown = detailed ? victory.scores : victory.scores.slice(0, 3);
		if (!shown.includes(victory.mine)) shown.push(victory.mine);
		const most = Math.max(1, victory.goal, ...victory.scores.map((score) => score.points));
		for (const score of shown) {
			const you = score == victory.mine;
			const el = div(`hud-overhaul-tip-row font-body text-xs${you ? " hud-overhaul-tip-you" : ""}`);
			el.append(div("hud-overhaul-tip-place", ordinal(score.place)));
			const leader = score.name == null ? Locale.compose("LOC_HUD_OVERHAUL_TIP_UNMET") : you ? Locale.compose("LOC_HUD_OVERHAUL_TIP_YOU", score.name) : score.name;
			el.append(div("hud-overhaul-tip-name", leader));
			if (score.dominant) el.append(div("hud-overhaul-tip-tag text-2xs", Locale.compose("LOC_HUD_OVERHAUL_TIP_WINS_IN", Math.max(0, victory.duration - score.turns))));
			const value = div("hud-overhaul-tip-value");
			value.append(div("", String(Math.round(score.points))));
			el.append(value);
			block.append(el);
			// A faint track, filled in the victory's colour by points.
			const track = div("hud-overhaul-tip-track");
			const fill = div("hud-overhaul-tip-fill");
			fill.style.width = `${Math.round((Math.max(0, score.points) / most) * 100)}%`;
			fill.style.backgroundColor = `rgba(${colour}, 0.75)`;
			track.append(fill);
			block.append(track);
		}
	}
	return box;
}

// Treasure convoys: the next one, and what they all bring home together.
// Each settlement making them has its turns to the next, a bar for how far
// it is there, and what each convoy brings. Locked, each also has its
// treasure resources, grey while unimproved, and the settlements whose
// treasure resources make no convoys follow, each with why. Locked, each
// group's heading opens and closes it.
function treasurePanel(detailed) {
	const player = Players.get(GameContext.localObserverID);
	const box = div("hud-overhaul-tip");
	const list = player && convoyAge() ? convoys(player) : [];
	const fleet = UI.getIconURL(TREASURE);
	const rows = [];
	if (list.length) {
		rows.push(chips(
			chip(fleet, Locale.compose("LOC_HUD_OVERHAUL_TIP_NEXT_CONVOY", list[0].turns)),
			chipOf(
				[UI.getIconURL("YIELD_GOLD", "YIELD"), signed(list.reduce((sum, { gold }) => sum + gold, 0))],
				["blp:victory_economic", Locale.compose("LOC_HUD_OVERHAUL_TIP_GDP", list.reduce((sum, { gdp }) => sum + gdp, 0))],
			),
		));
	}
	// Convoys already on their way home.
	const unit = GameInfo.Units.lookup("UNIT_TREASURE_FLEET");
	const atSea = unit && player?.Units ? player.Units.getNumUnitsOfType(unit.$hash) : 0;
	if (atSea > 0) rows.push(chips(chip(fleet, Locale.compose("LOC_HUD_OVERHAUL_TIP_AT_SEA", atSea))));
	head(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_TREASURE"), ...rows);
	const making = group(box, "treasure-making", Locale.compose("LOC_HUD_OVERHAUL_TIP_MAKING_CONVOYS"), list.length, detailed);
	(making ? list.slice(0, MAX_ROWS) : []).forEach(({ city, turns, goal, gold, gdp, resources }, i) => {
		if (detailed && i) rule(box);
		const block = detailed ? settlementBlock(box, city.location) : box;
		row(block, settlementIcon(city), Locale.compose(city.name), "", Locale.compose("LOC_HUD_OVERHAUL_TIP_TURNS", turns));
		const track = div("hud-overhaul-tip-track");
		const fill = div("hud-overhaul-tip-fill");
		fill.style.width = `${Math.round((Math.max(0, goal - turns) / Math.max(1, goal)) * 100)}%`;
		fill.style.backgroundColor = "rgba(212, 160, 23, 0.75)";
		track.append(fill);
		block.append(track, div("hud-overhaul-tip-effect font-body text-2xs", Locale.compose("LOC_HUD_OVERHAUL_TIP_EACH_CONVOY", gold, gdp)));
		if (detailed && resources.length) block.append(treasureLine(resources, true));
	});
	if (making) more(box, list.length - MAX_ROWS);
	if (!list.length) message(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_NO_CONVOYS"));
	const idle = detailed && player && convoyAge() ? idleTreasure(player) : [];
	if (idle.length && group(box, "treasure-idle", Locale.compose("LOC_HUD_OVERHAUL_TIP_NOT_MAKING_CONVOYS"), idle.length, detailed)) {
		idle.slice(0, MAX_ROWS).forEach(({ city, resources, distant }, i) => {
			if (i) rule(box);
			const block = settlementBlock(box, city.location);
			row(block, settlementIcon(city), Locale.compose(city.name), "", "");
			const why = distant ? "LOC_HUD_OVERHAUL_TIP_NOT_IMPROVED" : "LOC_HUD_OVERHAUL_TIP_NOT_DISTANT";
			block.append(div("hud-overhaul-tip-effect font-body text-2xs", Locale.compose(why)), treasureLine(resources, distant));
		});
		more(box, idle.length - MAX_ROWS);
	}
	return box;
}

// A settlement's treasure resources as small chips, the unimproved grey.
// Each icon has its class's badge, as the commerce screen's resources tab
// draws them: the Distant Lands' for those in the Distant Lands.
function treasureLine(resources, distant) {
	const line = div("hud-overhaul-tip-line");
	line.style.marginLeft = rem(24);
	const badge = UI.getIconURL(distant ? "RESOURCECLASS_TREASURE_FLEET" : "RESOURCECLASS_TREASURE");
	for (const { definition, improved } of resources) {
		const el = div("hud-overhaul-tip-chip hud-overhaul-tip-small font-body text-xs");
		el.append(badged(UI.getIconURL(definition.ResourceType), badge, 24), div("", Locale.compose(definition.Name)));
		if (!improved) el.classList.add("hud-overhaul-tip-idle");
		line.append(el);
	}
	return line;
}

// A resource's icon with its class's badge at half its size, centred on
// its bottom edge, as the commerce screen's resources tab draws it.
function badged(url, badge, px) {
	const el = div("hud-overhaul-tip-badged");
	el.style.width = rem(px);
	el.style.height = rem(px);
	const mark = icon(badge, px / 2);
	mark.classList.add("hud-overhaul-tip-badge");
	mark.style.left = rem(px / 4);
	el.append(icon(url, px), mark);
	return el;
}

// The civic or tech this player must complete for Merchants, the units
// that start trade routes, or null when they have them. The game's unlocks
// list every civ's; another civ's own civic is invalid for this player.
function merchantUnlock(player) {
	const nodes = [...GameInfo.ProgressionTreeNodeUnlocks]
		.filter((row) => row.TargetType == "UNIT_MERCHANT")
		.map((row) => GameInfo.ProgressionTreeNodes.lookup(row.ProgressionTreeNodeType))
		.filter((node) => node);
	if (!nodes.length) return null;
	const state = (node) => Game.ProgressionTrees.getNodeState(player.id, node.$hash);
	if (nodes.some((node) => state(node) >= ProgressionTreeNodeState.NODE_STATE_UNLOCKED)) return null;
	return nodes.find((node) => state(node) > ProgressionTreeNodeState.NODE_STATE_INVALID) ?? null;
}

function message(box, text) {
	box.append(div("hud-overhaul-tip-message font-body text-xs", text));
}

// A leader's portrait, first in a row, larger than a row's icon.
function portraitSize(rowEl) {
	rowEl.firstChild.style.width = rem(26);
	rowEl.firstChild.style.height = rem(26);
}

// A route's icon: its leader's portrait or its city-state's type, or else
// the settlement's icon, as the commerce screen picks it.
function routeIcon(route) {
	if (route.portrait) return route.portrait;
	if (route.capital) return "blp:res_capital";
	return route.town ? "blp:Yield_Towns" : "blp:Yield_Cities";
}

// A route's resources as a row of icons, for a row's value. A resource the
// route brings more than one of comes last, with "x2" close after its icon.
function resourceIcons(resources) {
	const el = div("hud-overhaul-tip-value");
	const counts = new Map();
	for (const { icon: url } of resources) counts.set(url, (counts.get(url) ?? 0) + 1);
	const order = [...counts].sort((a, b) => (a[1] > 1) - (b[1] > 1));
	order.forEach(([url, count], i) => {
		const part = icon(url, 18);
		if (i) part.style.marginLeft = rem(3);
		el.append(part);
		if (count > 1) {
			const times = div("text-2xs", `x${count}`);
			times.style.color = "#8d97a6";
			times.style.marginLeft = rem(1);
			el.append(times);
		}
	});
	return el;
}

// One route: its leader's portrait or city-state's type, the settlement and
// the resources it brings. Under it, why it cannot start, when given; locked, also where it
// runs from, by land or sea, and the gold it pays the settlement's owner.
function routeRow(box, route, detailed, reasons) {
	row(box, routeIcon(route), route.city, "", resourceIcons(route.resources), null);
	if (route.portrait) portraitSize(box.lastChild);
	// The settlement's name on one line, however long.
	box.lastChild.querySelector(".hud-overhaul-tip-name").style.whiteSpace = "nowrap";
	if (reasons) box.append(div("hud-overhaul-tip-effect font-body text-2xs", reasons));
	if (!detailed) return;
	const parts = [Locale.stylize(route.sea ? "LOC_HUD_OVERHAUL_TIP_TRADE_BY_SEA" : "LOC_HUD_OVERHAUL_TIP_TRADE_BY_LAND", route.from)];
	if (route.gold) parts.push(Locale.stylize("LOC_HUD_OVERHAUL_TIP_TRADE_PAYS", route.gold, route.cityState ? route.city : route.leader));
	// Stylized, for the gold icon in the text.
	const line = div("hud-overhaul-tip-effect font-body text-2xs");
	line.innerHTML = parts.join(" ");
	box.append(line);
}

// Hovered, the routes running, each leader's and city-state's routes
// against their limit, and the settlements a route could go to now, by
// name; locked, each of those settlements with what it would bring, and the
// settlements no route can reach yet, with why, and each group's heading
// opens and closes it.
function tradePanel(detailed) {
	const player = Players.get(GameContext.localObserverID);
	const box = div("hud-overhaul-tip");
	const list = player?.Trade ? partners(player).sort((a, b) => b[2] - a[2] || b[1] - a[1]) : [];
	const used = list.reduce((sum, [, routes]) => sum + routes, 0);
	const limit = list.reduce((sum, [, , cap]) => sum + cap, 0);
	const trade = UI.getIconURL("YIELD_TRADES");
	const { active, available, unavailable } = player?.Trade ? tradeRoutes(player) : { active: [], available: [], unavailable: [] };
	const idle = player ? merchants(player) : 0;
	const rows = [chip(trade, Locale.compose("LOC_HUD_OVERHAUL_TIP_TRADE_IN_USE", used, limit))];
	if (idle) rows.push(chip(UI.getIconURL("UNIT_MERCHANT"), Locale.compose("LOC_HUD_OVERHAUL_TIP_MERCHANTS", idle)));
	head(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_TRADE"), chips(...rows));
	// Why there are none, when there are none.
	const unlock = player ? merchantUnlock(player) : null;
	if (unlock) message(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_NEED_MERCHANTS", Locale.compose(unlock.Name)));
	if (!list.length) {
		message(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_MEET_LEADERS"));
		return box;
	}
	if (active.length && group(box, "trade-active", Locale.compose("LOC_HUD_OVERHAUL_TIP_ACTIVE_ROUTES"), active.length, detailed)) {
		for (const [i, route] of (detailed ? active : active.slice(0, MAX_ROWS)).entries()) {
			if (detailed && i) rule(box);
			routeRow(detailed ? settlementBlock(box, route.location) : box, route, detailed);
		}
		if (!detailed) more(box, active.length - MAX_ROWS);
	}
	// The leaders, then the city-states, each with its routes against its
	// limit.
	const partnerGroup = (key, title, members) => {
		if (!members.length || !group(box, key, title, members.length, detailed)) return;
		for (const [name, routes, cap, portrait] of members.slice(0, MAX_ROWS)) {
			row(box, portrait, name, "", Locale.compose("LOC_HUD_OVERHAUL_TRADE_COUNT", routes, cap), trade);
			portraitSize(box.lastChild);
			// A faint track, filled by the routes used of the limit.
			const track = div("hud-overhaul-tip-track");
			const fill = div("hud-overhaul-tip-fill");
			fill.style.width = `${cap ? Math.round((Math.min(routes, cap) / cap) * 100) : 0}%`;
			fill.style.backgroundColor = "rgba(150, 140, 120, 0.8)";
			// Under the name, which the larger portrait moves along.
			track.style.marginLeft = rem(32);
			track.append(fill);
			box.append(track);
		}
		more(box, members.length - MAX_ROWS);
	};
	partnerGroup("trade-leaders", Locale.compose("LOC_HUD_OVERHAUL_TIP_LEADERS"), list.filter((partner) => !partner[4]));
	partnerGroup("trade-city-states", Locale.compose("LOC_HUD_OVERHAUL_TIP_CITY_STATES"), list.filter((partner) => partner[4]));
	const open = group(box, "trade-available", Locale.compose("LOC_HUD_OVERHAUL_TIP_AVAILABLE_ROUTES", available.length), null, detailed, available.length);
	if (!available.length) message(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_NO_AVAILABLE_ROUTES"));
	else if (!detailed) box.append(nameList(available.map((route) => route.city)));
	else if (open) {
		for (const [i, route] of available.entries()) {
			if (i) rule(box);
			routeRow(settlementBlock(box, route.location), route, detailed);
		}
	}
	if (available.length && !unlock && idle == 0) message(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_TRAIN_MERCHANT"));
	else if (!unlock && used == 0 && available.length) message(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_NO_ROUTES"));
	if (detailed && unavailable.length && group(box, "trade-unavailable", Locale.compose("LOC_HUD_OVERHAUL_TIP_UNAVAILABLE_ROUTES", unavailable.length), null, detailed, unavailable.length)) {
		for (const [i, route] of unavailable.entries()) {
			if (i) rule(box);
			const reasons = route.reasons.join(", ");
			routeRow(settlementBlock(box, route.location), route, false, reasons.charAt(0).toUpperCase() + reasons.slice(1));
		}
	}
	return box;
}

// Yields as "+2 [culture] +1 [science]", for a row's value.
function yieldsValue(yields) {
	const el = div("hud-overhaul-tip-value");
	WORK_YIELDS.filter((type) => yields[type]).forEach((type, i) => {
		const text = div("", signed(yields[type]));
		if (i) text.style.marginLeft = rem(6);
		el.append(text, icon(UI.getIconURL(type, "YIELD"), 16));
	});
	return el;
}

// A work's row, its picture larger than a row's icon.
function workRow(box, { name, image }) {
	row(box, image, name, "", "", null);
	const picture = box.lastChild.firstChild;
	picture.style.width = rem(26);
	picture.style.height = rem(26);
}

// "Codex x3, Scroll" from a list of works.
function tally(works) {
	const counts = new Map();
	for (const { name } of works) counts.set(name, (counts.get(name) ?? 0) + 1);
	return [...counts].map(([name, count]) => (count > 1 ? `${name} x${count}` : name)).join(", ");
}

// Hovered, each settlement with its slots and yields, and the stored works
// on one line; locked, each building under its settlement with the works
// in it, and every stored work, each with its picture.
function greatWorksPanel(detailed) {
	const player = Players.get(GameContext.localObserverID);
	const box = div("hud-overhaul-tip");
	if (!player?.Cities) return box;
	const { settlements, stored, total, slots, filled, yields } = greatWorks(player);
	const rows = [chips(chip(GREAT_WORKS_ICON, Locale.compose("LOC_HUD_OVERHAUL_TIP_N_WORKS", total)), chip(null, Locale.compose("LOC_HUD_OVERHAUL_TIP_SLOTS_FILLED", filled, slots)))];
	const totals = WORK_YIELDS.filter((type) => yields[type]).map((type) => [UI.getIconURL(type, "YIELD"), Locale.compose("LOC_HUD_OVERHAUL_TIP_PER_TURN", signed(yields[type]))]);
	if (totals.length) rows.push(chips(chipOf(...totals)));
	head(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_GREAT_WORKS"), ...rows);
	if (!total) {
		message(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_NO_WORKS"));
		return box;
	}
	section(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_ON_DISPLAY"));
	const shown = settlements.filter((settlement) => settlement.works);
	for (const [i, settlement] of (detailed ? shown : shown.slice(0, MAX_ROWS)).entries()) {
		if (detailed && i) rule(box);
		const tag = Locale.compose("LOC_HUD_OVERHAUL_TIP_SLOTS", settlement.works, settlement.slots);
		if (!detailed) {
			row(box, settlementIcon(settlement), settlement.name, tag, yieldsValue(settlement.yields), null);
			continue;
		}
		// Locked, the settlement and its buildings go to it on a click.
		const block = settlementBlock(box, settlement.location);
		row(block, settlementIcon(settlement), settlement.name, tag, yieldsValue(settlement.yields), null);
		for (const building of settlement.buildings) {
			if (!building.works.length) continue;
			row(block, UI.getIconURL(building.type, "BUILDING"), building.name, Locale.compose("LOC_HUD_OVERHAUL_TIP_SLOTS", building.works.length, building.slots), yieldsValue(building.yields), null);
			block.lastChild.style.marginLeft = rem(24);
			for (const work of building.works) {
				workRow(block, work);
				block.lastChild.style.marginLeft = rem(48);
			}
		}
	}
	if (!detailed) more(box, shown.length - MAX_ROWS);
	if (!shown.length) none(box);
	if (stored.length) {
		section(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_IN_STORAGE", stored.length));
		if (detailed) for (const work of stored) workRow(box, work);
		else box.append(div("hud-overhaul-tip-names font-body text-xs", tally(stored)));
		message(box, Locale.compose(filled < slots ? "LOC_HUD_OVERHAUL_TIP_STORED_FREE_SLOT" : "LOC_HUD_OVERHAUL_TIP_STORED_NO_SLOT"));
	}
	return box;
}

// The game's urban and rural icons, as its city details panel shows them.
const PEOPLES = [
	["blp:fi_city_urban_64", "LOC_DISTRICT_URBAN_NAME"],
	["blp:fi_city_rural_64", "LOC_DISTRICT_RURAL_NAME"],
];

// A settlement's urban and rural people side by side: the icon, how many
// people, and their religion's icon or a dash.
function peoples(settlement) {
	const el = div("hud-overhaul-tip-value");
	const part = ([url], faith, people) => {
		const half = div("hud-overhaul-tip-line hud-overhaul-tip-people");
		half.append(icon(url, 16), div("hud-overhaul-tip-count hud-overhaul-tip-tag text-2xs", String(people)));
		half.append(faith ? icon(faith.icon, 16) : div("hud-overhaul-tip-dash hud-overhaul-tip-tag", "-"));
		return half;
	};
	el.append(part(PEOPLES[0], settlement.urban, settlement.urbanPop), part(PEOPLES[1], settlement.rural, settlement.ruralPop));
	return el;
}

// The key to the urban and rural icons, each over its column.
function peoplesKey(box) {
	const el = div("hud-overhaul-tip-row font-body text-2xs");
	const value = div("hud-overhaul-tip-value");
	for (const [url, name] of PEOPLES) {
		const half = div("hud-overhaul-tip-line hud-overhaul-tip-people");
		half.append(icon(url, 16), div("hud-overhaul-tip-key-text", Locale.compose(name)));
		value.append(half);
	}
	el.append(div("hud-overhaul-tip-name"), value);
	box.append(el);
}

// The religion screen's heading for each class of belief.
const BELIEF_HEADINGS = {
	BELIEF_CLASS_RELIQUARY: "LOC_UI_ESTABLISH_BELIEFS_RELIQUARY_BELIEFS",
	BELIEF_CLASS_FOUNDER: "LOC_UI_ESTABLISH_BELIEFS_FOUNDER_BELIEFS",
	BELIEF_CLASS_ENHANCER: "LOC_UI_ESTABLISH_BELIEFS_ENHANCER_BELIEF",
};

// Hovered, the religion's name, your settlements with their urban and rural
// people, and each religion's share of the world's settlements; locked, its
// beliefs with their effects too, and every settlement rather than the
// first few.
function religionPanel(detailed) {
	const player = Players.get(GameContext.localObserverID);
	const box = div(`hud-overhaul-tip ${WIDE}`);
	if (!player?.Religion) return box;
	const { mine, beliefs, world, settlements, following, percent, canFound } = religion(player);
	const rows = [];
	if (mine) {
		const name = div("hud-overhaul-tip-line font-body text-sm");
		const label = div("", mine.name);
		label.style.marginLeft = rem(4);
		name.append(icon(mine.icon, 20), label);
		rows.push(name, chips(chip(mine.icon, Locale.compose("LOC_HUD_OVERHAUL_TIP_WORLD_SHARE", percent)), chip(settlementIcon(), Locale.compose("LOC_HUD_OVERHAUL_TIP_YOURS_FOLLOWING", following, settlements.length))));
	}
	head(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_RELIGION"), ...rows);
	if (!mine) message(box, Locale.compose(canFound ? "LOC_HUD_OVERHAUL_TIP_CAN_FOUND" : "LOC_HUD_OVERHAUL_TIP_NOT_FOUNDED"));
	// Under the religion screen's headings, in its order: reliquary, founder,
	// enhancer.
	for (const [i, belief] of (detailed ? beliefs : []).entries()) {
		if (belief.type != beliefs[i - 1]?.type) section(box, BELIEF_HEADINGS[belief.type] ? Locale.compose(BELIEF_HEADINGS[belief.type]) : belief.kind || Locale.compose("LOC_HUD_OVERHAUL_TIP_BELIEFS"));
		else rule(box);
		row(box, null, belief.name, "", "");
		// The game's own text, with its icons.
		const effect = div("hud-overhaul-tip-effect font-body text-2xs");
		effect.innerHTML = belief.text;
		box.append(effect);
	}
	section(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_YOUR_SETTLEMENTS"));
	peoplesKey(box);
	// Those following your religion first.
	const follows = (settlement) => (mine && settlement.majority?.type == mine.type ? 1 : 0);
	const list = [...settlements].sort((a, b) => follows(b) - follows(a));
	for (const [i, settlement] of (detailed ? list : list.slice(0, MAX_ROWS)).entries()) {
		if (detailed && i) rule(box);
		const host = detailed ? settlementBlock(box, settlement.location) : box;
		row(host, settlementIcon(settlement), settlement.name, "", peoples(settlement), null);
		const line = host.lastChild;
		// The holy city's label in gold, straight after its name.
		if (settlement.holy) {
			const name = line.querySelector(".hud-overhaul-tip-name");
			name.classList.add("hud-overhaul-tip-line");
			name.append(div("hud-overhaul-tip-holy", Locale.compose("LOC_HUD_OVERHAUL_TIP_HOLY_CITY")));
		}
		// Its religion's icon after its own, or a gap as wide, so the names
		// line up.
		const faith = settlement.majority ? icon(settlement.majority.icon, 18) : div("shrink-0");
		faith.style.width = rem(18);
		faith.style.marginLeft = rem(3);
		line.firstChild.after(faith);
	}
	if (!detailed) more(box, list.length - MAX_ROWS);
	section(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_WORLD_SETTLEMENTS"));
	const share = (count) => (world.total ? Math.round((count / world.total) * 100) : 0);
	const shareRow = (url, name, owner, count) => {
		row(box, url, name, owner, Locale.compose("LOC_HUD_OVERHAUL_TIP_SHARE", share(count), count), null);
		// A faint track, filled by the share.
		const track = div("hud-overhaul-tip-track");
		const fill = div("hud-overhaul-tip-fill");
		fill.style.width = `${share(count)}%`;
		fill.style.backgroundColor = "rgba(200, 185, 140, 0.8)";
		track.append(fill);
		box.append(track);
	};
	for (const faith of world.religions) {
		const owner = faith.owner == player.id ? Locale.compose("LOC_HUD_OVERHAUL_TIP_FOUNDED_BY_YOU") : faith.ownerName;
		shareRow(faith.icon, faith.name, owner, faith.settlements);
	}
	shareRow(null, Locale.compose("LOC_HUD_OVERHAUL_TIP_NO_RELIGION"), "", world.none);
	return box;
}

// Resources per line in the hovered tooltip.
const RESOURCES_PER_LINE = 7;

// Classes whose resources are assigned to a settlement.
const ASSIGNABLE = ["RESOURCECLASS_CITY", "RESOURCECLASS_BONUS", "RESOURCECLASS_FACTORY"];

// Hovered, a chip per kind of resource with how many, seven to a line,
// dimmed while a copy waits to be assigned; locked, a row per kind with what
// it does and where it is assigned, which the locked tooltip can scroll
// through late in the game. The lines are built here: the game's layout
// miscounts the height of wrapped chips.
// byClass is holdings() from hud-overhaul-resources.js; waiting, how many
// wait to be assigned.
export function resourcesBox({ byClass, waiting }, detailed) {
	const box = div("hud-overhaul-tip");
	const shown = RESOURCE_CLASSES.filter(([type, , always]) => always || byClass[type]?.length);
	const counts = shown.map(([type]) => [UI.getIconURL(type), String(byClass[type]?.length ?? 0)]);
	const rows = [chips(chipOf(...counts))];
	if (waiting > 0) rows.push(chips(chip(null, Locale.compose("LOC_HUD_OVERHAUL_TIP_TO_ASSIGN", waiting))));
	head(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_RESOURCES"), ...rows);
	for (const [type, name] of shown) {
		const list = byClass[type] ?? [];
		// Headed by the class's icon, the one the pill and chip show.
		// Locked, the heading opens and closes its class.
		const title = div("hud-overhaul-tip-row hud-overhaul-tip-heading");
		title.append(icon(UI.getIconURL(type), 20));
		title.append(div("hud-overhaul-tip-section hud-overhaul-tip-name font-title text-2xs uppercase", `${Locale.compose(name)} (${list.length})`));
		box.append(title, headingRule());
		const closed = detailed && list.length && closedGroups.has(type);
		if (detailed && list.length) groupToggle(title, type, closed);
		if (closed) continue;
		if (!list.length) {
			none(box);
			continue;
		}
		const kinds = new Map();
		for (const { definition, settlement } of list) {
			const held = kinds.get(definition.ResourceType) ?? { definition, count: 0, settlements: [] };
			held.count++;
			if (settlement) held.settlements.push(settlement);
			kinds.set(definition.ResourceType, held);
		}
		const idle = ({ count, settlements }) => ASSIGNABLE.includes(type) && settlements.length < count;
		if (!detailed) {
			const all = [...kinds.values()];
			const grid = div("hud-overhaul-tip-grid");
			for (let i = 0; i < all.length; i += RESOURCES_PER_LINE) {
				const line = div("hud-overhaul-tip-line");
				for (const held of all.slice(i, i + RESOURCES_PER_LINE)) {
					const el = chip(UI.getIconURL(held.definition.ResourceType), String(held.count));
					el.classList.add("hud-overhaul-tip-small");
					if (idle(held)) el.classList.add("hud-overhaul-tip-idle");
					line.append(el);
				}
				grid.append(line);
			}
			box.append(grid);
			continue;
		}
		// One row per kind: what it does, in the game's words, and where its
		// copies are assigned.
		for (const [i, held] of [...kinds.values()].entries()) {
			if (i) rule(box);
			const { definition, count, settlements } = held;
			const resource = Locale.compose(definition.Name);
			row(box, UI.getIconURL(definition.ResourceType), count > 1 ? `${resource} x${count}` : resource, "", "", null);
			if (idle(held)) box.lastChild.classList.add("hud-overhaul-tip-idle");
			if (definition.Tooltip) {
				const effect = div("hud-overhaul-tip-effect font-body text-2xs");
				effect.innerHTML = Locale.stylize(definition.Tooltip);
				box.append(effect);
			}
			if (ASSIGNABLE.includes(type)) {
				const where = settlements.length ? Locale.compose("LOC_HUD_OVERHAUL_TIP_ASSIGNED", [...new Set(settlements)].join(", ")) : "";
				const left = count - settlements.length;
				const text = [where, left > 0 ? Locale.compose("LOC_HUD_OVERHAUL_TIP_UNASSIGNED", left) : ""].filter((part) => part).join(" ");
				box.append(div("hud-overhaul-tip-effect hud-overhaul-tip-tag font-body text-2xs", text));
			}
		}
	}
	return box;
}

function resourcesPanel(detailed) {
	const player = Players.get(GameContext.localObserverID);
	if (!player?.Resources) return div("hud-overhaul-tip");
	return resourcesBox({ byClass: holdings(player), waiting: player.Resources.getCountResourcesToAssign() }, detailed);
}

// Units by kind: each kind with how many, commanders first, the units in
// their armies counted. Locked, each unit with where it is, and under it its
// health, moves and strength, a faint rule between every two. A commander shows its
// army's units against its slots, in yellow while some are open, and an
// arrow that opens its army: the units packed into it beneath it,
// indented. A click on a unit goes to it; on a packed one, to its
// commander. Locked, a group's heading opens and closes it, open to begin
// with; closed, it gives how many units the group has.
function unitGroup(box, title, list, detailed) {
	const count = list.reduce((sum, unit) => sum + 1 + (unit.army?.units.length ?? 0), 0);
	if (!group(box, title, title, count, detailed, list.length)) return;
	if (!list.length) {
		none(box);
		return;
	}
	if (!detailed) {
		const kinds = new Map();
		for (const unit of list.flatMap((unit) => [unit, ...(unit.army?.units ?? [])])) {
			const kind = kinds.get(unit.type) ?? { ...unit, count: 0 };
			kind.count++;
			kinds.set(unit.type, kind);
		}
		const rows = [...kinds.values()].sort((a, b) => b.commander - a.commander || b.count - a.count || a.name.localeCompare(b.name));
		for (const kind of rows.slice(0, MAX_ROWS)) row(box, kind.icon, kind.name, "", String(kind.count));
		more(box, rows.length - MAX_ROWS);
		return;
	}
	const unitRow = (unit, tag, value, target) => {
		const el = div("hud-overhaul-tip-unit");
		row(el, unit.icon, unit.name, tag, "", null);
		el.append(unitStats(unit, value));
		box.append(el);
		el.addEventListener("click", (event) => {
			event.stopPropagation();
			try {
				goTo(target);
			} catch (error) {
				console.error(`${TAG} tooltips: cannot go to the unit: ${error}`);
			}
		});
		return el;
	};
	list.forEach((unit, index) => {
		if (index) rule(box);
		const where = unit.place || Locale.compose("LOC_HUD_OVERHAUL_TIP_UNIT_FIELD");
		if (!unit.army) {
			unitRow(unit, where, null, unit);
			return;
		}
		const { key, units: packed, slots } = unit.army;
		const el = unitRow(unit, where, Locale.compose("LOC_HUD_OVERHAUL_TIP_UNIT_SLOTS", packed.length, slots), unit);
		if (!packed.length) return;
		// An arrow at the end of the commander's line opens or closes its
		// army, closed to begin with.
		const open = openArmies.has(key);
		const toggle = div("hud-overhaul-tip-toggle");
		toggle.append(div(`hud-overhaul-tip-chevron${open ? " hud-overhaul-tip-chevron-up" : ""}`));
		toggle.addEventListener("click", (event) => {
			event.stopPropagation();
			if (open) openArmies.delete(key);
			else openArmies.add(key);
			drawPinned();
		});
		el.firstChild.append(toggle);
		if (!open) return;
		for (const member of packed) {
			rule(box);
			unitRow(member, "", null, unit).classList.add("hud-overhaul-tip-nested");
		}
	});
}

// The armies open in the locked units tooltip, by their key, and the groups
// closed in a locked tooltip, by their key, kept while the game runs.
const openArmies = new Set();
const closedGroups = new Set();

// A group's heading; locked, it opens and closes the group, and closed
// gives how many it has, unless the title has the count already (count
// null). Returns whether the group is open. key is its in closedGroups;
// an empty group cannot close.
function group(box, key, title, count, detailed, size = count) {
	const closed = !!(detailed && size && closedGroups.has(key));
	section(box, closed && count != null ? `${title} (${count})` : title);
	if (detailed && size) groupToggle(box.lastChild.previousSibling, key, closed);
	return !closed;
}

// Makes a group's heading in a locked tooltip open and close it, with a
// chevron at its end, down while closed. key is the group's in closedGroups.
function groupToggle(heading, key, closed) {
	heading.classList.add("hud-overhaul-tip-group");
	const toggle = div("hud-overhaul-tip-toggle");
	toggle.append(div(`hud-overhaul-tip-chevron${closed ? "" : " hud-overhaul-tip-chevron-up"}`));
	heading.append(toggle);
	heading.addEventListener("click", (event) => {
		event.stopPropagation();
		if (closed) closedGroups.delete(key);
		else closedGroups.add(key);
		drawPinned();
	});
}

// The unit panel's icons for health, moves and melee strength.
const UNIT_STATS = {
	health: "fs://game/prod_generic.png",
	moves: "fs://game/Action_Move.png",
	strength: "fs://game/Action_Attack.png",
};

// The unit panel's health bar colours: green, then yellow from 75% down and
// red below 50%, as it switches them (unit-actions.js, updateHealth).
function healthColour(unit) {
	const share = unit.hp / unit.maxHp;
	if (share < 0.5) return "#bb2823";
	return share <= 0.75 ? "#cea92f" : "#9bd371";
}

// A unit's health, moves and strength as the unit panel shows them, health
// in its bar's colour. A commander has its army's units against its slots
// in strength's column instead, with no icon, in yellow while some are
// open; civilians leave it empty.
function unitStats(unit, slots) {
	const el = div("hud-overhaul-tip-stats font-body text-2xs");
	const stat = (kind, text, url = UNIT_STATS[kind]) => {
		const cell = div(`hud-overhaul-tip-stat hud-overhaul-tip-stat-${kind}`);
		// No icon keeps a gap as wide, so the numbers line up.
		if (text) cell.append(url ? icon(url, 14) : div("hud-overhaul-tip-stat-gap"), div("hud-overhaul-tip-stat-text", text));
		return cell;
	};
	const health = stat("health", String(unit.hp));
	health.lastChild.style.color = healthColour(unit);
	const last = slots ? stat("strength", slots, null) : stat("strength", unit.strength ? String(unit.strength) : "");
	if (slots && unit.army.units.length < unit.army.slots) last.lastChild.style.color = OPEN_SLOTS;
	el.append(health, stat("moves", `${unit.moves}/${unit.maxMoves}`), last);
	return el;
}

// An army's slot count while some are open: the health bar's yellow.
const OPEN_SLOTS = "#cea92f";

// The game's land, sea and air domains, each a heading of its own.
const DOMAINS = [
	["DOMAIN_LAND", "LOC_HUD_OVERHAUL_TIP_LAND"],
	["DOMAIN_SEA", "LOC_HUD_OVERHAUL_TIP_NAVAL"],
	["DOMAIN_AIR", "LOC_HUD_OVERHAUL_TIP_AIR"],
];

function unitsPanel(detailed) {
	const player = Players.get(GameContext.localObserverID);
	const box = div("hud-overhaul-tip");
	const { military, civilian, count } = player ? units(player) : { military: [], civilian: [], count: { military: 0, civilian: 0 } };
	// The chips marked as the pill marks the two counts.
	const kind = ([name, tint], text) => {
		const el = chip(iconURL(name), text, 17, 4);
		el.firstChild.style.fxsBackgroundImageTint = tint;
		return el;
	};
	// Combat strength, as the ribbon's row gives it (hud-overhaul-military.js).
	const total = chip(UI.getIconURL("MILITARY"), Locale.compose("LOC_HUD_OVERHAUL_TIP_COMBAT_STRENGTH", player ? combatStrength(player)[0] : 0));
	head(box, Locale.compose("LOC_HUD_OVERHAUL_UNITS_TITLE"), chips(kind(MILITARY_UNITS, Locale.compose("LOC_HUD_OVERHAUL_TIP_N_MILITARY", count.military)), kind(CIVILIAN, Locale.compose("LOC_HUD_OVERHAUL_TIP_N_CIVILIAN", count.civilian))), chips(total));
	// Military units by domain, each with units under its own heading; with
	// none at all, one Military heading saying so.
	const domains = DOMAINS.map(([domain, title]) => [title, military.filter((unit) => unit.domain == domain)]).filter(([, list]) => list.length);
	if (!domains.length) domains.push(["LOC_HUD_OVERHAUL_TIP_MILITARY", []]);
	for (const [title, list] of domains) unitGroup(box, Locale.compose(title), list, detailed);
	unitGroup(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_CIVILIANS"), civilian, detailed);
	if (detailed && military.length + civilian.length) message(box, Locale.compose("LOC_HUD_OVERHAUL_TIP_UNIT_CLICK"));
	return box;
}

// The screen a locked tooltip's head opens, as its pill did before this
// mod: the yields report, as the game's own pills open it, the victories
// screen, as the dock's button, the commerce screen on the tab for
// resources, convoys and trade routes, the great works screen and the
// religion screen.
function screen(name) {
	return () => ContextManager.push(name, { singleton: true, createMouseGuard: true });
}
const yieldsReport = screen("player-yields-report-screen");
const victoryScreen = screen("screen-victory-progress");
const commerce = (tab) => () => openCommerce(tab);

// [pill's data-icon, tooltip component, its panel, the screen its head
// opens when locked].
const PANELS = [
	...YIELDS.map(([type, name, colour]) => [type, `hud-overhaul-tip-${type.toLowerCase().replace(/_/g, "-")}`, (detailed) => yieldPanel(type, name, colour, detailed), yieldsReport]),
	["YIELD_CITIES", "hud-overhaul-tip-settlements", settlementsPanel, yieldsReport],
	["YIELD_HAPPY", "hud-overhaul-tip-levels", levelsPanel, yieldsReport],
	[VICTORIES, "hud-overhaul-tip-victories", victoriesPanel, victoryScreen],
	[RESOURCES, "hud-overhaul-tip-resources", resourcesPanel, commerce(COMMERCE_TABS.resources)],
	[TREASURE, "hud-overhaul-tip-treasure", treasurePanel, commerce(COMMERCE_TABS.treasure)],
	[TRADE, "hud-overhaul-tip-trade", tradePanel, commerce(COMMERCE_TABS.trade)],
	[GREAT_WORKS, "hud-overhaul-tip-greatworks", greatWorksPanel, openGreatWorks],
	[RELIGION, "hud-overhaul-tip-religion", religionPanel, openReligion],
	[UNITS, "hud-overhaul-tip-units", unitsPanel, null],
];

// The inspect key's name, as the game's key hints read it (getKBMInputInfo
// in core/ui-next/components/nav-help.js).
function inspectKey() {
	try {
		const id = Input.getActionIdByName("keyboard-inspect-tooltip");
		return Input.getGestureDisplayString(id, 0, InputDeviceType.Keyboard, InputContext.ALL) || "K";
	} catch {
		return "K";
	}
}

// "INSPECT [K]" under a tooltip, or "CLOSE [K]" under a locked one, as the
// plot tooltip has it: the word, then the key on the game's key art.
function hint(locked) {
	const el = div("hud-overhaul-tip-hint");
	const word = div(`font-body text-sm uppercase ${locked ? "text-accent-1" : "text-accent-3"}`, Locale.compose(locked ? "LOC_GENERIC_CLOSE" : "LOC_INSPECT_TOOLTIP"));
	const key = div("hud-overhaul-tip-key");
	key.append(div("uppercase text-xs text-accent-1", inspectKey()));
	el.append(word, key);
	return el;
}

// The last of these tooltips drawn, to find the game's frame around it.
let shown = null;

// A pill's tooltip: drawn each time it shows, so its numbers are current.
function tooltipClass(panel) {
	return class extends Component {
		onAttach() {
			super.onAttach();
			shown = this.Root;
			this.draw();
		}
		onAttributeChanged() {
			this.draw();
		}
		onDetach() {
			this.widen(0);
			super.onDetach();
		}
		draw() {
			try {
				this.Root.innerHTML = "";
				const box = panel(false);
				box.append(hint(false));
				this.Root.append(box);
				this.widen(box.classList.contains(WIDE) ? WIDE_PX : scale > 1 ? NARROW_PX : 0);
			} catch (error) {
				console.error(`${TAG} tooltips: ${error}`);
			}
		}
		// The game's frame is narrower than a wide panel. It is shared by
		// every tooltip, so it is put back as this one goes, unless another
		// has widened it since: after a lock, the old tooltip goes only
		// once the next has been drawn. The game sets the frame's width
		// back each time it shows a tooltip (tooltip-controller.js,
		// showTooltipElement), and after a lock shows this one again
		// without drawing it, so it is widened again then. A panel the
		// player has made bigger widens it too. px is the panel's widest,
		// or 0 for the game's own width.
		widen(px) {
			const on = px > 0;
			this.watcher?.disconnect();
			this.watcher = null;
			const frame = on ? frameOf(this.Root) : this.frame;
			if (!frame) return;
			if (on) widenedBy = this;
			else if (widenedBy !== this) return (this.frame = null);
			const wide = frameRem(px * scale + FRAME_PADDING * 2);
			frame.style.maxWidth = on ? wide : "";
			this.frame = on ? frame : null;
			if (!on) {
				widenedBy = null;
				return;
			}
			this.watcher = new MutationObserver(() => {
				if (widenedBy === this && this.Root.isConnected && frame.style.maxWidth == GAME_FRAME_WIDTH) frame.style.maxWidth = wide;
			});
			this.watcher.observe(frame, { attributes: true, attributeFilter: ["style"] });
		}
	};
}

// The width the game gives its frame as it shows a tooltip.
const GAME_FRAME_WIDTH = "21.333rem";

// The tooltip that last widened the game's frame.
let widenedBy = null;

// The pill under the mouse, and the locked tooltip if one is open.
let hovered = null;
let pinned = null;
let onBar = false; // the mouse is on the top bar

function syncQuiet() {
	document.documentElement.classList.toggle(QUIET, onBar && !!pinned);
}

// The game's frame around the tooltip on screen: the outermost element
// around it with a tooltip class.
function frameOf(element) {
	let frame = null;
	for (let el = element; el && el !== document.body; el = el.parentElement) {
		if (typeof el.className == "string" && /tooltip/.test(el.className)) frame = el;
	}
	return frame;
}

function closePinned() {
	if (!pinned) return;
	const { root, pill, watcher, scrollbar } = pinned;
	pinned = null;
	watcher.disconnect();
	scrollbar.disconnect();
	root.remove();
	syncQuiet();
	// The pill's own tooltip back, so it shows on hover again.
	if (enabled() && partOn("tooltips")) pill.setAttribute("data-tooltip-component", pinnedTag(pill));
	pill.setAttribute("data-tooltip-content", pill.dataset.hudOverhaulTipText ?? "");
}

// The locked tooltip in full detail, in the game's scroll box when taller
// than the screen allows. Its contents are swapped in place, so a redraw
// keeps the scroll.
function drawPinned() {
	if (!pinned) return;
	const { content, footer, panel, link } = pinned;
	content.innerHTML = "";
	content.append(panel(true));
	// The head, its title and values, is the link to the pill's screen.
	const top = link && content.querySelector(".hud-overhaul-tip-head");
	if (top) {
		top.classList.add("hud-overhaul-tip-head-link");
		top.addEventListener("click", onLinkClick);
	}
	footer.innerHTML = "";
	footer.append(hint(true));
	fitPinned();
	// The footer has no height until laid out.
	requestAnimationFrame(() => requestAnimationFrame(fitPinned));
}

// Down to the bottom of the screen, less the footer and the frame.
function fitPinned() {
	if (!pinned) return;
	const top = pinned.root.getBoundingClientRect().top;
	const rest = pinned.footer.getBoundingClientRect().height + 48;
	pinned.scroll.style.maxHeight = `${Math.max(200, window.innerHeight - top - rest)}px`;
	roomForScrollbar();
}

// Room for the scrollbar only while it shows: the game hides it when
// everything fits.
function roomForScrollbar() {
	if (!pinned) return;
	const track = pinned.scroll.querySelector(".fxs-scrollbar__track--vertical");
	const shown = !!track && !track.classList.contains("hidden");
	if (pinned.content.classList.contains("hud-overhaul-tip-scrolled") != shown) pinned.content.classList.toggle("hud-overhaul-tip-scrolled", shown);
}

// A locked tooltip's head opens its screen, and closes the tooltip.
function onLinkClick(event) {
	event.stopPropagation();
	if (!pinned?.link) return;
	const open = pinned.link;
	closePinned();
	try {
		open();
	} catch (error) {
		console.error(`${TAG} tooltips: cannot open its screen: ${error}`);
	}
}

// A click on a pill with one of these tooltips locks it open, or closes it
// when it is the one open, in place of opening the pill's screen: the
// tooltip's head opens that. It runs on the top bar before the pills' own
// listeners, the game's and this mod's, and stops them.
function onActivate(event) {
	try {
		if (!enabled() || !partOn("tooltips")) return;
		const pill = event.target?.closest?.("yield-bar-entry");
		if (!pill || !PANELS.some(([icon]) => icon == pill.dataset.icon)) return;
		event.stopImmediatePropagation();
		event.stopPropagation();
		event.preventDefault();
		if (pinned?.pill == pill) closePinned();
		else openPinned(pill);
	} catch (error) {
		console.error(`${TAG} tooltips: ${error}`);
	}
}

function pinnedTag(pill) {
	return PANELS.find(([icon]) => icon == pill.dataset.icon)?.[1];
}

// Locks the tooltip on screen where it is, in the game's frame, and turns
// the pill's own off: no component and no text. The game redraws its
// tooltip when the text changes, so it is then closed as the game does when
// the mouse leaves the pill; with no text, it does not open again.
function openPinned(pill) {
	const found = PANELS.find(([icon]) => icon == pill.dataset.icon);
	if (!found) return;
	closePinned();
	// The game's frame, to hide under this one. Its place is not taken: the
	// game swaps a tooltip's content in before it moves the frame, so a
	// quick click can find it where another pill's tooltip was. This one
	// goes where the game puts a pill's tooltip, under the pill, left edges
	// level, in the frame's look.
	const frame = shown?.isConnected ? frameOf(shown) : null;
	const root = div(`${PINNED} max-w-96 p-3 img-tooltip-border img-tooltip-bg break-words font-body text-xs`);
	const pillRect = pill.getBoundingClientRect();
	root.style.left = `${pillRect.left}px`;
	root.style.top = `${pillRect.bottom + 6}px`;
	const scroll = document.createElement("fxs-scrollable");
	scroll.setAttribute("handle-gamepad-pan", "true");
	// Room on the right for the scrollbar, which draws over the content.
	const content = div("hud-overhaul-tip-scrolled");
	scroll.append(content);
	const footer = div("hud-overhaul-tip-footer");
	root.append(scroll, footer);
	// The scrollbar shows and hides as the content grows and shrinks, a
	// frame or more after it is drawn: room is made for it each time.
	const scrollbar = new MutationObserver(roomForScrollbar);
	scrollbar.observe(scroll, { subtree: true, attributes: true, attributeFilter: ["class"] });
	document.body.append(root);
	// The game's own tooltip stays up until it hears the mouse leave, below;
	// hidden now, it does not show under this one meanwhile.
	if (frame) frame.style.opacity = "0";
	pill.dataset.hudOverhaulTipText = pill.getAttribute("data-tooltip-content") ?? "";
	// The game rewrites the text when yields change: keep it blank, and the
	// new text for later.
	const watcher = new MutationObserver(() => {
		const text = pill.getAttribute("data-tooltip-content");
		if (!text) return;
		pill.dataset.hudOverhaulTipText = text;
		pill.setAttribute("data-tooltip-content", "");
	});
	pill.removeAttribute("data-tooltip-component");
	pill.setAttribute("data-tooltip-content", "");
	watcher.observe(pill, { attributes: true, attributeFilter: ["data-tooltip-content"] });
	root.style.cursor = "default";
	pinned = { root, scroll, content, footer, pill, panel: found[2], link: found[3], watcher, scrollbar };
	syncQuiet();
	drawPinned();
	const widest = content.querySelector(`.${WIDE}`) ? WIDE_PX : scale > 1 ? NARROW_PX : 0;
	if (widest) root.style.maxWidth = frameRem(widest * scale + SCROLLBAR + FRAME_PADDING * 2);
	// Kept on screen: a pill near the right edge would push it off.
	requestAnimationFrame(() => {
		const width = root.getBoundingClientRect().width;
		root.style.left = `${Math.max(8, Math.min(pillRect.left, window.innerWidth - width - 8))}px`;
	});
	// After the game's redraw for the blank text.
	setTimeout(() => {
		pill.dispatchEvent(new MouseEvent("mouseleave"));
		// Still under the mouse, for the key to close it.
		hovered = pill;
		// Shown again once the game has closed it, for the next tooltip.
		if (frame) setTimeout(() => (frame.style.opacity = ""), 300);
	}, 0);
}

const INSPECT = ["keyboard-inspect-tooltip", "toggle-tooltip"];

function onInput(event) {
	try {
		const { name, status } = event.detail;
		if (INSPECT.includes(name)) {
			if (!pinned && !hovered) return;
			event.preventDefault();
			event.stopPropagation();
			if (status != InputActionStatuses.FINISH) return;
			// Over another pill, its tooltip takes the lock.
			if (pinned && (!hovered || hovered == pinned.pill)) closePinned();
			else if (enabled() && partOn("tooltips")) openPinned(hovered);
		} else if (pinned && status == InputActionStatuses.FINISH && event.isCancelInput?.()) {
			event.preventDefault();
			event.stopPropagation();
			closePinned();
		}
	} catch (error) {
		console.error(`${TAG} tooltips: ${error}`);
	}
}

// Each one on screen, for the mod's switch to update at once.
const attached = new Set();

class Tooltips extends Component {
	onUpdate = () => {
		try {
			this.update();
			drawPinned();
		} catch (error) {
			console.error(`${TAG} tooltips: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		attached.add(this);
		this.onUpdate();
		// In case the game draws the pills after this frame.
		requestAnimationFrame(this.onUpdate);
		engine.on("PlayerTurnActivated", this.onUpdate);
		engine.on("PlayerYieldChanged", this.onUpdate);
		engine.on("CityYieldChanged", this.onUpdate);
	}

	onDetach() {
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("PlayerYieldChanged", this.onUpdate);
		engine.off("CityYieldChanged", this.onUpdate);
		attached.delete(this);
		closePinned();
		super.onDetach();
	}

	// Marks each pill with its tooltip, or unmarks it when off.
	update() {
		const banner = this.Root.closest("panel-yield-banner");
		if (!banner) return;
		if (!banner.dataset[MARKED]) {
			banner.dataset[MARKED] = "1";
			banner.addEventListener("action-activate", onActivate, true);
			banner.addEventListener("mouseenter", () => ((onBar = true), syncQuiet()));
			banner.addEventListener("mouseleave", () => ((onBar = false), syncQuiet()));
		}
		const on = enabled() && partOn("tooltips");
		for (const [icon, tag] of PANELS) {
			const pill = banner.querySelector(`yield-bar-entry[data-icon="${icon}"]`);
			if (!pill) continue;
			if (pill == pinned?.pill) continue;
			if (on) pill.setAttribute("data-tooltip-component", tag);
			else pill.removeAttribute("data-tooltip-component");
			if (!pill.dataset[MARKED]) {
				pill.dataset[MARKED] = "1";
				pill.addEventListener("mouseenter", () => (hovered = pill));
				pill.addEventListener("mouseleave", () => hovered == pill && (hovered = null));
			}
		}
		if (!on) closePinned();
	}
}

try {
	const restyle = () => setStyle("hud-overhaul-tooltips", styles());
	restyle();
	onTextSize(restyle);
	// A new size shows on the next tooltip.
	onSize(["tooltips"], () => {
		scale = size("tooltips");
		closePinned();
		restyle();
	});
	for (const [, tag, panel] of PANELS) Controls.define(tag, { createInstance: tooltipClass(panel), attributes: [{ name: "data-tooltip-content" }] });
	Controls.define(COMPONENT, { createInstance: Tooltips });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	window.addEventListener("engine-input", onInput, true);
	// The whole mod's switch and the parts' mark <html>; follow them.
	new MutationObserver(() => {
		for (const tooltips of attached) tooltips.onUpdate();
	}).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	console.error(`${TAG} tooltips loaded, civ7lab:build tooltips ${BUILD}`);
} catch (error) {
	console.error(`${TAG} tooltips: ${error}`);
}
