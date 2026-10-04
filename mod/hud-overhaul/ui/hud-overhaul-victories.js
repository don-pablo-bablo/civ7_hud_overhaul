// Victory standings in the top bar: a pill with the game's victories icon,
// then your place in each victory, each after an icon players know from the
// rest of the HUD: military strength, culture, gold and science. Its
// tooltip, in hud-overhaul-tooltips.js, has each victory's leaderboard.
//
// The standings are the victories screen's own sums
// (base-standard/ui-next/screens/victories/victories-screen-model.js,
// calcVictoryLeaderboard): every major civ's points for each victory the
// game has on, highest first, with whether one is dominant and counting
// down to winning. Score, the end of age total, is left out. Leaders not
// met are ranked but not named.
//
// It goes in the slot the top bar keeps for mods, through ModdingRegistry,
// as hud-overhaul-treasure.js does. It is the game's yield-bar-entry, so it is
// styled as the other pills, but the entry's own icon is hidden and the pill
// draws its own.
//
// An option in Options > Add-ons turns it off.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ContextManager } from "../../core/ui/context-manager/context-manager.js";
import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { addOptions, onTextSize, OPTION_GROUPS, readSettings, setStyle, textOffset, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "5";
const COMPONENT = "hud-overhaul-victories";
const ENTRY = "hud-overhaul-victories-entry";
const RANKS = "hud-overhaul-victories-ranks";
const RANK = "hud-overhaul-victories-rank";
const LEAD = "blp:prof_civvictories"; // the game's victories icon
// The pill's data-icon, which hud-overhaul-tooltips.js finds it by.
export const ICON = "HUD_OVERHAUL_VICTORIES";

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// The victory classes shown: [class, pill icon, the game's emblem, colour].
export function victoryClasses() {
	return {
		VICTORY_CLASS_MILITARY: [UI.getIconURL("MILITARY"), "blp:victory_militaristic", "190, 70, 60"],
		VICTORY_CLASS_CULTURE: [UI.getIconURL("YIELD_CULTURE", "YIELD"), "blp:victory_cultural", "155, 89, 208"],
		VICTORY_CLASS_ECONOMIC: [UI.getIconURL("YIELD_GOLD", "YIELD"), "blp:victory_economic", "212, 160, 23"],
		VICTORY_CLASS_SCIENCE: [UI.getIconURL("YIELD_SCIENCE", "YIELD"), "blp:victory_scientific", "59, 143, 217"],
	};
}

// 1st, 2nd, 3rd, 4th, 11th.
export function ordinal(n) {
	const teen = n % 100 > 10 && n % 100 < 14;
	return `${n}${(!teen && ["", "st", "nd", "rd"][n % 10]) || "th"}`;
}

// Each victory on, in the game's order: { cls, name, goal, duration,
// scores, mine }. Scores are { id, name, points, dominant, turns, place },
// highest first; ties share a place. Name is null for a leader not met.
export function standings() {
	const me = GameContext.localObserverID;
	const local = Players.get(me);
	if (!local?.Diplomacy) return [];
	const classes = victoryClasses();
	const list = [];
	for (const victory of GameInfo.VictoryTypes) {
		const definition = GameInfo.Victories.find((row) => row.VictoryType == victory.VictoryType);
		if (!definition || !classes[definition.VictoryClassType]) continue;
		if (!Game.VictoryManager.isCountdownVictoryEnabled(victory.VictoryType)) continue;
		const scores = Players.getAlive()
			.filter((player) => player.isMajor && player.Victories)
			.map((player) => {
				const status = player.Victories.getVictoryCountdownStatus(victory.$hash);
				return {
					id: player.id,
					name: player.id == me || local.Diplomacy.hasMet(player.id) ? Locale.compose(player.name) : null,
					points: player.Victories.getPointsForVictoryType(victory.$hash) ?? 0,
					dominant: !!status?.isDominant,
					turns: status?.turns ?? 0,
				};
			})
			.sort((a, b) => b.points - a.points);
		scores.forEach((score, i) => (score.place = i && score.points == scores[i - 1].points ? scores[i - 1].place : i + 1));
		const mine = scores.find((score) => score.id == me);
		if (!mine) continue;
		list.push({
			cls: definition.VictoryClassType,
			name: Locale.compose(victory.Name),
			goal: Game.VictoryManager.getCountdownVictoryDominanceScore(victory.$hash),
			duration: victory.CountdownDuration,
			scores,
			mine,
		});
	}
	return list;
}

// The icons grow with the player's text size.
const styles = () => `
${COMPONENT} { display: flex; }
${COMPONENT}.hud-overhaul-off { display: none; }
.${ENTRY} { color: rgb(230, 215, 180); }
.${ENTRY} > img { display: none; }
.${RANKS} { display: flex; flex-direction: row; align-items: center; white-space: nowrap; }
.${RANK} { display: flex; flex-direction: row; align-items: center; margin-right: ${rem(6)}; }
.${RANK}:last-child { margin-right: 0; }
panel-yield-banner .panel-yield__top-bar-content .${RANKS} img {
	width: ${rem(19 + textOffset())};
	height: ${rem(19 + textOffset())};
	margin-right: ${rem(2)};
}
panel-yield-banner .panel-yield__top-bar-content .${RANKS} img.hud-overhaul-victories-lead {
	width: ${rem(22 + textOffset())};
	height: ${rem(22 + textOffset())};
	margin-right: ${rem(5)};
}
`;

// Each one on screen, for the option to update at once.
const attached = new Set();

class Victories extends Component {
	entry = null;
	ranks = null;
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} victories: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		// Two rows move the pill (hud-overhaul-rows.js), which attaches it
		// again; it keeps the entry it has.
		if (!this.entry) {
			this.entry = document.createElement("yield-bar-entry");
			this.entry.dataset.icon = ICON;
			this.entry.classList.add(ENTRY);
			this.ranks = document.createElement("div");
			this.ranks.classList.add(RANKS);
			this.entry.appendChild(this.ranks);
			// Clicked, it opens the victories screen, as the dock's button does.
			this.entry.addEventListener("action-activate", () =>
				ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true }),
			);
			this.Root.appendChild(this.entry);
		}
		attached.add(this);
		this.onUpdate();
		// In case the game draws the entry after this frame.
		requestAnimationFrame(this.onUpdate);
		engine.on("PlayerTurnActivated", this.onUpdate);
		engine.on("VictoryPointsChanged", this.onUpdate);
		engine.on("VictoryCountdownChanged", this.onUpdate);
		engine.on("VictoryDominanceChanged", this.onUpdate);
		engine.on("DiplomacyMeetMajors", this.onUpdate);
	}

	onDetach() {
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("VictoryPointsChanged", this.onUpdate);
		engine.off("VictoryCountdownChanged", this.onUpdate);
		engine.off("VictoryDominanceChanged", this.onUpdate);
		engine.off("DiplomacyMeetMajors", this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}

	update() {
		// The game's entry adds its icon's colour class from a list that
		// lacks this one, so it adds the class "undefined".
		this.entry.classList.remove("undefined");
		// The game draws the entry's icon and its own empty text after this
		// adds the ranks, so the ranks are moved back to the end.
		if (this.entry.lastChild !== this.ranks) this.entry.appendChild(this.ranks);
		const list = enabled() ? standings() : [];
		this.Root.classList.toggle("hud-overhaul-off", !list.length);
		if (!list.length) return;
		const classes = victoryClasses();
		this.ranks.innerHTML = "";
		const lead = document.createElement("img");
		lead.src = LEAD;
		lead.classList.add("hud-overhaul-victories-lead");
		this.ranks.appendChild(lead);
		for (const victory of list) {
			const rank = document.createElement("div");
			rank.classList.add(RANK);
			const img = document.createElement("img");
			img.src = classes[victory.cls][0];
			const text = document.createElement("span");
			text.textContent = ordinal(victory.mine.place);
			rank.append(img, text);
			this.ranks.appendChild(rank);
		}
		// Text the game's tooltip can fall back on; hud-overhaul-tooltips.js
		// draws the detailed one.
		this.entry.dataset.tooltipContent = list.map((victory) => `${victory.name}: ${ordinal(victory.mine.place)}`).join("[N]");
	}
}

function enabled() {
	return readSettings().victoryStandings !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-victories",
			label: "LOC_HUD_OVERHAUL_OPTION_VICTORIES",
			description: "LOC_HUD_OVERHAUL_OPTION_VICTORIES_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("victoryStandings", !!value);
				} catch (error) {
					console.error(`${TAG} victories: cannot save setting: ${error}`);
				}
				for (const pill of attached) pill.onUpdate();
			},
		},
	], "victories");
}

try {
	const restyle = () => setStyle("hud-overhaul-victories", styles());
	restyle();
	onTextSize(restyle);
	Controls.define(COMPONENT, { createInstance: Victories });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} victories: option not added: ${error}`));
	console.error(`${TAG} victories loaded, civ7lab:build victories ${BUILD}`);
} catch (error) {
	console.error(`${TAG} victories: ${error}`);
}
