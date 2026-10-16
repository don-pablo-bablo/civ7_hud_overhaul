// The mod's saved settings, its options on the Add-ons tab, and the switch
// that turns the whole mod off and on, shared by the other scripts.
//
// Settings live in localStorage's "modSettings" entry, a JSON object with one
// key per mod, as other mods keep theirs. The game's localStorage returns the
// first stored entry whatever key is asked for, so a mod that adds a key of
// its own breaks every mod that reads "modSettings". Never add another key.
//
// The switch: every script puts its stylesheet in through setStyle, so
// turning the mod off removes them all and turning it on puts them back.
// The elements the mod adds, such as the World Tracker, are hidden while it
// is off by a stylesheet that stays.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. They are made only when an option is added, so the
// browser mock can import this file.

import { BASE_SIZES, FULL, SETTINGS_KEY } from "./hud-overhaul-edition.js";

const STORE = "modSettings";
const MOD = SETTINGS_KEY; // this mod's key
const OFF = "hud-overhaul-off"; // on <html> while the mod is off

// Each added element, hidden while the mod is off or while its part is.
const HIDE = `
html.${OFF} .hud-overhaul-tracker-slot,
html.${OFF} hud-overhaul-yield-totals,
html.${OFF} hud-overhaul-treasure,
html.${OFF} hud-overhaul-trade,
html.${OFF} hud-overhaul-happiness,
html.${OFF} hud-overhaul-victories,
html.${OFF} hud-overhaul-resources,
html.${OFF} hud-overhaul-greatworks,
html.${OFF} hud-overhaul-religion,
html.${OFF} hud-overhaul-units,
html.${OFF} .hud-overhaul-settlement-count,
html.${OFF} .hud-overhaul-settlement-pop,
html.${OFF} .hud-overhaul-tip-pinned,
html.${OFF} .hud-overhaul-celebration-text,
html.${OFF} .hud-overhaul-cap-penalty,
html.${OFF} .hud-overhaul-civ-symbol,
html.${OFF} panel-diplo-ribbon .yield-colors--military,
html.${OFF} panel-diplo-ribbon .yield-colors--religion,
html.${OFF} panel-diplo-ribbon .yield-colors--ideology,
html.hud-overhaul-no-dock .hud-overhaul-tracker-slot,
html.hud-overhaul-no-ribbon .hud-overhaul-civ-symbol,
html.hud-overhaul-no-ribbon panel-diplo-ribbon .yield-colors--military,
html.hud-overhaul-no-ribbon panel-diplo-ribbon .yield-colors--religion,
html.hud-overhaul-no-ribbon panel-diplo-ribbon .yield-colors--ideology {
	display: none;
}
`;

// id -> the stylesheet's text, or null for none.
const styles = new Map();

// This mod's settings, or {} when there are none or the entry does not parse.
export function readSettings() {
	try {
		const all = JSON.parse(localStorage.getItem(STORE) || "{}");
		return (all && typeof all === "object" && all[MOD]) || {};
	} catch {
		return {};
	}
}

// Rewrites "modSettings" with one of this mod's settings changed and the rest
// as read. If the entry does not parse, it is left alone rather than
// overwritten, and this throws.
export function writeSetting(key, value) {
	const raw = localStorage.getItem(STORE);
	let all = {};
	if (raw) {
		all = JSON.parse(raw);
		if (!all || typeof all !== "object") throw new Error(`${STORE} is not an object`);
	}
	all[MOD] = { ...all[MOD], [key]: value };
	localStorage.setItem(STORE, JSON.stringify(all));
}

// The mod's groups on the Add-ons tab, each under its own heading,
// LOC_OPTIONS_GROUP_ and the group in capitals. The game shows a group's
// options in the order they are added, and the groups in the order each
// first gets one, so addOptions adds them in this order.
export const OPTION_GROUPS = {
	GENERAL: "hud_overhaul",
	PARTS: "hud_overhaul_parts",
	TOP_BAR: "hud_overhaul_top_bar",
};
const GROUP_ORDER = [OPTION_GROUPS.GENERAL, OPTION_GROUPS.PARTS, OPTION_GROUPS.TOP_BAR];

// A line of text under a group's heading, by group.
const GROUP_NOTES = {
	[OPTION_GROUPS.PARTS]: "LOC_OPTIONS_GROUP_HUD_OVERHAUL_PARTS_NOTE",
	[OPTION_GROUPS.TOP_BAR]: "LOC_OPTIONS_GROUP_HUD_OVERHAUL_TOP_BAR_NOTE",
};

// The game draws each group's heading in createGroupHeader
// (core/ui/options/screen-options-category.js) and puts the group's options
// before the next heading, so a line added straight after the heading stays
// above them. The screen's script may load after this one, so this runs
// again each time the options are built.
let notesAdded = false;
function addGroupNotes() {
	if (notesAdded) return;
	const screen = Controls.getDefinition("screen-options-category")?.createInstance?.prototype;
	if (!screen?.createGroupHeader) return;
	const original = screen.createGroupHeader;
	screen.createGroupHeader = function (group) {
		const header = original.call(this, group);
		const note = GROUP_NOTES[group];
		if (note) {
			const line = document.createElement("p");
			line.classList.add("font-body", "text-sm", "mb-2");
			line.setAttribute("data-l10n-id", note);
			header.after(line);
		}
		return header;
	};
	notesAdded = true;
}

// The top bar's options in the order its pills show, after the number of
// rows: the celebration in the
// game's happiness pill, then this mod's pills from food and production to
// the victories. The scripts load in another order, the units last.
const TOP_BAR_ORDER = ["rows", "celebration", "yields", "settlements", "units", "happiness", "trade", "resources", "treasure", "greatworks", "religion", "victories"];

// What addOptions has been given, added together when the options load.
const pending = [];

// Adds options to the Add-ons tab, in one of OPTION_GROUPS. `build` gets the
// game's option types and returns the options, without category or group.
// A top bar script names itself, `name`, for its place in TOP_BAR_ORDER.
// An option in the parts group names its part, `part` from PARTS: it shows
// under that part's switch, and is hidden while the part is off.
//
// The game has no Add-ons tab of its own: mods add a "mods" category titled
// with the game's own Add-ons text, each with ??= so that whichever loads
// first creates it and the rest share it.
//
// The game lists options in the order they are added, so they are added in
// one go: by group; in the parts group by part, its switch first and its
// sizes next; in the top bar's in TOP_BAR_ORDER; the rest as they came. The
// game keeps the object it is given, so the switches can hide the options
// under them on screen.
export async function addOptions(group, build, name = "") {
	const { Options, OptionType, CategoryType } = await import("../../core/ui/options/model-options.js");
	const { CategoryData } = await import("../../core/ui/options/options-helpers.js");
	CategoryType["Mods"] ??= "mods";
	CategoryData[CategoryType.Mods] ??= {
		title: "LOC_UI_CONTENT_MGR_SUBTITLE",
		description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
	};
	pending.push({ group, build, place: TOP_BAR_ORDER.indexOf(name) });
	if (pending.length > 1) return;
	Options.addInitCallback(() => {
		try {
			addGroupNotes();
		} catch (error) {
			console.error(`[hud-overhaul] settings: group notes not added: ${error}`);
		}
		const all = [];
		pending.forEach(({ group, build, place }, call) => {
			build(OptionType).forEach((option, index) => {
				const inGroup = group === OPTION_GROUPS.PARTS ? PARTS.findIndex(([id]) => id === option.part) : place;
				const kind = group !== OPTION_GROUPS.PARTS ? 0 : option.partSwitch ? 0 : option.size ? 1 : 2;
				const key = [GROUP_ORDER.indexOf(group), inGroup, kind, call, index];
				all.push({ key, option: { category: CategoryType.Mods, group, ...option } });
			});
		});
		const order = (a, b) => a.key.findIndex((value, i) => value !== b.key[i]);
		all.sort((a, b) => {
			const i = order(a, b);
			return i < 0 ? 0 : a.key[i] - b.key[i];
		});
		for (const { option } of all) {
			if (option.part && !option.partSwitch) {
				const init = option.initListener;
				option.initListener = (info) => {
					info.isHidden = !partOn(option.part);
					init?.(info);
				};
				underSwitch.push(option);
			}
			Options.addOption(option);
		}
	});
}

// The options under each part's switch, as the game keeps them.
const underSwitch = [];

// True unless the player has turned the mod off.
export function enabled() {
	return readSettings().enabled !== false;
}

// Sets a script's stylesheet, or removes it with null. It is in <head> only
// while the mod is on.
export function setStyle(id, css) {
	styles.set(id, css);
	sync(id);
}

// Sent on window after the switch changes, for scripts that change the game's
// own components rather than only add styles.
export const ENABLED_EVENT = "hud-overhaul-enabled";

// Saves the switch and applies it at once.
export function setEnabled(on) {
	writeSetting("enabled", on);
	syncAll();
	window.dispatchEvent(new CustomEvent(ENABLED_EVENT));
}

// The game's text size, in Options > Accessibility, sets its text 2px
// smaller to 6px bigger than at Small, the default (fontScales in
// core/ui/themes/default/global-scaling.js). The mod's text moves by the
// same px. Its UI scale needs nothing: every size in the mod is in rem.
const TEXT_SIZES = [16, 18, 20, 22, 24]; // px for each text size, from Extra Small
export function textOffset() {
	if (typeof Configuration === "undefined") return 0;
	return (TEXT_SIZES[Configuration.getUser().uiFontScale] ?? 18) - 18;
}

// Calls back after the player changes the text size.
export function onTextSize(callback) {
	if (typeof engine !== "undefined") engine.on("UIFontScaleChanged", callback);
}

// The parts of the HUD the player can give back to the game, each with a
// switch in the parts group: [part, option text, its description], in the
// order they show. The top bar has no switch, only its size. While a part
// is off, its scripts leave the game's own in place, and <html> has
// hud-overhaul-no- and the part, for the elements the mod adds to it. The
// top bar mod has the top bar and the tooltips, with no switches.
const ALL_PARTS = [
	["topBar"],
	["tooltips", "LOC_HUD_OVERHAUL_OPTION_PART_TOOLTIPS", "LOC_HUD_OVERHAUL_OPTION_PART_TOOLTIPS_DESCRIPTION"],
	["dock", "LOC_HUD_OVERHAUL_OPTION_PART_DOCK", "LOC_HUD_OVERHAUL_OPTION_PART_DOCK_DESCRIPTION"],
	["ribbon", "LOC_HUD_OVERHAUL_OPTION_PART_RIBBON", "LOC_HUD_OVERHAUL_OPTION_PART_RIBBON_DESCRIPTION"],
	["minimap", "LOC_UI_MINIMAP_TITLE", "LOC_HUD_OVERHAUL_OPTION_PART_MINIMAP_DESCRIPTION"],
	["dial", "LOC_HUD_OVERHAUL_OPTION_PART_DIAL", "LOC_HUD_OVERHAUL_OPTION_PART_DIAL_DESCRIPTION"],
];
export const PARTS = FULL ? ALL_PARTS : [["topBar"], ["tooltips"]];

// True unless the player has given this part back to the game. The leader
// ribbon was given back by the With Drongo's Leader Ribbons option's "off"
// until it had a switch, so that still counts.
export function partOn(part) {
	const settings = readSettings();
	const value = settings.parts?.[part];
	if (value === undefined && part === "ribbon") return settings.drongoRibbon !== "off";
	return value !== false;
}

// Sent on window after a part's switch changes, with the part as its detail.
const PART_EVENT = "hud-overhaul-part";

// Calls back after the player turns one of these parts off or on.
export function onPart(parts, callback) {
	window.addEventListener(PART_EVENT, (event) => {
		if (parts.includes(event.detail)) callback();
	});
}

function syncParts() {
	for (const [part, label] of PARTS) {
		if (label) document.documentElement.classList.toggle(`hud-overhaul-no-${part}`, !partOn(part));
	}
}

// The size of each part of the HUD, as a percent of the mod's own size, set
// by a slider each under its part's switch. [size, its part, option text,
// its description], in the order the sliders show. The top bar mod has the
// top bar's and the tooltips'.
const ALL_SIZES = [
	["topBar", "topBar", "LOC_HUD_OVERHAUL_OPTION_SIZE_TOP_BAR", "LOC_HUD_OVERHAUL_OPTION_SIZE_TOP_BAR_DESCRIPTION"],
	["tooltips", "tooltips", "LOC_HUD_OVERHAUL_OPTION_SIZE_TOOLTIPS", "LOC_HUD_OVERHAUL_OPTION_SIZE_TOOLTIPS_DESCRIPTION"],
	["dock", "dock", "LOC_HUD_OVERHAUL_OPTION_SIZE_DOCK", "LOC_HUD_OVERHAUL_OPTION_SIZE_DOCK_DESCRIPTION"],
	["tracker", "dock", "LOC_HUD_OVERHAUL_OPTION_SIZE_TRACKER", "LOC_HUD_OVERHAUL_OPTION_SIZE_TRACKER_DESCRIPTION"],
	["ribbon", "ribbon", "LOC_HUD_OVERHAUL_OPTION_SIZE_RIBBON", "LOC_HUD_OVERHAUL_OPTION_SIZE_RIBBON_DESCRIPTION"],
	["minimap", "minimap", "LOC_OPTIONS_MINIMAP_SIZE", "LOC_HUD_OVERHAUL_OPTION_SIZE_MINIMAP_DESCRIPTION"],
	["dial", "dial", "LOC_HUD_OVERHAUL_OPTION_SIZE_DIAL", "LOC_HUD_OVERHAUL_OPTION_SIZE_DIAL_DESCRIPTION"],
	["notifications", "dial", "LOC_HUD_OVERHAUL_OPTION_SIZE_NOTIFICATIONS", "LOC_HUD_OVERHAUL_OPTION_SIZE_NOTIFICATIONS_DESCRIPTION"],
];
export const SIZES = FULL ? ALL_SIZES : ALL_SIZES.filter(([name]) => name === "topBar" || name === "tooltips");
const SIZE = { min: 75, max: 150, steps: 15, initial: 100 }; // percent, 5 a step

// Sent on window after a size changes, with the part as its detail.
const SIZE_EVENT = "hud-overhaul-size";

// A part's slider, in percent.
function percent(part) {
	const value = Number(readSettings().sizes?.[part]);
	return Number.isFinite(value) && value >= SIZE.min && value <= SIZE.max ? Math.round(value) : SIZE.initial;
}

// A part's size against the mod's own, 1 at 100% unless BASE_SIZES in
// hud-overhaul-edition.js sets it.
export function size(part) {
	return ((BASE_SIZES[part] ?? 1) * percent(part)) / 100;
}

// Calls back after the player changes one of these parts' sizes.
export function onSize(parts, callback) {
	window.addEventListener(SIZE_EVENT, (event) => {
		if (parts.includes(event.detail)) callback();
	});
}

// Each part's switch and each size's slider.
function addPartOptions() {
	return addOptions(OPTION_GROUPS.PARTS, (OptionType) => [
		...PARTS.filter(([, label]) => label).map(([part, label, description]) => ({
			type: OptionType.Checkbox,
			id: `hud-overhaul-option-part-${part}`,
			label,
			description,
			part,
			partSwitch: true,
			initListener: (info) => {
				info.currentValue = partOn(part);
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("parts", { ...readSettings().parts, [part]: !!value });
				} catch (error) {
					console.error(`[hud-overhaul] settings: cannot save part: ${error}`);
				}
				syncParts();
				for (const option of underSwitch) {
					if (option.part !== part) continue;
					option.isHidden = !value;
					option.forceRender?.();
				}
				window.dispatchEvent(new CustomEvent(PART_EVENT, { detail: part }));
			},
		})),
		...SIZES.map(([name, part, label, description]) => ({
			type: OptionType.Slider,
			id: `hud-overhaul-option-size-${name}`,
			label,
			description,
			part,
			size: true,
			min: SIZE.min,
			max: SIZE.max,
			steps: SIZE.steps,
			initListener: (info) => {
				info.currentValue = percent(name);
				info.formattedValue = `${info.currentValue}%`;
			},
			updateListener: (info, value) => {
				info.currentValue = Math.round(value);
				info.formattedValue = `${info.currentValue}%`;
				if (info.currentValue === percent(name)) return;
				try {
					writeSetting("sizes", { ...readSettings().sizes, [name]: info.currentValue });
				} catch (error) {
					console.error(`[hud-overhaul] settings: cannot save size: ${error}`);
				}
				window.dispatchEvent(new CustomEvent(SIZE_EVENT, { detail: name }));
			},
		})),
	]);
}

function sync(id) {
	const css = enabled() ? styles.get(id) : null;
	let style = document.getElementById(id);
	if (css == null) {
		style?.remove();
		return;
	}
	if (!style) {
		style = document.createElement("style");
		style.id = id;
		document.head.append(style);
	}
	if (style.textContent !== css) style.textContent = css;
}

function syncAll() {
	document.documentElement.classList.toggle(OFF, !enabled());
	for (const id of styles.keys()) sync(id);
}

if (typeof engine !== "undefined" && !document.getElementById("hud-overhaul-hide")) {
	const style = document.createElement("style");
	style.id = "hud-overhaul-hide";
	style.textContent = HIDE;
	document.head.append(style);
	document.documentElement.classList.toggle(OFF, !enabled());
	syncParts();
	addPartOptions().catch((error) => console.error(`[hud-overhaul] settings: part options not added: ${error}`));
}
