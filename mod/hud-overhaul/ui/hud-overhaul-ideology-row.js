// Ideology in the leader ribbon, in the Modern Age: a row under each
// leader's yields, headed by the game's ideology symbol, with their
// ideology's own icon where other rows have a number, or "-" without one.
// The name does not fit; the row's tooltip has it.
//
// The game shows a leader's ideology at the bottom of their panel, in the
// slot the religion icon takes in the Exploration Age. There it pushes the
// civ symbol's badge below the panel (hud-overhaul-ribbon.js), so while the
// row is on it is hidden and the badge keeps its slot for every leader, as
// the religion row does (hud-overhaul-religion-row.js).
//
// The row goes in through the ribbon's own data, as the combat strength
// row does (hud-overhaul-military.js). The ribbon reads ideologies the same
// way (model-diplo-ribbon.js): player.Culture.getChosenIdeology().
//
// Its imports are relative (../../core/..., ../../base-standard/...), so it
// must stay one folder below the mod root. Log and bail, never throw.

import { DiploRibbonData } from "../../base-standard/ui/diplo-ribbon/model-diplo-ribbon.js";
import { ICON } from "./hud-overhaul-ribbon.js";
import { onTextSize, setStyle, textOffset } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "8";
const STYLE_ID = "hud-overhaul-ideology-row";
// The game's ideology symbol, as its text shows it.
const SYMBOL = "blp:fi_nar_rew_ideology_64";

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// More specific than hud-overhaul-ribbon.js's rules, which drop the badge
// below the panel when the game's ideology icon is there.
// The ideology's icon is a font icon, which the game draws 1.2 times the
// text's height and nudges up, inline. It sits on a line the row symbol's
// height, from its top, a quarter bigger than the symbol: the symbol's art
// sits low in its image, and that puts the two centres level, as measured
// at 4K. `offset` is the px the player's text size adds (textOffset in
// hud-overhaul-settings.js).
const styles = (offset) => `
.harness panel-diplo-ribbon .yield-colors--ideology .yield-value,
.harness panel-diplo-ribbon .yield-colors--ideology .yield-value p {
	height: ${rem(ICON + offset)};
	line-height: ${rem(ICON + offset)};
}
.harness panel-diplo-ribbon .yield-colors--ideology .yield-value img {
	width: ${rem((ICON + offset) * 1.25)} !important;
	height: ${rem((ICON + offset) * 1.25)} !important;
	top: 0 !important;
}
.harness panel-diplo-ribbon .diplo-ribbon__religion {
	visibility: hidden;
}
.harness panel-diplo-ribbon .diplo-ribbon_content-container .hud-overhaul-civ-symbol {
	bottom: ${rem(2)};
}
`;

function on() {
	return Game.age == Game.getHash("AGE_MODERN");
}

// The player's ideology from the game's table, or null.
function ideologyOf(player) {
	const chosen = player.Culture?.getChosenIdeology();
	return chosen ? (GameInfo.Ideologies.lookup(chosen) ?? null) : null;
}

function row(player) {
	const ideology = ideologyOf(player);
	const name = ideology ? Locale.compose(ideology.Name) : "";
	return {
		type: "ideology",
		label: Locale.compose("LOC_IDEOLOGY"),
		// The value is drawn as text, so the icon goes in as a font icon.
		value: ideology ? `[icon:${ideology.IdeologyType}]` : "-",
		img: `<img src='${SYMBOL}'>`,
		details: ideology ? name : Locale.compose("LOC_HUD_OVERHAUL_RIBBON_NO_IDEOLOGY"),
		rawValue: 0,
		warningThreshold: Infinity,
	};
}

function apply() {
	setStyle(STYLE_ID, on() ? styles(textOffset()) : null);
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
			console.error(`${TAG} ideology row: ${error}`);
		}
		return rows;
	};
	// The game sends no event when a leader adopts an ideology, so every
	// leader's rows are updated each turn.
	engine.on("PlayerTurnActivated", () => {
		try {
			for (const player of Players.getAlive()) if (player.isMajor) DiploRibbonData.queueYieldUpdate(player.id);
		} catch (error) {
			console.error(`${TAG} ideology row: ${error}`);
		}
	});
	onTextSize(apply);
	// A ribbon drawn before this loaded lacks the row until rebuilt.
	refresh();
	console.error(`${TAG} ideology row loaded, civ7lab:build ideology-row ${BUILD}`);
} catch (error) {
	console.error(`${TAG} ideology row: ${error}`);
}
