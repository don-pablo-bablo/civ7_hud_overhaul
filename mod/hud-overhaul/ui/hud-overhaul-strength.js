// Combat strength, for the units pill's tooltip and the leader ribbon's row.
// Plain sums over the engine's units, with no imports and nothing run at
// load, so the top bar can use them without the ribbon's row.

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
// hud-overhaul-tooltips.js shows it at the top of the units tooltip, and
// hud-overhaul-military.js as a row in the leader ribbon.
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
