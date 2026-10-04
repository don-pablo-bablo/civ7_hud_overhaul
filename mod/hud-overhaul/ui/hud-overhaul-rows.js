// The top bar's pills on two rows: the yields per turn and the victories on
// the first, your settlements, units and the rest on the second, spaced out
// more than one row has room for. On a small screen or with large text,
// pills that do not fit before the top right corner go on another row.
//
// The game's five pills sit in the bar and this mod's in the mods' slot at
// its end, a box of its own. The engine has no display: contents, so the
// game's pills move into the slot, before this mod's, and a break that
// takes a whole line starts the second row at the settlements. The engine
// has no flex order either, so the victories pill moves to the end of the
// first row. This mod's pills are put in a fixed order: their scripts load
// in no fixed order. With the mod off, the game's pills go back.
//
// The turn and date at the top right and the leader ribbon hang over the
// bar's right end, so the slot stops short of whichever starts first, and
// the pills past it wrap. A victories pill that does not fit on the first
// row goes last, rather than on a row of its own.
//
// A hidden element in the slot, put there through ModdingRegistry, arranges
// the pills each time the top bar is rebuilt.
//
// The diplomacy screens have a top bar of their own, centred between the
// two leaders' panels. It keeps to the game's pills on one row, as in the
// base game; this mod's would cover the left panel's close button. Its
// leader ribbon is centred below it, so it is not cut short for that.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { enabled, onTextSize, setStyle } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "6";
const COMPONENT = "hud-overhaul-rows";
const TWO = "hud-overhaul-two-rows"; // on the top bar while it has two rows
const BREAK = "hud-overhaul-row-break";
const VICTORIES = "hud-overhaul-victories";
// The game's own pills, in its order.
const GAME = ["YIELD_GOLD", "YIELD_SCIENCE", "YIELD_CULTURE", "YIELD_HAPPINESS", "YIELD_DIPLOMACY"];
// px left clear before the top right corner's turn and date or the ribbon.
const CLEAR = 8;

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

const byIcon = (parent, icon) => [...parent.children].find((child) => child.dataset?.icon === icon);

// This mod's pills in the order they show, the settlements being the game's
// own entry. Their scripts load in no fixed order, and each puts its pill
// in the slot as it loads, so they are put in this order each time.
const ORDER = [
	"hud-overhaul-yield-totals",
	"hud-overhaul-celebration",
	"YIELD_CITIES",
	"hud-overhaul-settlement-cap",
	"hud-overhaul-units",
	"hud-overhaul-happiness",
	"hud-overhaul-trade",
	"hud-overhaul-resources",
	"hud-overhaul-treasure",
	"hud-overhaul-greatworks",
	"hud-overhaul-religion",
	VICTORIES,
];

// The diplomacy screens' top bar, the only one that hides its nav help.
const DIPLOMACY = 'panel-yield-banner[display-nav-help="false"]';

const STYLES = `
${COMPONENT} { display: none; }
${[...ORDER.filter((name) => !name.startsWith("YIELD_")), `.${BREAK}`].map((name) => `${DIPLOMACY} ${name}`).join(",\n")} { display: none; }
panel-yield-banner.${TWO} #yield-banner-mod-slot { flex-wrap: wrap; }
panel-yield-banner.${TWO} .${BREAK} { flex-basis: 100%; width: 100%; height: 0; }
/* More room between the pills, which two rows have to spare. */
panel-yield-banner.${TWO} #yield-banner-mod-slot yield-bar-entry { margin-right: ${rem(8)}; }
`;

// Puts the pills in their rows, each in its place, or with the mod off the
// game's pills back on their own. Only those out of place move, the rest of
// the slot after them in its own order.
function arrange(slot) {
	const bar = slot.parentElement;
	const banner = slot.closest("panel-yield-banner");
	if (!bar || !banner) return;
	const two = enabled();
	banner.classList.toggle(TWO, two);
	const find = (name) => (name.startsWith("YIELD_") ? byIcon(slot, name) : slot.querySelector(name));
	const game = GAME.map((icon) => byIcon(bar, icon) ?? byIcon(slot, icon)).filter((pill) => pill);
	let gap = slot.querySelector(`.${BREAK}`);
	let wanted;
	if (two) {
		if (!gap) {
			gap = document.createElement("div");
			gap.className = BREAK;
		}
		const room = fit(slot);
		// The yields per turn and the victories, then the break, then the
		// settlements and the rest. Victories too wide for the first row
		// would take a row of their own: they go last instead.
		const yields = ["hud-overhaul-yield-totals", "hud-overhaul-celebration"].map(find);
		const victories = find(VICTORIES);
		const first = [...game, ...yields, victories].filter((element) => element);
		const last = width(first) > room;
		const rest = ORDER.filter((name) => !name.startsWith("hud-overhaul-yield-totals") && name !== "hud-overhaul-celebration" && name !== VICTORIES).map(find);
		wanted = [...game, ...yields, last ? null : victories, gap, ...rest, last ? victories : null];
	} else {
		// Each of the game's pills back before the slot, in order.
		for (const pill of game) if (pill.parentElement !== bar || pill.nextSibling !== slot) bar.insertBefore(pill, slot);
		gap?.remove();
		slot.style.maxWidth = "";
		wanted = ORDER.map(find);
	}
	wanted = wanted.filter((element) => element);
	wanted.forEach((element, index) => {
		const here = slot.children[index];
		if (here !== element) slot.insertBefore(element, here ?? null);
	});
}

// The width a row of these takes: each one's box and right margin.
function width(elements) {
	return elements.reduce((sum, element) => {
		const box = element.getBoundingClientRect();
		const margin = parseFloat(getComputedStyle(element).marginRight) || 0;
		return sum + box.width + margin;
	}, 0);
}

// Sets the slot's width, up to whichever starts first at the top right: the
// turn and date, or the leader ribbon. Neither moves with the slot, so
// measuring them while it is laid out is safe. Returns that width, or
// Infinity with nothing there, or in the diplomacy screens.
function fit(slot) {
	if (slot.closest("panel-yield-banner")?.getAttribute("display-nav-help") === "false") {
		slot.style.maxWidth = "";
		return Infinity;
	}
	const edges = [];
	const corner = document.querySelector("panel-system-bar .ps-content-wrapper");
	if (corner) edges.push(corner.getBoundingClientRect().left);
	for (const plate of document.querySelectorAll(".harness panel-diplo-ribbon .diplo-ribbon-outer")) {
		const box = plate.getBoundingClientRect();
		if (box.width > 0) edges.push(box.left);
	}
	if (!edges.length) {
		slot.style.maxWidth = "";
		return Infinity;
	}
	const room = Math.max(200, Math.floor(Math.min(...edges) - slot.getBoundingClientRect().left - CLEAR));
	slot.style.maxWidth = `${room}px`;
	return room;
}

// Each one on screen, for the mod's switch and the screen to rearrange.
const attached = new Set();
const updateAll = () => {
	for (const element of attached) element.onUpdate();
};

class Rows extends Component {
	onUpdate = () => {
		try {
			if (this.Root.parentElement) arrange(this.Root.parentElement);
		} catch (error) {
			console.error(`${TAG} rows: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		attached.add(this);
		this.onUpdate();
		// After the rest of the bar and the ribbon are drawn, and again once
		// the bar has slid in: measured while it moves, its place is off.
		requestAnimationFrame(() => requestAnimationFrame(this.onUpdate));
		setTimeout(this.onUpdate, 1000);
		for (const name of EVENTS) engine.on(name, this.onUpdate);
	}

	onDetach() {
		for (const name of EVENTS) engine.off(name, this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}
}

// A turn, or meeting a leader, which widens the ribbon.
const EVENTS = ["PlayerTurnActivated", "DiplomacyMeetMajors"];

try {
	setStyle("hud-overhaul-rows", STYLES);
	Controls.define(COMPONENT, { createInstance: Rows });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	// The whole mod's switch marks <html>; follow it.
	new MutationObserver(updateAll).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	// The room at the top right changes with the screen and the text size;
	// after the text size, a frame later, once the ribbon has redrawn.
	window.addEventListener("resize", updateAll);
	onTextSize(() => requestAnimationFrame(() => requestAnimationFrame(updateAll)));
	console.error(`${TAG} rows loaded, civ7lab:build rows ${BUILD}`);
} catch (error) {
	console.error(`${TAG} rows: ${error}`);
}
