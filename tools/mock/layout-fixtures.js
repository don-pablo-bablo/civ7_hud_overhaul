// Invented: an Antiquity turn, so the layouts have something to show.

const STATE = {
	turn: 47,
	date: "1250 BCE",
	yields: [
		{ type: "gold", amount: 214, per: "+18" },
		{ type: "science", amount: 31 },
		{ type: "culture", amount: 24 },
		{ type: "happiness", amount: 12 },
		{ type: "influence", amount: 66, per: "+4" },
	],
	research: { name: "Bronze Working", turns: 3, pct: 0.6 },
	civic: { name: "Mysticism", turns: 5, pct: 0.3 },
	screens: ["Policy", "Res.", "Works", "Relig.", "Advis.", "Legacy"],
	quests: ["Military legacy: 4/12 settlements", "Wonders: 2/7", "Trade routes: 1/5"],
	leaders: [
		{ name: "Ashoka", colour: "#d6a23c" },
		{ name: "Hatshepsut", colour: "#4aa0c8" },
		{ name: "Xerxes", colour: "#c84a4a" },
	],
	unit: {
		name: "Army Commander",
		hp: "100/100",
		moves: "2/2",
		actions: ["Fortify", "Skip", "Sleep", "Pack", "Unpack", "Promote", "Delete"],
	},
	notifications: [
		{ text: "Choose production", colour: "#d0763c" },
		{ text: "Unit needs orders", colour: "#8a6d3b" },
		{ text: "Tech complete", colour: "#5aa6e0" },
		{ text: "Diplomatic action", colour: "#8fb3d6" },
	],
	nextTurn: "Unit needs orders",
};

export const FIXTURES = [
	{ label: "Civ VII as shipped", layout: "vanilla", state: STATE },
	{ label: "Civ VI style", layout: "civ6", state: STATE },
];
