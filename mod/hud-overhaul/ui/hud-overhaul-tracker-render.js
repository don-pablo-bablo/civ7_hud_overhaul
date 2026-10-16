// Draws the World Tracker: current research and civic, as Civ VI's World
// Tracker shows them. Imports nothing and calls no engine API, so the same
// code draws the panel in game and in the browser mock.
//
// Input is one object. Strings are already localised. An icon is a CSS
// url(...) value, or null to draw a plain disc:
//
//   {
//     research: { name: "Bronze Working", icon: "url(...)", turns: "3 turns", progress: 0.6 },
//     civic: { name: "Mysticism II", icon: null, turns: "5 turns", progress: 0.3 },
//     labels: { title, research, civic, chooseResearch, chooseCivic },
//     placeholders: { tech: "url(...)", civic: "url(...)" },
//     quests: ["Wonders: 2/7", "Trade routes: 1/5"],
//   }
//
// placeholders, optional, are the icons drawn while nothing is chosen, as
// the dock's rings show them; without, a plain disc.
// labels, optional, are the panel's own words; the mock leaves them out
// and gets English. collapsed, optional, draws the heading alone. The heading ends in an empty
// .hud-overhaul-tracker__toggle, where the game side puts its +/- button.
// research or civic is null when nothing is chosen. quests is optional: only
// the full-screen mock passes it, since in game the Journal stays the game's
// own, under the tracker. Each row carries
// data-hud-overhaul-open="tech" or "civic" for the game side to make clickable.
//
// Sizes are rem, so the panel scales with the game's UI (1rem = 18px at
// 1080p). Progress is a bar rather than a ring: conic-gradient appears
// nowhere in the game's stylesheets, so it may not draw there.

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

const COLOURS = {
	tech: { accent: "#5aa6e0", well: "#16283a" },
	civic: { accent: "#b06ad6", well: "#2a1a33" },
};

// Text sizes are px at the game's Small text size; offset is the px the
// player's text size adds (textOffset in hud-overhaul-settings.js).
export function styles(offset = 0) {
	const text = (px) => rem(px + offset);
	return `
.hud-overhaul-tracker {
	/* Ends level with the civic ring's right edge in the dock above, and
	   widens with bigger text. */
	width: ${rem(199 + 4 * offset)};
	/* The default plate colour, for the mock. In game hud-overhaul-theme.js
	   clears it and colours the column behind it instead. */
	background-color: rgba(23, 21, 16, 0.85);
	/* Square: in game it sits in one column with the Journal, which
	   carries the plate and its rounded corner. */
	padding: ${rem(6)} ${rem(10)} ${rem(8)} ${rem(10)};
	color: #e5d9bf;
	pointer-events: auto;
}
.hud-overhaul-tracker__head {
	position: relative;
	font-size: ${text(11)};
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: #a8936a;
	margin-bottom: ${rem(4)};
}
/* At the heading's right end, where the Journal's +/- sits in its own. */
.hud-overhaul-tracker__toggle {
	position: absolute;
	top: ${rem(-1)};
	right: ${rem(4)};
}
.hud-overhaul-tracker--collapsed .hud-overhaul-tracker__head { margin-bottom: 0; }
.hud-overhaul-tracker--collapsed .hud-overhaul-tracker__row,
.hud-overhaul-tracker--collapsed .hud-overhaul-tracker__quests { display: none; }
.hud-overhaul-tracker__row {
	display: flex;
	align-items: center;
	padding: ${rem(5)} 0;
	border-top: ${rem(1)} solid rgba(255, 255, 255, 0.06);
	cursor: pointer;
}
.hud-overhaul-tracker__icon {
	width: ${text(30)};
	height: ${text(30)};
	border-radius: 50%;
	border: ${rem(2)} solid;
	background-size: 70%;
	background-position: center;
	background-repeat: no-repeat;
	flex: none;
	margin-right: ${rem(7)};
}
.hud-overhaul-tracker__body { flex: auto; min-width: 0; }
.hud-overhaul-tracker__kind {
	font-size: ${text(10)};
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #a8936a;
}
.hud-overhaul-tracker__name {
	font-size: ${text(13)};
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.hud-overhaul-tracker__line { display: flex; align-items: center; margin-top: ${rem(3)}; }
.hud-overhaul-tracker__bar {
	flex: auto;
	height: ${rem(5)};
	border-radius: ${rem(3)};
	background: rgba(255, 255, 255, 0.08);
	overflow: hidden;
}
.hud-overhaul-tracker__fill { height: 100%; }
.hud-overhaul-tracker__turns {
	flex: none;
	margin-left: ${rem(8)};
	font-size: ${text(12)};
	color: #cbbd9c;
}
.hud-overhaul-tracker__empty { font-size: ${text(12)}; color: #d9a441; }
.hud-overhaul-tracker__quests {
	border-top: ${rem(1)} solid rgba(255, 255, 255, 0.06);
	padding-top: ${rem(6)};
	margin-top: ${rem(2)};
}
.hud-overhaul-tracker__quest { font-size: ${text(12)}; padding: ${rem(2)} 0; color: #cbbd9c; }
`;
}

// At Small, for the mock.
export const STYLES = styles();

function el(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

// The panel's words when the game passes none, which only the mock does:
// English for the mock only.
const LABELS = {
	title: "World Tracker", // mock only
	research: "Research",
	civic: "Civic",
	chooseResearch: "Choose research",
	chooseCivic: "Choose civic",
};

function row(kind, label, choose, item, placeholder) {
	const colour = COLOURS[kind];
	const node = el("div", "hud-overhaul-tracker__row");
	node.setAttribute("data-hud-overhaul-open", kind);

	const icon = el("div", "hud-overhaul-tracker__icon");
	icon.style.borderColor = colour.accent;
	icon.style.backgroundColor = colour.well;
	const image = item ? item.icon : placeholder;
	if (image) icon.style.backgroundImage = image;
	node.append(icon);

	const body = el("div", "hud-overhaul-tracker__body");
	body.append(el("div", "hud-overhaul-tracker__kind", label));
	if (!item) {
		body.append(el("div", "hud-overhaul-tracker__empty", choose));
		node.append(body);
		return node;
	}
	body.append(el("div", "hud-overhaul-tracker__name font-title-base", item.name));
	const line = el("div", "hud-overhaul-tracker__line");
	const bar = el("div", "hud-overhaul-tracker__bar");
	const fill = el("div", "hud-overhaul-tracker__fill");
	fill.style.width = `${Math.round(Math.max(0, Math.min(1, item.progress)) * 100)}%`;
	fill.style.backgroundColor = colour.accent;
	bar.append(fill);
	line.append(bar, el("div", "hud-overhaul-tracker__turns", item.turns));
	body.append(line);
	node.append(body);
	return node;
}

export function render(data) {
	const panel = el("div", data.collapsed ? "hud-overhaul-tracker hud-overhaul-tracker--collapsed" : "hud-overhaul-tracker");
	const labels = { ...LABELS, ...data.labels };
	const head = el("div", "hud-overhaul-tracker__head font-title-base", labels.title);
	head.append(el("div", "hud-overhaul-tracker__toggle"));
	panel.append(head);
	const placeholders = data.placeholders || {};
	panel.append(row("tech", labels.research, labels.chooseResearch, data.research, placeholders.tech));
	panel.append(row("civic", labels.civic, labels.chooseCivic, data.civic, placeholders.civic));
	if (data.quests && data.quests.length) {
		const quests = el("div", "hud-overhaul-tracker__quests");
		for (const quest of data.quests) quests.append(el("div", "hud-overhaul-tracker__quest", quest));
		panel.append(quests);
	}
	return panel;
}
