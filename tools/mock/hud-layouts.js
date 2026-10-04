// Where each HUD component sits, per layout. Imports nothing from the game.
//
// Each component is a real custom element from base-standard's root-game.html.
// A layout places it in a box: an absolute rectangle on a 1920x1080 screen,
// in game pixels (1rem = 18px at 1080p). Boxes stack their components along
// `flow`, and `name` overrides the corner a box reports in the move list.
// Sizes come from the shipped stylesheets, so the mock's proportions match
// the game's.

export const COMPONENTS = {
	"panel-yield-banner": { w: 547, h: 32, title: "Yields" },
	"panel-system-bar": { w: 444, h: 32, title: "Turn, menu" },
	"panel-diplo-ribbon": { w: 420, h: 96, title: "Leaders" },
	"panel-sub-system-dock": { w: 640, h: 128, title: "Tech, civic, screens" },
	"quest-list": { w: 340, h: 150, title: "Quests" },
	"panel-mini-map": { w: 380, h: 236, title: "Minimap, lenses" },
	"unit-actions": { w: 560, h: 196, title: "Unit" },
	"panel-action": { w: 256, h: 256, title: "Next turn" },
	"panel-notification-train": { w: 46, h: 330, title: "Notifications" },
	// Not in the game: a panel this mod adds, drawn by its real renderer
	// (hud-overhaul-tracker-render.js), which sets its own size. It holds
	// research, civic and the quests.
	"world-tracker": { w: 215, h: "auto", title: "World Tracker", added: true },
};

export const LAYOUTS = {
	// The shipped arrangement, read from root-game.html's "world" template.
	vanilla: {
		title: "Civ VII as shipped",
		boxes: [
			{ at: { left: 0, top: 0 }, flow: "column", items: ["panel-yield-banner", "panel-sub-system-dock", "quest-list"] },
			{ at: { right: 0, top: 0 }, flow: "column", align: "end", items: ["panel-system-bar", "panel-diplo-ribbon"] },
			{ at: { left: 0, bottom: 0 }, items: ["panel-mini-map"] },
			{ at: { right: 0, bottom: 0 }, flow: "column", align: "end", items: ["panel-notification-train", "unit-actions-row"] },
		],
		rows: { "unit-actions-row": ["unit-actions", "panel-action"] },
	},

	// Civ VI as it really looks: one strip across the top, the dock on a
	// plate under it, then a World Tracker panel with research and civic as text.
	// Notifications run down the right edge. The bottom corners match Civ VII.
	civ6: {
		title: "Civ VI style",
		topBar: true,
		// Panels touch the screen edges and the top bar, with no margin.
		flush: true,
		boxes: [
			{ name: "top bar", at: { left: 0, top: 0 }, items: ["top-bar-row"] },
			{ at: { left: 0, top: 32 }, flow: "column", items: ["panel-sub-system-dock", "world-tracker"] },
			{ at: { right: 0, top: 32 }, items: ["panel-diplo-ribbon"] },
			{ name: "middle right", at: { right: 0, top: 380 }, items: ["panel-notification-train"] },
			{ at: { left: 0, bottom: 0 }, items: ["panel-mini-map"] },
			{ at: { right: 0, bottom: 0 }, items: ["unit-actions-row"] },
		],
		rows: {
			"top-bar-row": ["panel-yield-banner", "spacer", "panel-system-bar"],
			"unit-actions-row": ["unit-actions", "panel-action"],
		},
		// The dock as tuned in game: smaller rings in line with the buttons,
		// on a plate. The quests move into the tracker.
		variants: { "panel-sub-system-dock": { variant: "classic", w: 620, h: 108 } },
	},
};

// What changes between two layouts, in words, for the mock's caption.
export function moves(from, to) {
	const where = (layout) => {
		const found = {};
		for (const box of layout.boxes) {
			const name = box.name ?? (box.at.top !== undefined ? "top " : "bottom ") + (box.at.left !== undefined ? "left" : "right");
			for (const item of box.items) {
				for (const tag of layout.rows?.[item] ?? [item]) {
					if (COMPONENTS[tag]) found[tag] = name;
				}
			}
		}
		return found;
	};
	const a = where(from);
	const b = where(to);
	const lines = [];
	for (const tag of Object.keys(COMPONENTS)) {
		if (a[tag] === b[tag]) continue;
		if (!b[tag]) lines.push(`${tag}: removed`);
		else if (!a[tag]) lines.push(`${tag}: added, ${b[tag]}`);
		else lines.push(`${tag}: ${a[tag]} → ${b[tag]}`);
	}
	for (const [tag, change] of Object.entries(to.variants ?? {})) {
		lines.push(`${tag}: drawn as "${change.variant}"`);
	}
	return lines;
}
