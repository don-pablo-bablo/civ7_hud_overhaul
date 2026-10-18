// The top bar's pills on two rows: the yields per turn and the victories on
// the first, your settlements, units and the rest on the second, spaced out
// more than one row has room for. On a small screen or with large text,
// pills that do not fit before the top right corner go on another row. The
// player can pick one row instead: every pill in a line, the victories last,
// wrapping only at the top right corner.
//
// The top bar, and the turn and date at the top right, are drawn at the
// player's size for the top bar, from their top corners. The scale goes on
// each one's child, which fills it: the game slides both in with an
// animated transform, which would replace the scale while it runs. The dark strip
// behind the bar and the dock below follow the bar's box rather than what
// is drawn, so each gets a bottom margin of what the size adds or takes
// away, measured again whenever the bar's height changes: a pill that grows
// can wrap onto another row.
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
// Other mods' pills, such as Chronicles & Myths' Legacy, Glory and Mythic,
// go in the bar after the slot, where they widen the bar past the screen and
// push the turn and date off its edge. They move into the slot at the end of
// the second row, after this mod's pills and before victories only when
// victories go last, as they come after the game's pills in the base game,
// and back with the mod off. hud-overhaul-pills.js draws them
// as pills.
//
// A hidden element in the slot, put there through ModdingRegistry, arranges
// the pills each time the top bar is rebuilt, and again when another mod
// adds a pill to the bar.
//
// The diplomacy screens have a top bar of their own, centred between the
// two leaders' panels. It keeps to the game's pills on one row, as in the
// base game; this mod's would cover the left panel's close button. Its
// leader ribbon is centred below it, so it is not cut short for that.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { addOptions, enabled, onSize, onTextSize, OPTION_GROUPS, readSettings, setStyle, size, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "15";
const COMPONENT = "hud-overhaul-rows";
const IN_SLOT = "hud-overhaul-in-slot"; // on the top bar while its pills are in the slot
const TWO = "hud-overhaul-two-rows"; // on the top bar while it has two rows
const SIZED = "hud-overhaul-sized"; // on the top bar while it is drawn at the player's size
const BREAK = "hud-overhaul-row-break";
const VICTORIES = "hud-overhaul-victories";
const GUEST = "hud-overhaul-guest"; // on another mod's pill while it is in the slot
// The game's own pills, in its order.
const GAME = ["YIELD_GOLD", "YIELD_SCIENCE", "YIELD_CULTURE", "YIELD_HAPPINESS", "YIELD_DIPLOMACY"];
// px left clear before the top right corner's turn and date or the ribbon.
const CLEAR = 8;

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

const byIcon = (parent, icon) => [...parent.children].find((child) => child.dataset?.icon === icon);

// Other mods' pills in the bar: whatever is after the slot. The game puts
// its own pills before it, and this mod puts them back there.
const afterSlot = (bar) => {
	const children = [...bar.children];
	const at = children.findIndex((child) => child.id === "yield-banner-mod-slot");
	return at < 0 ? [] : children.slice(at + 1);
};

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

// The top bar's size against the mod's own, k. At 1 nothing is scaled.
const styles = (k) => `
${COMPONENT} { display: none; }
${[...ORDER.filter((name) => !name.startsWith("YIELD_")), `.${BREAK}`].map((name) => `${DIPLOMACY} ${name}`).join(",\n")} { display: none; }
panel-yield-banner.${IN_SLOT} #yield-banner-mod-slot { flex-wrap: wrap; }
panel-yield-banner.${TWO} .${BREAK} { flex-basis: 100%; width: 100%; height: 0; }
/* More room between the pills, which two rows have to spare. */
panel-yield-banner.${TWO} #yield-banner-mod-slot yield-bar-entry { margin-right: ${rem(8)}; }
/* Other mods' pills too, named to outrank hud-overhaul-pills.js. */
.harness panel-yield-banner.${TWO} .panel-yield__top-bar-content #yield-banner-mod-slot .${GUEST} { margin-right: ${rem(8)}; }
${
	k === 1
		? ""
		: `panel-yield-banner.${SIZED} > .panel-yield__top-bar-content { transform: scale(${k}); transform-origin: 0 0; }
.harness panel-system-bar > fxs-hslot { transform: scale(${k}); transform-origin: 100% 0; }`
}
`;

// The player's choice of rows: 1 or 2.
function rows() {
	return readSettings().topBarRows === 1 ? 1 : 2;
}

// Bottom margins that make the bar's and the corner's boxes take the space
// they are drawn in, or none. Their own boxes are not scaled, their
// children are.
function fitBoxes(banner, on) {
	const k = on ? size("topBar") : 1;
	for (const part of [banner, document.querySelector(".harness panel-system-bar")]) {
		if (!part) continue;
		const extra = k === 1 ? "" : `${(part.getBoundingClientRect().height * (k - 1)).toFixed(2)}px`;
		if (part.style.marginBottom !== extra) part.style.marginBottom = extra;
	}
}

// Puts the pills in their rows, each in its place, or with the mod off the
// game's pills back on their own. Only those out of place move, the rest of
// the slot after them in its own order.
function arrange(slot) {
	const bar = slot.parentElement;
	const banner = slot.closest("panel-yield-banner");
	if (!bar || !banner) return;
	const on = enabled();
	const two = on && rows() === 2;
	// The diplomacy screens' bar is centred, so it keeps the game's size.
	const diplomacy = banner.getAttribute("display-nav-help") === "false";
	banner.classList.toggle(IN_SLOT, on);
	banner.classList.toggle(TWO, two);
	banner.classList.toggle(SIZED, on && !diplomacy);
	const find = (name) => (name.startsWith("YIELD_") ? byIcon(slot, name) : slot.querySelector(name));
	const game = GAME.map((icon) => byIcon(bar, icon) ?? byIcon(slot, icon)).filter((pill) => pill);
	// Other mods' pills, in the slot or new in the bar, in the order they came.
	// The diplomacy screens' bar keeps them as the game does.
	const guests = [...slot.children].filter((child) => child.classList.contains(GUEST));
	if (on && !diplomacy) guests.push(...afterSlot(bar));
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
		wanted = [...game, ...yields, last ? null : victories, gap, ...rest, ...guests, last ? victories : null];
	} else if (on) {
		// One row: the game's pills, then this mod's in order.
		gap?.remove();
		fit(slot);
		wanted = [...game, ...ORDER.filter((name) => name !== VICTORIES).map(find), ...guests, find(VICTORIES)];
	} else {
		// Each of the game's pills back before the slot, in order.
		for (const pill of game) if (pill.parentElement !== bar || pill.nextSibling !== slot) bar.insertBefore(pill, slot);
		// Other mods' pills back after it.
		for (const guest of guests) {
			guest.classList.remove(GUEST);
			bar.appendChild(guest);
		}
		gap?.remove();
		slot.style.maxWidth = "";
		wanted = ORDER.map(find);
	}
	wanted = wanted.filter((element) => element);
	if (on) for (const guest of guests) guest.classList.add(GUEST);
	wanted.forEach((element, index) => {
		const here = slot.children[index];
		if (here !== element) slot.insertBefore(element, here ?? null);
	});
	if (!diplomacy) fitBoxes(banner, on);
}

// The width a row of these takes on screen: each one's box and right
// margin, the margin scaled as the bar is.
function width(elements) {
	const k = size("topBar");
	return elements.reduce((sum, element) => {
		const box = element.getBoundingClientRect();
		const margin = parseFloat(getComputedStyle(element).marginRight) || 0;
		return sum + box.width + margin * k;
	}, 0);
}

// Sets the slot's width, up to whichever starts first at the top right: the
// turn and date, or the leader ribbon. Neither moves with the slot, so
// measuring them while it is laid out is safe. Returns that width on
// screen, or Infinity with nothing there, or in the diplomacy screens. The
// slot is drawn at the top bar's size, so its own width is the room divided
// by that.
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
	slot.style.maxWidth = `${Math.floor(room / size("topBar"))}px`;
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
		const banner = this.Root.closest("panel-yield-banner");
		if (banner && banner.getAttribute("display-nav-help") !== "false") {
			this.resized = new ResizeObserver(() => {
				try {
					fitBoxes(banner, enabled());
				} catch (error) {
					console.error(`${TAG} rows: ${error}`);
				}
			});
			this.resized.observe(banner);
		}
		// Another mod's pill put in the bar, after the slot.
		const bar = this.Root.parentElement?.parentElement;
		if (bar) {
			this.added = new MutationObserver((changes) => {
				if (changes.some((change) => [...change.addedNodes].some((node) => afterSlot(bar).includes(node)))) this.onUpdate();
			});
			this.added.observe(bar, { childList: true });
		}
		this.onUpdate();
		// After the rest of the bar and the ribbon are drawn, and again once
		// the bar has slid in: measured while it moves, its place is off.
		requestAnimationFrame(() => requestAnimationFrame(this.onUpdate));
		setTimeout(this.onUpdate, 1000);
		for (const name of EVENTS) engine.on(name, this.onUpdate);
	}

	onDetach() {
		for (const name of EVENTS) engine.off(name, this.onUpdate);
		this.resized?.disconnect();
		this.added?.disconnect();
		attached.delete(this);
		super.onDetach();
	}
}

// A turn, or meeting a leader, which widens the ribbon.
const EVENTS = ["PlayerTurnActivated", "DiplomacyMeetMajors"];

const CHOICES = [
	{ label: "LOC_HUD_OVERHAUL_OPTION_ROWS_ONE", value: 1 },
	{ label: "LOC_HUD_OVERHAUL_OPTION_ROWS_TWO", value: 2 },
];

function addOption() {
	return addOptions(
		OPTION_GROUPS.TOP_BAR,
		(OptionType) => [
			{
				type: OptionType.Dropdown,
				id: "hud-overhaul-option-rows",
				label: "LOC_HUD_OVERHAUL_OPTION_ROWS",
				description: "LOC_HUD_OVERHAUL_OPTION_ROWS_DESCRIPTION",
				dropdownItems: CHOICES,
				initListener: (info) => {
					info.selectedItemIndex = CHOICES.findIndex((choice) => choice.value === rows());
				},
				updateListener: (info, index) => {
					try {
						writeSetting("topBarRows", CHOICES[index]?.value ?? 2);
					} catch (error) {
						console.error(`${TAG} rows: cannot save setting: ${error}`);
					}
					updateAll();
				},
			},
		],
		"rows",
	);
}

const restyle = () => setStyle("hud-overhaul-rows", styles(size("topBar")));

try {
	restyle();
	Controls.define(COMPONENT, { createInstance: Rows });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	// The whole mod's switch marks <html>; follow it. Turned back on, the
	// game lays out the new row break before the stylesheet is back, and
	// never again, so the rows run together: a frame later a new one goes in.
	const rebreak = () => {
		for (const gap of document.querySelectorAll(`.${BREAK}`)) gap.remove();
		updateAll();
	};
	new MutationObserver(() => {
		updateAll();
		requestAnimationFrame(() => requestAnimationFrame(rebreak));
	}).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
	// The room at the top right changes with the screen and the text size;
	// after the text size, a frame later, once the ribbon has redrawn.
	window.addEventListener("resize", updateAll);
	onTextSize(() => requestAnimationFrame(() => requestAnimationFrame(updateAll)));
	// A new size, measured once it is drawn.
	onSize(["topBar"], () => {
		restyle();
		requestAnimationFrame(() => requestAnimationFrame(updateAll));
	});
	addOption().catch((error) => console.error(`${TAG} rows: option not added: ${error}`));
	console.error(`${TAG} rows loaded, civ7lab:build rows ${BUILD}`);
} catch (error) {
	console.error(`${TAG} rows: ${error}`);
}
