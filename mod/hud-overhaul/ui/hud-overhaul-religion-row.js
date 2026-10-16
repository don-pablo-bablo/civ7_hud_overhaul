// Religion in the leader ribbon: a row under each leader's yields with their
// religion's icon and its share of the world's settlements, as the top
// bar's religion pill gives yours (hud-overhaul-religion.js). A leader
// without a religion shows the game's religion symbol and "-". The row shows
// when the pill does: through the Exploration Age, and later while you have
// a religion.
//
// The game's own religion icon, at the bottom of a leader's panel, pushes
// the civ symbol's badge below the panel (hud-overhaul-ribbon.js), so while
// the row is on it is hidden and the badge keeps its slot for every leader.
//
// The row goes in through the ribbon's own data, as the combat strength
// row does (hud-overhaul-military.js). Religion events ask the ribbon to
// update every leader's rows, since one settlement converting changes the
// shares of two religions.
//
// Its imports are relative (../../core/..., ../../base-standard/...), so it
// must stay one folder below the mod root. Log and bail, never throw.

import { DiploRibbonData } from "../../base-standard/ui/diplo-ribbon/model-diplo-ribbon.js";
import { religion, shown, SYMBOL } from "./hud-overhaul-religion.js";
import { setStyle } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "5";
const STYLE_ID = "hud-overhaul-religion-row";

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// More specific than hud-overhaul-ribbon.js's rules, which drop the badge
// below the panel when the game's religion icon is there.
const STYLES = `
.harness panel-diplo-ribbon .diplo-ribbon__religion {
	visibility: hidden;
}
.harness panel-diplo-ribbon .diplo-ribbon_content-container .hud-overhaul-civ-symbol {
	bottom: ${rem(2)};
}
`;

function on() {
	return shown(Players.get(GameContext.localObserverID));
}

function row(player) {
	const { mine, percent, world } = religion(player);
	const following = mine ? (world.religions.find((entry) => entry.type == mine.type)?.settlements ?? 0) : 0;
	return {
		type: "religion",
		label: Locale.compose("LOC_DIPLOMACY_ACTIONS_SUBHEADER_RELIGION"),
		value: mine ? Locale.compose("LOC_HUD_OVERHAUL_RELIGION_PERCENT", percent) : "-",
		img: `<img src='${mine ? mine.icon : SYMBOL}'>`,
		details: mine ? Locale.compose("LOC_HUD_OVERHAUL_RIBBON_RELIGION", mine.name, following, world.total) : Locale.compose("LOC_HUD_OVERHAUL_RIBBON_NO_RELIGION"),
		rawValue: percent,
		warningThreshold: Infinity,
	};
}

function apply() {
	setStyle(STYLE_ID, on() ? STYLES : null);
}

// Rebuilds the ribbon's data, then its rows.
function refresh() {
	apply();
	DiploRibbonData.queueUpdate();
	requestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new Event("resize"))));
}

try {
	const original = DiploRibbonData.createPlayerYieldsData;
	DiploRibbonData.createPlayerYieldsData = function (player, isLocal) {
		const rows = original.call(this, player, isLocal);
		try {
			// An empty list means the ribbon hides yields; leave it so.
			if (on() && rows.length) rows.push(row(player));
		} catch (error) {
			console.error(`${TAG} religion row: ${error}`);
		}
		return rows;
	};
	const onReligion = () => {
		try {
			for (const player of Players.getAlive()) if (player.isMajor) DiploRibbonData.queueYieldUpdate(player.id);
		} catch (error) {
			console.error(`${TAG} religion row: ${error}`);
		}
	};
	for (const name of ["CityReligionChanged", "ReligionFounded"]) engine.on(name, onReligion);
	// The row appears when a religion is founded in a later age, and the
	// stylesheet with it.
	engine.on("ReligionFounded", apply);
	engine.on("PlayerTurnActivated", apply);
	// A ribbon drawn before this loaded lacks the row until rebuilt.
	refresh();
	console.error(`${TAG} religion row loaded, civ7lab:build religion-row ${BUILD}`);
} catch (error) {
	console.error(`${TAG} religion row: ${error}`);
}
