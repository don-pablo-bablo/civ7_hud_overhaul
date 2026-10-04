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

const STORE = "modSettings";
const MOD = "hud-overhaul"; // this mod's key
const OFF = "hud-overhaul-off"; // on <html> while the mod is off

// Each added element, hidden while the mod is off.
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
html.${OFF} panel-diplo-ribbon .yield-colors--ideology {
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
// first gets one, so the scripts' order in the modinfo sets both.
export const OPTION_GROUPS = {
	GENERAL: "hud_overhaul",
	TOP_BAR: "hud_overhaul_top_bar",
};

// A line of text under a group's heading, by group.
const GROUP_NOTES = {
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

// The top bar's options in the order its pills show: the celebration in the
// game's happiness pill, then this mod's pills from food and production to
// the victories. The scripts load in another order, the units last.
const TOP_BAR_ORDER = ["celebration", "yields", "settlements", "units", "happiness", "trade", "resources", "treasure", "greatworks", "religion", "victories"];

// What addOptions has been given, added together when the options load.
const pending = [];

// Adds options to the Add-ons tab, in one of OPTION_GROUPS. `build` gets the
// game's option types and returns the options, without category or group.
// A top bar script names itself, `name`, for its place in TOP_BAR_ORDER.
//
// The game has no Add-ons tab of its own: mods add a "mods" category titled
// with the game's own Add-ons text, each with ??= so that whichever loads
// first creates it and the rest share it.
//
// The game lists options in the order they are added, so they are added in
// one go, the top bar's in TOP_BAR_ORDER and the rest as they came.
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
		for (const { group, build } of [...pending].sort((a, b) => a.place - b.place)) {
			for (const option of build(OptionType)) {
				Options.addOption({ category: CategoryType.Mods, group, ...option });
			}
		}
	});
}

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
}
