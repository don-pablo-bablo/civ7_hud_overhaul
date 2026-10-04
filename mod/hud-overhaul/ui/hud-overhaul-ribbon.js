// A compact leader ribbon, as Civ VI's: each leader's yields sit straight
// under the portrait, without the civ banner that hangs between them. The
// civ symbol from that banner becomes a badge on the panel's bottom tip.
// The player picks in Options > Add-ons when the yields show: on hover for
// everyone, as stock; yours always and the others on hover, as Civ VI; or
// everyone's always.
//
// In game this module adds its stylesheet to <head>, where it outlives the
// HUD rebuilds, keeps a copy of each civ symbol at the panel's bottom, and
// adds the option. In the browser mock it does nothing on import; `render`
// draws a fixture's captured ribbon entry instead.
//
// The stock layout, from the game (1080p): the portrait ends at y 139; a
// 64x144px banner with the civ symbol hangs below it; the yields start at
// y 222, pushed down by mt-14 on .diplo-ribbon__yields to clear the banner;
// seven 22px rows end at y 376, the religion icon below them. The dark
// backing (.diplo-ribbon__bg-container) is h-full, so it follows the rows.
//
// Sizes are rem (1rem = 18px at 1080p), so the ribbon scales with the UI.
// Settings and the option go through hud-overhaul-settings.js. Log and bail,
// never throw.

import { addOptions, enabled, ENABLED_EVENT, onTextSize, OPTION_GROUPS, readSettings, setStyle, textOffset, writeSetting } from "./hud-overhaul-settings.js";

const rem = (px) => `${(px / 18).toFixed(4)}rem`;
const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "15";
const SYMBOL = "hud-overhaul-civ-symbol";
const IMAGE = "hud-overhaul-civ-symbol__image"; // the symbol inside the badge's disc
const IN_SLOT = "hud-overhaul-civ-symbol--in-slot"; // on the badge when the religion slot is empty
const BARE = "hud-overhaul-relation--bare"; // on a relationship icon whose art has no disc
const BOX = 36; // px: a bare icon's box
const WAR_IMAGE = 52; // px wide: icon_war at this width puts its swords at about 32px
const WAR_ASPECT = 0.5; // icon_war's image is twice as wide as it is tall (stock box 72x36)
// Relationship icons drawn without a disc of their own, which vanish on the
// dark backing. Others, such as dip_neutral, bring their own disc.
const BARE_ICONS = ["icon_war"];
const KEEP_OPEN = "hud-overhaul-open"; // on an entry whose panel stays open
const SCALE = 0.8; // the ribbon's size against stock
export const ICON = 20; // px: each yield row's icon, bigger than stock's 16 to suit the numbers
const ROW = 21; // px: each yield row
const MOST_LEADERS = 8; // stock's most on a wide screen
const STEP = 91; // px at 1080p from one stock entry to the next, until measured
const CLEARANCE = 24; // px at 1080p kept clear right of the rings
const FITTED = "hudOverhaulFitted"; // on a ribbon component once it fits its leaders
// Stock's own layouts, in the diplomacy screens.
const STOCK_MODES = ["INTERFACEMODE_DIPLOMACY_HUB", "INTERFACEMODE_DIPLOMACY_DIALOG", "INTERFACEMODE_CALL_TO_ARMS", "INTERFACEMODE_DIPLOMACY_PROJECT_REACTION"];

// A ribbon entry shows its yields when hovered, pressed, or hover-all, and
// when this mod keeps it open.
const OPEN = [":hover", ".pressed", ".hover-all", `.${KEEP_OPEN}`].map((state) => `.diplo-ribbon-outer${state}`);

// Sizes that hold text grow by offset, the px the player's text size adds
// (textOffset in hud-overhaul-settings.js).
export function styles(offset = 0) {
	const grow = (px) => rem(px + offset);
	return `
/* Into the top right corner, as Civ VI's portrait. Stock holds the ribbon
   96px in from the right and 32px down, and draws the portrait 23px lower.
   Each panel's dark backing ends 8px inside the ribbon's right edge, so the
   ribbon goes 8px past the screen edge to put the backing flush. The
   portraits start 6px under the 32px top bar, leaving room for the
   relationship badges on their corners.
   The whole ribbon is drawn at SCALE of its size, from its top right
   corner. The portraits start 33px below the ribbon's top, so it comes
   down by what that loses to keep them 6px under the top bar. The scale
   goes on the ribbon's child: the game slides the ribbon itself in with an
   animated transform, which would replace the scale while it runs. */
.harness panel-diplo-ribbon {
	right: ${rem(-8)};
	top: ${rem(5 + 33 * (1 - SCALE))};
}
.harness panel-diplo-ribbon > fxs-vslot {
	transform: scale(${SCALE});
	transform-origin: 100% 0;
}
/* With 7 or more leaders on a narrow screen stock moves the ribbon 96px
   right, which here would push yours off the edge. */
.harness panel-diplo-ribbon .diplo-ribbon__ribbon-container-small {
	right: 0;
}
/* Your own leader stays in the corner and others line up to its left, each
   new one further out. Stock puts you first, on the left. */
.harness panel-diplo-ribbon .diplo-ribbon-nav-target {
	flex-direction: row-reverse;
}
/* Side by side with no gap. Each backing's art has a clear edge about 3px
   wide, and stock leaves 1px between boxes, so each panel after yours moves
   6px right. On a narrow screen stock pulls every panel 8px right, which
   would push yours past the edge. */
.harness panel-diplo-ribbon .diplo-ribbon-outer {
	margin-right: 0;
}
.harness panel-diplo-ribbon .diplo-ribbon-outer + .diplo-ribbon-outer {
	margin-right: ${rem(-6)};
}
/* Stock raises the portrait of whoever's turn it is by 10px, which in single
   player is always you, so yours sat out of line with the others. */
.harness panel-diplo-ribbon .diplo-ribbon__portrait.turn-active {
	bottom: 0;
}
/* The relationship icon hangs under the portrait in stock, where the compact
   yields now start; it becomes a badge on the portrait's top right corner.
   Its container is centred on the 84px portrait, and is zero-width unless a
   war support count widens it, so offsets are from its centre. */
.harness panel-diplo-ribbon .relationship-icon {
	position: absolute;
	top: ${rem(-4)};
	left: 50%;
	margin-left: ${rem(14)};
	/* Stock's margin-bottom: -20% stretches the box 1.2 times in this engine. */
	margin-bottom: 0;
	width: ${rem(28)};
	height: ${rem(28)};
	z-index: 3;
	/* Some icons, such as war's crossed swords, have no disc of their own.
	   All get one, so they read as the same size. */
	border-radius: 50%;
	background-color: rgba(14, 18, 30, 0.92);
	border-width: ${rem(1)};
	border-style: solid;
	border-color: rgba(255, 255, 255, 0.25);
}
.harness panel-diplo-ribbon .relationship-icon.${BARE} {
	width: ${rem(BOX)};
	height: ${rem(BOX)};
	top: ${rem(-8)};
	margin-left: ${rem(12)};
	/* No disc: the art stands alone, as discs behind it read poorly. */
	border-radius: 0;
	border-width: 0;
	background-color: transparent;
	/* icon_war's swords are small and off centre in their image: their
	   centre sits 51% across and 36% down, measured from screenshots. The
	   image keeps its shape, is sized so the swords are about 32px, and is
	   placed in px so that centre lands on the box's. */
	background-size: ${rem(WAR_IMAGE)} auto;
	background-position: ${rem(BOX / 2 - 0.51 * WAR_IMAGE)} ${rem(BOX / 2 - 0.36 * WAR_IMAGE * WAR_ASPECT)};
	z-index: 4;
}
/* At war, the war support count also hangs under the portrait, as does the
   sanctions or envoys count that shares its place. Both go on the portrait's
   top left corner, opposite the relationship badge. Each is 42px wide. */
.harness panel-diplo-ribbon .diplo-ribbon__war-support-count,
.harness panel-diplo-ribbon .diplo-ribbon__sanction-envoy-count {
	position: absolute;
	top: ${rem(-2)};
	left: 50%;
	margin-left: ${rem(-44)};
	margin-top: 0;
	z-index: 3;
	/* A pill rather than the stock 42x14 box, to sit with the round badges. */
	width: auto;
	min-width: ${grow(28)};
	height: ${grow(18)};
	padding: 0 ${rem(6)};
	border-radius: ${grow(9)};
	border-width: ${rem(1)};
	border-style: solid;
	border-color: rgba(0, 0, 0, 0.5);
}
.harness panel-diplo-ribbon .diplo-ribbon__sanction-envoy-count {
	top: ${rem(20)};
}
/* War support is the one number on the portraits, and stock's text-2xs is
   hard to read at the ribbon's size: larger and bold, centred on the
   relationship badges' line. */
.harness panel-diplo-ribbon .diplo-ribbon__war-support-count {
	top: ${rem(-1.75)};
	margin-left: ${rem(-48)};
	min-width: ${grow(34)};
	height: ${grow(24)};
	padding: 0 ${rem(7)};
	border-radius: ${grow(12)};
	font-size: ${grow(17)};
	font-weight: bold;
}
.harness panel-diplo-ribbon .diplo-ribbon__upper-bg {
	display: none;
}
.harness panel-diplo-ribbon .diplo-ribbon__yields {
	margin-top: ${rem(-23)};
}
.harness panel-diplo-ribbon .yield-item {
	height: ${grow(ROW)};
}
.harness panel-diplo-ribbon .yield-item img {
	width: ${grow(ICON)};
	height: ${grow(ICON)};
}
.harness panel-diplo-ribbon .${SYMBOL} {
	display: none;
	position: absolute;
	left: 50%;
	bottom: ${rem(-30)};
	width: ${rem(28)};
	height: ${rem(28)};
	margin-left: ${rem(-14)};
	border-radius: 50%;
	/* The engine takes var() only in longhand properties, and border-color
	   counts as shorthand. */
	border-width: ${rem(1)};
	border-style: solid;
	border-top-color: var(--player-color-secondary);
	border-right-color: var(--player-color-secondary);
	border-bottom-color: var(--player-color-secondary);
	border-left-color: var(--player-color-secondary);
	background-color: var(--player-color-primary);
	align-items: center;
	justify-content: center;
	z-index: 3;
	pointer-events: auto;
}
/* The symbol on its own, as the game's tint colours the whole element:
   on the badge it would tint the disc too. */
.harness panel-diplo-ribbon .${IMAGE} {
	width: 85%;
	height: 85%;
}
/* No religion: the badge takes the empty religion slot, 32px at the bottom. */
.harness panel-diplo-ribbon .${SYMBOL}.${IN_SLOT} {
	bottom: ${rem(2)};
}
${OPEN.map((open) => `.harness panel-diplo-ribbon ${open} .${SYMBOL}`).join(",\n")} {
	display: flex;
}
${OPEN.slice(-1).map((open) => [".diplo-ribbon__yields", ".diplo-ribbon__bottom-spacer", ".diplo-ribbon__bg-container"].map((part) => `.harness panel-diplo-ribbon ${open} ${part}`).join(",\n"))} {
	display: flex;
}
`;
}

// At Small, for the mock.
export const STYLES = styles();

// Puts a copy of each entry's civ symbol, on a disc of the civ's colour, at
// the end of its panel, where the stylesheet pins it to the bottom tip. The
// original stays in the hidden banner, and the game may redraw it, so the
// copy follows its background.
// It takes the portrait's tooltip, the leader and civ's names. Safe to call
// repeatedly.
export function addCivSymbols(root) {
	for (const panel of root.querySelectorAll(".diplo-ribbon_content-container")) {
		const symbol = panel.querySelector(".diplo-ribbon__upper-bg .diplo-ribbon__symbol");
		if (!symbol) continue;
		// The game's engine may lack :scope, so look at direct children.
		let copy = [...panel.children].find((child) => child.classList.contains(SYMBOL));
		if (!copy) {
			copy = document.createElement("div");
			copy.className = SYMBOL;
			const inner = document.createElement("div");
			inner.className = `diplo-ribbon__symbol bg-contain bg-center bg-no-repeat ${IMAGE}`;
			copy.append(inner);
			panel.append(copy);
		} else if (copy !== panel.lastElementChild) {
			panel.append(copy);
		}
		const inner = copy.firstElementChild;
		const image = symbol.style.backgroundImage;
		if (inner && inner.style.backgroundImage !== image) inner.style.backgroundImage = image;
		const who = panel.closest(".diplo-ribbon-outer")?.querySelector(".diplo-ribbon__portrait-hitbox")?.getAttribute("data-tooltip-content") ?? "";
		if (copy.getAttribute("data-tooltip-content") !== who) copy.setAttribute("data-tooltip-content", who);
		// The game sets the religion slot's image only once a religion exists.
		const religion = panel.querySelector(".diplo-ribbon__religion");
		const empty = !religion || !religion.style.backgroundImage;
		if (copy.classList.contains(IN_SLOT) !== empty) copy.classList.toggle(IN_SLOT, empty);
	}
}

// Marks relationship icons whose art has no disc, for the stylesheet to size
// and centre on their own. The game swaps the image when relations change, and
// hides the icon when there is none.
export function markBareRelations(root) {
	for (const icon of root.querySelectorAll(".relationship-icon")) {
		const image = icon.style.backgroundImage || "";
		const bare = !icon.classList.contains("hidden") && BARE_ICONS.some((name) => image.includes(name));
		if (icon.classList.contains(BARE) !== bare) icon.classList.toggle(BARE, bare);
	}
}

// Stock shows 4 to 8 leaders by screen width alone (populateFlags in
// panel-diplo-ribbon.js) and pages through the rest with arrows. This
// ribbon is smaller and starts in the corner, so it shows as many as fit
// between the screen's right edge and the age, tech and civic rings, the
// nearest thing to the portraits' left, up to stock's 8. If not all fit,
// one leader's space goes to the arrows.
//
// populateFlags sets numLeadersToShow and reads it back, so the property
// becomes one that keeps stock's value and answers with the fitted one. The
// entries are measured after each draw; populateFlags removes them before
// it reads the count. The game's modules load only in game, so the mock
// can import this file.
let game = null; // { InterfaceMode, DiploRibbonData } once loaded
let step = 0; // px between entries, as last measured
function leadersToShow(stock) {
	const { InterfaceMode, DiploRibbonData } = game;
	if (!enabled()) return stock;
	if (STOCK_MODES.some((mode) => InterfaceMode.isInInterfaceMode(mode))) return stock;
	const rings = document.querySelector(".harness panel-sub-system-dock");
	const left = (rings?.getBoundingClientRect().right ?? 0) + remPx(CLEARANCE);
	const each = step || remPx(STEP * SCALE);
	let fit = Math.floor((window.innerWidth - left) / each);
	if (fit < DiploRibbonData.playerData.length) fit -= 1;
	return Math.max(1, Math.min(MOST_LEADERS, fit));
}

// px on screen for px at 1080p.
function remPx(px) {
	return (px / 18) * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

// Fits the ribbon's leaders, and redraws it when the count changes.
function fitLeaders(root) {
	const ribbon = root.querySelector("panel-diplo-ribbon");
	const component = ribbon?.component;
	if (!game || !component) return;
	const shown = [...ribbon.querySelectorAll(".diplo-ribbon-outer")].filter((entry) => entry.offsetWidth > 0);
	if (shown.length > 1) step = Math.abs(shown[0].getBoundingClientRect().left - shown[1].getBoundingClientRect().left);
	if (!component[FITTED]) {
		let stock = component.numLeadersToShow;
		Object.defineProperty(component, "numLeadersToShow", {
			configurable: true,
			get: () => leadersToShow(stock),
			set: (value) => {
				stock = value;
			},
		});
		component[FITTED] = { count: 0 };
	}
	const count = component.numLeadersToShow;
	if (count !== component[FITTED].count) {
		component[FITTED].count = count;
		component.populateFlags();
	}
}

async function loadGame() {
	const [{ InterfaceMode }, { DiploRibbonData }] = await Promise.all([
		import("../../core/ui/interface-modes/interface-modes.js"),
		import("../../base-standard/ui/diplo-ribbon/model-diplo-ribbon.js"),
	]);
	game = { InterfaceMode, DiploRibbonData };
	const harness = document.querySelector(".harness");
	if (harness) fitLeaders(harness);
}

// Mock only: a fixture is { label, html, compact }, html being a ribbon
// entry (.diplo-ribbon-outer) captured from the game. A compact case is drawn
// where the game's rules above match it; a stock case is not.
export function render(fixture) {
	const frame = document.createElement("div");
	frame.className = "hud-overhaul-mock-ribbon";
	const host = document.createElement(fixture.compact ? "panel-diplo-ribbon" : "div");
	host.innerHTML = fixture.html;
	if (fixture.compact) {
		frame.classList.add("harness");
		addCivSymbols(host);
	}
	frame.append(host);
	return frame;
}

// "hover", "own" or "all".
function readSetting() {
	const value = readSettings().ribbonYields;
	return value === "own" || value === "all" ? value : "hover";
}

// Marks the entries whose panels stay open. The ribbon redraws its entries,
// so this runs again after every redraw.
function keepOpen(root) {
	const setting = readSetting();
	for (const outer of root.querySelectorAll(".diplo-ribbon-outer")) {
		const own = !!outer.querySelector(".diplo-ribbon__portrait.local-player");
		const want = setting === "all" || (setting === "own" && own);
		if (outer.classList.contains(KEEP_OPEN) !== want) outer.classList.toggle(KEEP_OPEN, want);
	}
}

const CHOICES = [
	{ label: "LOC_HUD_OVERHAUL_OPTION_ON_HOVER", value: "hover" },
	{ label: "LOC_HUD_OVERHAUL_OPTION_OWN", value: "own" },
	{ label: "LOC_HUD_OVERHAUL_OPTION_ALL", value: "all" },
];

function addOption() {
	return addOptions(OPTION_GROUPS.GENERAL, (OptionType) => [
		{
			type: OptionType.Dropdown,
			id: "hud-overhaul-option-ribbon-yields",
			label: "LOC_HUD_OVERHAUL_OPTION_RIBBON_YIELDS",
			description: "LOC_HUD_OVERHAUL_OPTION_RIBBON_YIELDS_DESCRIPTION",
			dropdownItems: CHOICES,
			initListener: (info) => {
				info.selectedItemIndex = CHOICES.findIndex((choice) => choice.value === readSetting());
			},
			updateListener: (info, index) => {
				const value = CHOICES[index]?.value ?? "hover";
				try {
					writeSetting("ribbonYields", value);
				} catch (error) {
					console.error(`${TAG} ribbon: cannot save setting: ${error}`);
				}
				const harness = document.querySelector(".harness");
				if (harness) keepOpen(harness);
			},
		},
	]);
}

function start() {
	const harness = document.querySelector(".harness");
	if (!harness) return false;
	addCivSymbols(harness);
	markBareRelations(harness);
	keepOpen(harness);
	fitLeaders(harness);
	// The ribbon redraws its entries, and a view change rebuilds the whole
	// HUD; both show up as added nodes somewhere under the harness.
	let queued = false;
	new MutationObserver(() => {
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => {
			queued = false;
			try {
				addCivSymbols(harness);
				markBareRelations(harness);
				keepOpen(harness);
				fitLeaders(harness);
			} catch (error) {
				console.error(`${TAG} ribbon: ${error}`);
			}
		});
	}).observe(harness, { childList: true, subtree: true });
	return true;
}

if (typeof engine !== "undefined") {
	try {
		const restyle = () => setStyle("hud-overhaul-ribbon", styles(textOffset()));
		restyle();
		onTextSize(restyle);
		// Turning the mod off or on changes the count fitLeaders gives.
		window.addEventListener(ENABLED_EVENT, () => {
			const harness = document.querySelector(".harness");
			if (harness) fitLeaders(harness);
		});
		if (!start()) {
			document.addEventListener("DOMContentLoaded", () => {
				try {
					if (!start()) console.error(`${TAG} ribbon: no harness`);
				} catch (error) {
					console.error(`${TAG} ribbon: ${error}`);
				}
			});
		}
		addOption().catch((error) => console.error(`${TAG} ribbon: option not added: ${error}`));
		loadGame().catch((error) => console.error(`${TAG} ribbon: leaders not fitted: ${error}`));
		console.error(`${TAG} ribbon loaded, civ7lab:build ribbon ${BUILD}`);
	} catch (error) {
		console.error(`${TAG} ribbon: ${error}`);
	}
}
