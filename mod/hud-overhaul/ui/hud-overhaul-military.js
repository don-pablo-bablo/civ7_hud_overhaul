// Combat strength in the leader ribbon: a row under each leader's yields
// with how strong all their fighting units are together, worked out as
// Drongo's Leader Ribbons does (see combatStrength in
// hud-overhaul-strength.js). Every unit counts, seen on the map or not, as
// in Civ VI.
//
// The row goes in through the ribbon's own data: DiploRibbonData builds
// each leader's rows in createPlayerYieldsData, and this adds one to what
// it returns. The ribbon then draws, updates and tooltips it as its own.
// The ribbon updates a leader's rows on yield events only, so unit events
// ask it to update the owner's rows too.
//
// Its imports are relative (../../core/..., ../../base-standard/...), so it
// must stay one folder below the mod root. Log and bail, never throw.

import { DiploRibbonData } from "../../base-standard/ui/diplo-ribbon/model-diplo-ribbon.js";
import { combatStrength } from "./hud-overhaul-strength.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "9";

function row(player) {
	const [total, count] = combatStrength(player);
	return {
		type: "military",
		label: Locale.compose("LOC_HUD_OVERHAUL_MILITARY_STRENGTH"),
		value: total.toString(),
		img: `<img src='${UI.getIconURL("MILITARY")}'>`,
		details: Locale.compose("LOC_HUD_OVERHAUL_MILITARY_UNITS", count),
		rawValue: total,
		warningThreshold: Infinity,
	};
}

// Rebuilds the ribbon's data, then its rows.
function refresh() {
	DiploRibbonData.queueUpdate();
	requestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new Event("resize"))));
}

try {
	const original = DiploRibbonData.createPlayerYieldsData;
	DiploRibbonData.createPlayerYieldsData = function (player, isLocal) {
		const rows = original.call(this, player, isLocal);
		try {
			// An empty list means the ribbon hides yields; leave it so.
			if (rows.length) rows.push(row(player));
		} catch (error) {
			console.error(`${TAG} military: ${error}`);
		}
		return rows;
	};
	const onUnit = (data) => {
		try {
			const owner = data?.unit?.owner;
			if (owner != null) DiploRibbonData.queueYieldUpdate(owner);
		} catch (error) {
			console.error(`${TAG} military: ${error}`);
		}
	};
	for (const name of ["UnitAddedToMap", "UnitRemovedFromMap", "UnitPromoted"]) {
		engine.on(name, onUnit);
	}
	// A ribbon drawn before this loaded lacks the row until rebuilt.
	refresh();
	console.error(`${TAG} military loaded, civ7lab:build military ${BUILD}`);
} catch (error) {
	console.error(`${TAG} military: ${error}`);
}
