// The colour of the top bar and the plates under it, and how much of the map
// shows through them. The player picks both in Options > Add-ons, and a
// change shows at once.
//
// The plates are the dock's and the column's, which holds the World Tracker
// and the Journal as one panel. Each is one flat colour, so the two plates
// read as one surface: a gradient per plate jumps from light back to dark at
// the join. The top bar has a slight gradient from top to bottom.
//
// The leader ribbon's backings take the panels' colour and opacity too.
// They are game art, so a colour matrix recolours them: it turns the art
// grey, keeping its light border, then shifts it so the dark fill lands on
// the panel colour. It also scales the art's alpha to the chosen opacity.
//
// The plates go back to the game's look with the rings and World Tracker
// part off, and the backings with the leader ribbon part; the ribbon's
// opacity then shows under that part's switch.
//
// All of it is one stylesheet in <head>, rewritten when an option changes.
// Its rules beat the World Tracker's own background, which the browser mock
// uses. Settings and options go through hud-overhaul-settings.js. Log and
// bail, never throw.

import { addOptions, onPart, OPTION_GROUPS, partOn, readSettings, setStyle, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "12";
const STYLE_ID = "hud-overhaul-theme";

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// [setting value, option text, { bar, dock, panel, trim } as r, g, b]. The
// dock is the plate behind the rings and buttons; the panel is the column
// that holds the World Tracker and the Journal. Trim, where a colour has
// one, is a thin line along the bottom of the top bar. Civ VI's blues were
// sampled from its screenshots: a navy top bar over blue plates. Charcoal
// and walnut are sampled from Civ VII's tooltips and turn dial. Verdigris is
// picked to sit with the game's gold trim. The colours from crimson on are
// stronger, with a trim, and many look best at a lower opacity.
const COLOURS = [
	["civ7", "LOC_HUD_OVERHAUL_COLOUR_CIV7", same([23, 21, 16])],
	["civ6", "LOC_HUD_OVERHAUL_COLOUR_CIV6", { bar: [9, 30, 52], dock: [24, 46, 68], panel: [24, 46, 68] }],
	["charcoal", "LOC_HUD_OVERHAUL_COLOUR_CHARCOAL", same([36, 36, 41])],
	["walnut", "LOC_HUD_OVERHAUL_COLOUR_WALNUT", same([39, 27, 18])],
	["verdigris", "LOC_HUD_OVERHAUL_COLOUR_VERDIGRIS", same([16, 38, 34])],
	["black", "LOC_HUD_OVERHAUL_COLOUR_BLACK", same([6, 6, 6])],
	["crimson", "LOC_HUD_OVERHAUL_COLOUR_CRIMSON", trimmed([58, 14, 20], [72, 22, 28], [201, 162, 74])],
	["purple", "LOC_HUD_OVERHAUL_COLOUR_PURPLE", trimmed([34, 18, 54], [46, 26, 70], [201, 162, 74])],
	["jade", "LOC_HUD_OVERHAUL_COLOUR_JADE", trimmed([10, 46, 38], [16, 60, 50], [214, 190, 128])],
	["ocean", "LOC_HUD_OVERHAUL_COLOUR_OCEAN", trimmed([8, 38, 58], [12, 54, 76], [128, 196, 220])],
	["bronze", "LOC_HUD_OVERHAUL_COLOUR_BRONZE", trimmed([56, 38, 18], [74, 50, 24], [232, 182, 102])],
	["copper", "LOC_HUD_OVERHAUL_COLOUR_COPPER", trimmed([32, 38, 46], [44, 52, 62], [198, 114, 66])],
	["forest", "LOC_HUD_OVERHAUL_COLOUR_FOREST", trimmed([20, 38, 18], [30, 52, 24], [204, 182, 92])],
	["ink", "LOC_HUD_OVERHAUL_COLOUR_INK", trimmed([10, 12, 18], [18, 22, 30], [188, 196, 208])],
];

function same(rgb) {
	return { bar: rgb, dock: rgb, panel: rgb };
}

function trimmed(bar, panel, trim) {
	return { bar, dock: panel, panel, trim };
}

// Percent. 85 lets a little of the map through.
const OPACITY = { min: 0, max: 100, steps: 20, initial: 85 };

function readColour() {
	const value = readSettings().panelColour;
	return COLOURS.find(([id]) => id === value) ?? COLOURS[0];
}

// [setting, option id, option text, its description]. The top bar and the
// ribbon have their own opacity. Until a player sets them, they follow the
// panels'.
const OPACITIES = {
	bar: ["barOpacity", "hud-overhaul-option-bar-opacity", "LOC_HUD_OVERHAUL_OPTION_BAR_OPACITY", "LOC_HUD_OVERHAUL_OPTION_BAR_OPACITY_DESCRIPTION"],
	panel: ["panelOpacity", "hud-overhaul-option-panel-opacity", "LOC_HUD_OVERHAUL_OPTION_PANEL_OPACITY", "LOC_HUD_OVERHAUL_OPTION_PANEL_OPACITY_DESCRIPTION"],
	ribbon: ["ribbonOpacity", "hud-overhaul-option-ribbon-opacity", "LOC_HUD_OVERHAUL_OPTION_RIBBON_OPACITY", "LOC_HUD_OVERHAUL_OPTION_RIBBON_OPACITY_DESCRIPTION"],
};

function validOpacity(value) {
	const number = Number(value);
	return value != null && Number.isFinite(number) && number >= OPACITY.min && number <= OPACITY.max ? Math.round(number) : null;
}

function readOpacity(part) {
	const settings = readSettings();
	const panel = validOpacity(settings.panelOpacity) ?? OPACITY.initial;
	return validOpacity(settings[OPACITIES[part][0]]) ?? panel;
}

// The ribbon backing's fill, sampled in game: about rgb(29, 31, 40), so 0.12
// as grey from 0 to 1, and about 94% opaque, judged by how little of the
// map shows through it.
const RIBBON_FILL = 0.12;
const RIBBON_ALPHA = 0.94;

// A coh-color-matrix(), the engine's own filter, that greys the art, moves
// RIBBON_FILL onto `rgb` and makes the fill `alpha` opaque. Each row is r, g,
// b, a and an offset from 0 to 1.
function recolour(rgb, alpha) {
	const grey = [0.3, 0.59, 0.11];
	const rows = rgb.map((part) => [...grey, 0, (part / 255 - RIBBON_FILL).toFixed(3)]);
	const opacity = [0, 0, 0, (alpha / RIBBON_ALPHA).toFixed(3), 0];
	return `coh-color-matrix(${[...rows.flat(), ...opacity].join(",")})`;
}

// rgba() for a colour, lightened or darkened by `by` on each channel.
function rgba(rgb, alpha, by = 0) {
	const parts = rgb.map((part) => Math.max(0, Math.min(255, part + by)));
	return `rgba(${parts.join(", ")}, ${alpha})`;
}

function styles() {
	const [, , { bar, dock, panel, trim }] = readColour();
	const alpha = readOpacity("panel") / 100;
	const barAlpha = readOpacity("bar") / 100;
	const ribbonAlpha = readOpacity("ribbon") / 100;
	return `
		/* !important beats mods that force their own top bar, such as No
		   Gradients, so the options here still apply. */
		.harness .gradient-top-bar {
			background-image: linear-gradient(180deg, ${rgba(bar, barAlpha, 5)} 0%, ${rgba(bar, barAlpha, -6)} 100%) !important;
			background-color: transparent !important;
			${trim ? `border-bottom-width: ${rem(1)} !important; border-bottom-style: solid !important; border-bottom-color: ${rgba(trim, 0.8)} !important;` : "border-bottom-width: 0 !important;"}
		}
		${
			partOn("dock")
				? `.harness panel-sub-system-dock {
			background: none;
			background-color: ${rgba(dock, alpha)};
		}
		.harness .hud-overhaul-column {
			background-color: ${rgba(panel, alpha)};
		}
		.harness .hud-overhaul-column quest-list,
		.harness .hud-overhaul-column .hud-overhaul-tracker {
			background: none;
			background-color: transparent;
		}`
				: ""
		}
		${
			partOn("ribbon")
				? `.harness panel-diplo-ribbon .diplo-ribbon__bg {
			filter: ${recolour(panel, ribbonAlpha)};
		}`
				: ""
		}
	`;
}

function apply() {
	setStyle(STYLE_ID, styles());
}

function save(key, value) {
	try {
		writeSetting(key, value);
	} catch (error) {
		console.error(`${TAG} theme: cannot save setting: ${error}`);
	}
	apply();
}

// The colours as the dropdown lists them: Civ VII's and Civ VI's first,
// then the rest by name in the player's language.
function listed() {
	const name = ([, label]) => Locale.compose(label);
	return [...COLOURS.slice(0, 2), ...COLOURS.slice(2).sort((a, b) => name(a).localeCompare(name(b)))];
}

function addThemeOptions() {
	return addOptions(OPTION_GROUPS.GENERAL, (OptionType) => {
		const colours = listed();
		return [
			{
				type: OptionType.Dropdown,
				id: "hud-overhaul-option-panel-colour",
				label: "LOC_HUD_OVERHAUL_OPTION_PANEL_COLOUR",
				description: "LOC_HUD_OVERHAUL_OPTION_PANEL_COLOUR_DESCRIPTION",
				dropdownItems: colours.map(([, label]) => ({ label })),
				initListener: (info) => {
					info.selectedItemIndex = colours.indexOf(readColour());
				},
				updateListener: (info, index) => {
					save("panelColour", (colours[index] ?? COLOURS[0])[0]);
				},
			},
			...Object.entries(OPACITIES)
				.filter(([part]) => part !== "ribbon")
				.map((entry) => opacityOption(OptionType, entry)),
		];
	});
}

// The ribbon's opacity, under the leader ribbon part's switch.
function addRibbonOption() {
	return addOptions(OPTION_GROUPS.PARTS, (OptionType) => [{ ...opacityOption(OptionType, ["ribbon", OPACITIES.ribbon]), part: "ribbon" }]);
}

function opacityOption(OptionType, [part, [setting, id, label, description]]) {
	return {
		type: OptionType.Slider,
		id,
		label,
		description,
		min: OPACITY.min,
		max: OPACITY.max,
		steps: OPACITY.steps,
		initListener: (info) => {
			info.currentValue = readOpacity(part);
			info.formattedValue = `${info.currentValue}%`;
		},
		updateListener: (info, value) => {
			info.currentValue = Math.round(value);
			info.formattedValue = `${info.currentValue}%`;
			save(setting, info.currentValue);
		},
	};
}

try {
	apply();
	addThemeOptions().catch((error) => console.error(`${TAG} theme: options not added: ${error}`));
	addRibbonOption().catch((error) => console.error(`${TAG} theme: ribbon option not added: ${error}`));
	onPart(["dock", "ribbon"], apply);
	console.error(`${TAG} theme loaded, civ7lab:build theme ${BUILD}`);
} catch (error) {
	console.error(`${TAG} theme: ${error}`);
}
