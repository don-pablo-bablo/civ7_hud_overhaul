// Cases for the World Tracker mock. Invented: the tracker logs nothing to
// capture.
//
// Browser only, never loaded in game. It sets what the game sets and the
// mock page lacks: 1rem = 18px as at 1080p, and the tracker's stylesheet.
import { STYLES } from "../../mod/hud-overhaul/ui/hud-overhaul-tracker-render.js";

document.documentElement.style.fontSize = "18px";
document.head.append(Object.assign(document.createElement("style"), { textContent: STYLES }));

export const FIXTURES = [
	{
		label: "Mid turn",
		research: { name: "Bronze Working", icon: null, turns: "3 turns", progress: 0.6 },
		civic: { name: "Mysticism", icon: null, turns: "5 turns", progress: 0.3 },
		quests: ["Military legacy: 4/12 settlements", "Wonders: 2/7", "Trade routes: 1/5"],
	},
	{
		label: "Nothing chosen",
		research: null,
		civic: null,
		quests: [],
	},
	{
		label: "Long name, last turn",
		research: { name: "Mathematics and Engineering II", icon: null, turns: "1 turn", progress: 0.95 },
		civic: { name: "Discipline", icon: null, turns: "12 turns", progress: 0.05 },
		quests: ["Economic legacy: 3/20 resources"],
	},
];
