// Coloured pills behind the yields in the top bar: each yield-bar-entry gets
// a rounded plate tinted with its yield's colour.
//
// In game this module adds its stylesheet to <head>, where it outlives the
// HUD rebuilds. In the browser mock it adds nothing on import; `render` draws a fixture's
// captured top bar instead.
//
// The game colours each yield's text with a pale tint (text-yield-gold and
// so on). Those tints sit too close together to tell pills apart, so the
// pills use stronger versions of the same hues, and the text keeps the
// game's own colour.
//
// Sizes are rem (1rem = 18px at 1080p), so the pills scale with the UI.
//
// BZ Map Trix has an option for pills of its own, keyed on a class on
// <body>, whose rules outrank a plain one here. Each pill's rule names the
// harness and the bar's content, which outranks them, and sets the game's
// text colour back (core/ui/themes/default/default.css), which Map Trix
// turns grey.

import { onTextSize, setStyle, textOffset } from "./hud-overhaul-settings.js";

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// [class, pill colour as r, g, b, the game's text colour]. The game's own
// classes come first, with their text colour. The
// rest are this mod's pills, each named for its script: trade routes are
// grey, as the settlement count is, and happiness levels take the happiness
// yield's colour.
export const PILLS = [
	["text-yield-gold", "212, 160, 23", "#d9c8ad"],
	["text-yield-science", "59, 143, 217", "#98b5d9"],
	["text-yield-culture", "155, 89, 208", "#bfa3d9"],
	["text-yield-happiness", "224, 138, 46", "#d9b198"],
	["text-yield-influence", "63, 179, 154", "#add9c1"],
	["text-secondary", "150, 140, 120", "#e5d2ac"],
	["hud-overhaul-yield-food", "96, 168, 56"],
	["hud-overhaul-yield-production", "184, 104, 52"],
	["hud-overhaul-treasure-entry", "196, 150, 60"],
	["hud-overhaul-trade-entry", "150, 140, 120"],
	["hud-overhaul-happiness-entry", "224, 138, 46"],
	["hud-overhaul-victories-entry", "170, 150, 100"],
	["hud-overhaul-resources-entry", "120, 150, 110"],
	["hud-overhaul-greatworks-entry", "150, 110, 170"],
	["hud-overhaul-religion-entry", "200, 185, 140"],
	["hud-overhaul-units-entry", "225, 195, 150"],
];

// Sizes that hold text grow by offset, the px the player's text size adds
// (textOffset in hud-overhaul-settings.js).
export function styles(offset = 0) {
	const grow = (px) => rem(px + offset);
	const pill = (cls) => `.harness panel-yield-banner .panel-yield__top-bar-content yield-bar-entry.${cls}`;
	return `
panel-yield-banner yield-bar-entry,
${PILLS.map(([cls]) => pill(cls)).join(",\n")} {
	height: ${grow(24)};
	/* Rounded ends leave room between pills, so 1px is gap enough. */
	margin: ${rem(4)} ${rem(0.5)};
	padding: 0 ${rem(7)} 0 ${rem(2)};
	border-radius: ${grow(12)};
	border: ${rem(1)} solid transparent;
}
/* The bar's content is named to outrank the game's size class. */
panel-yield-banner .panel-yield__top-bar-content yield-bar-entry img {
	width: ${grow(19)};
	height: ${grow(19)};
}
${PILLS.map(
	([cls, rgb, text]) => `${pill(cls)} {
	background-color: rgba(${rgb}, 0.22);
	border-color: rgba(${rgb}, 0.55);${text ? `\n\tcolor: ${text};` : ""}
}
${pill(cls)}:hover {
	background-color: rgba(${rgb}, 0.4);
}`,
).join("\n")}
`;
}

// At Small, for the mock.
export const STYLES = styles();

// Mock only: a fixture is { label, html }, html being a top bar's
// .panel-yield__top-bar-content captured from the game.
export function render(fixture) {
	const frame = document.createElement("div");
	frame.className = "harness";
	const banner = document.createElement("panel-yield-banner");
	banner.className = "hud-overhaul-mock-bar";
	banner.innerHTML = fixture.html;
	frame.append(banner);
	return frame;
}

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "17";

function apply() {
	setStyle("hud-overhaul-pills", styles(textOffset()));
}

if (typeof engine !== "undefined") {
	try {
		apply();
		onTextSize(apply);
		console.error(`${TAG} pills loaded, civ7lab:build pills ${BUILD}`);
	} catch (error) {
		console.error(`${TAG} pills: ${error}`);
	}
}
