// Combat strength in the leader ribbon: a row under each leader's yields
// with how strong all their fighting units are together, worked out as
// Drongo's Leader Ribbons does (see combatStrength). Every unit counts, seen
// on the map or not, as in Civ VI.
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

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "8";

// A unit's best strength, melee, ranged or bombard, or 0 without combat, as
// the unit panel shows it. hud-overhaul-units.js lists it for each unit.
export function unitStrength(unit) {
	const combat = unit.Combat;
	if (!combat) return 0;
	return Math.max(combat.getMeleeStrength(false) || 0, combat.rangedStrength || 0, combat.bombardStrength || 0);
}

// [combat strength, number of units counted] for one player.
//
// The formula is from Drongo's Leader Ribbons by Drongo from One More Turn
// (calculatePlayerCombatStrength in its ui/diplo-ribbon/model-diplo-ribbon.js,
// Steam Workshop item 3734152860). This mod uses it, with credit, so that
// this row and Drongo's Combat Strength row show the same value.
//
// Each unit that can attack counts 4 to the power of its best melee or
// ranged strength over 17, rounded: 1 at 0, 4 at 17, 16 at 34, 64 at 51.
// The curve gives stronger units more weight than a plain sum would. Our
// understanding of why: in Civ, combat damage grows exponentially with the
// gap in strength. In Civ VI a unit 17 points stronger deals about twice the
// damage and takes about half, so it is worth about four weaker ones. That
// reading is ours, not something Drongo's mod states.
//
// hud-overhaul-tooltips.js shows it at the top of the units tooltip.
export function combatStrength(player) {
	let total = 0;
	let count = 0;
	for (const unit of player.Units?.getUnits() ?? []) {
		const combat = unit.Combat;
		if (!combat?.canAttack) continue;
		const best = Math.max(Number(combat.getMeleeStrength(false)) || 0, Number(combat.rangedStrength) || 0);
		if (best <= 0) continue;
		total += Math.round(4 ** (best / 17));
		count++;
	}
	return [total, count];
}

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
