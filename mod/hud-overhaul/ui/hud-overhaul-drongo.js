// HUD Overhaul's leader ribbon with Drongo's Leader Ribbons. Without that
// mod this does nothing and adds no option.
//
// Drongo's mod replaces the game's ribbon files (base-standard/ui/
// diplo-ribbon). It draws the ribbon smaller and narrower and 26px in from
// the edge, and moves the gold, happiness, influence, combat and trade rows
// into a second box behind a +/- button. Its combat row and this mod's
// combat strength row give the same value, by Drongo's formula
// (hud-overhaul-military.js).
//
// The player picks in Options > Add-ons, Drongo's layout unless they choose
// otherwise:
// - HUD Overhaul: every row back in one list, in the game's order, with the
//   combat strength row (hud-overhaul-military.js) in place of Drongo's
//   combat row. The +/- button goes with the second box: Drongo's ribbon
//   adds it only when that box has rows.
// - Drongo's layout: Drongo's rows, second box and button, with Drongo's
//   combat row in place of this mod's. The second box opens
//   with the panel when this mod keeps it open.
// - Off, while the Leader ribbon part is off: Drongo's ribbon as its author
//   made it, for when a change on either side clashes, without this mod's
//   combat strength, religion and ideology rows. The option shows only
//   while the part is on.
// Both of the first two set Drongo's sizes and position back to the game's,
// which hud-overhaul-ribbon.js's rules build on.
//
// The rows go through the ribbon's own methods, isSecondaryRibbonItem and
// getPrimaryRibbonItems, on its prototype. Settings and the option go
// through hud-overhaul-settings.js. Log and bail, never throw.

import { addOptions, enabled as modEnabled, ENABLED_EVENT, onPart, OPTION_GROUPS, partOn, readSettings, setStyle, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "10";
const DRONGO = "drongos-leader-ribbons"; // the mod's id in its modinfo
const COMBAT = "combat"; // Drongo's combat row's type
const MILITARY = "military"; // this mod's combat strength row's type
// The types of the rows this mod adds (hud-overhaul-military.js,
// hud-overhaul-religion-row.js, hud-overhaul-ideology-row.js).
const OWN_ROWS = [MILITARY, "religion", "ideology"];

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// Drongo's sizes back to the game's (panel-diplo-ribbon.css and the
// classes its script gives each part). Drongo marks some !important, and
// its offset mode sets the ribbon's right edge on the element itself, so
// those need !important here too.
const STYLES = `
.harness panel-diplo-ribbon.diplo-ribbon.right-24 {
	right: ${rem(-8)} !important;
}
.harness panel-diplo-ribbon .diplo-ribbon__ribbon-container {
	transform: none;
}
.harness panel-diplo-ribbon .diplo-ribbon_content-container {
	width: ${rem(85)};
}
.harness panel-diplo-ribbon .diplo-ribbon__bg-container {
	left: auto;
	width: ${rem(96)} !important;
	transform: none;
	/* Drongo ends the backing at the panel's foot; the game's runs past it,
	   below the civ badge. */
	bottom: auto;
	height: 100%;
}
.harness panel-diplo-ribbon .diplo-ribbon__yields {
	padding-left: ${rem(4)} !important;
	padding-right: ${rem(4)} !important;
}
.harness panel-diplo-ribbon .diplo-ribbon__bottom-spacer {
	height: 4.125em;
}
.harness panel-diplo-ribbon .diplo-ribbon-outer::after {
	width: 1.5em;
	max-width: ${rem(15)};
}
`;

// The second box opens with the panel when this mod keeps it open, as
// Drongo's opens on hover.
const DRONGO_STYLES = `
.harness panel-diplo-ribbon .diplo-ribbon-outer.hud-overhaul-open.drongos-secondary-open .drongos-secondary-yields {
	display: flex;
}
.harness panel-diplo-ribbon .drongos-secondary-yields {
	padding-left: ${rem(4)} !important;
	padding-right: ${rem(4)} !important;
}
/* Drongo centres the +/- button at the panel's foot, where the civ badge
   sits here (hud-overhaul-ribbon.js), so it moves to the badge's right,
   level with it. */
.harness panel-diplo-ribbon .drongos-secondary-toggle {
	margin-left: ${rem(30)};
	bottom: ${rem(15)};
}
`;

function active() {
	return [...Modding.getActiveMods()].some((handle) => Modding.getModInfo(handle)?.id === DRONGO);
}

// "own", this mod's ribbon, or "drongo". A saved "off" now counts as the
// Leader ribbon part off: see partOn in hud-overhaul-settings.js.
function readMode() {
	return readSettings().drongoRibbon === "own" ? "own" : "drongo";
}

// The mode in force: "off" with the whole mod or the ribbon part off.
function mode() {
	return modEnabled() && partOn("ribbon") ? readMode() : "off";
}

// The ribbon's prototype, once its script has loaded, or null.
function ribbonPrototype() {
	return Controls.getDefinition("panel-diplo-ribbon")?.createInstance?.prototype ?? null;
}

let patched = false;
function patch() {
	if (patched) return true;
	const ribbon = ribbonPrototype();
	if (typeof ribbon?.isSecondaryRibbonItem !== "function" || typeof ribbon.getPrimaryRibbonItems !== "function") return false;
	const isSecondary = ribbon.isSecondaryRibbonItem;
	const primary = ribbon.getPrimaryRibbonItems;
	ribbon.isSecondaryRibbonItem = function (yieldData) {
		return mode() === "own" ? false : isSecondary.call(this, yieldData);
	};
	ribbon.getPrimaryRibbonItems = function (player) {
		const rows = primary.call(this, player);
		const now = mode();
		if (now === "own") return rows.filter((row) => row.type !== COMBAT);
		if (now === "drongo") return rows.filter((row) => row.type !== MILITARY);
		return rows.filter((row) => !OWN_ROWS.includes(row.type));
	};
	patched = true;
	return true;
}

// Restyles and redraws the ribbon on screen, if any.
function apply() {
	const now = mode();
	setStyle("hud-overhaul-drongo", now === "off" ? null : now === "drongo" ? STYLES + DRONGO_STYLES : STYLES);
	document.querySelector("panel-diplo-ribbon")?.component?.populateFlags?.();
}

const CHOICES = [
	{ label: "LOC_HUD_OVERHAUL_OPTION_DRONGO_LAYOUT", value: "drongo" },
	{ label: "LOC_HUD_OVERHAUL_OPTION_DRONGO_OWN", value: "own" },
];

function addOption() {
	return addOptions(OPTION_GROUPS.PARTS, (OptionType) => [
		{
			type: OptionType.Dropdown,
			id: "hud-overhaul-option-drongo-ribbon",
			part: "ribbon",
			label: "LOC_HUD_OVERHAUL_OPTION_DRONGO_RIBBON",
			description: "LOC_HUD_OVERHAUL_OPTION_DRONGO_RIBBON_DESCRIPTION",
			dropdownItems: CHOICES,
			initListener: (info) => {
				info.selectedItemIndex = CHOICES.findIndex((choice) => choice.value === readMode());
			},
			updateListener: (info, index) => {
				const value = CHOICES[index]?.value ?? "drongo";
				try {
					writeSetting("drongoRibbon", value);
				} catch (error) {
					console.error(`${TAG} drongo: cannot save setting: ${error}`);
				}
				apply();
			},
		},
	]);
}

// Drongo's ribbon script may load after this one, so the patch waits for
// it.
function start() {
	if (patch()) {
		apply();
		return;
	}
	let tries = 0;
	const timer = setInterval(() => {
		try {
			if (patch()) {
				clearInterval(timer);
				apply();
			} else if (++tries > 60) {
				clearInterval(timer);
				console.error(`${TAG} drongo: Drongo's ribbon not found`);
			}
		} catch (error) {
			clearInterval(timer);
			console.error(`${TAG} drongo: ${error}`);
		}
	}, 500);
}

if (typeof engine !== "undefined") {
	try {
		if (active()) {
			start();
			// mode() is "off" while the whole mod is off.
			window.addEventListener(ENABLED_EVENT, () => {
				if (patched) apply();
			});
			onPart(["ribbon"], () => {
				if (patched) apply();
			});
			addOption().catch((error) => console.error(`${TAG} drongo: option not added: ${error}`));
			console.error(`${TAG} drongo loaded, civ7lab:build drongo ${BUILD}`);
		}
	} catch (error) {
		console.error(`${TAG} drongo: ${error}`);
	}
}
