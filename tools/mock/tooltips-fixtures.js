// Cases for the tooltips mock: each pill's tooltip, hovered and locked, from
// tools/mock/captured.js. Browser only. Serve from the repo root:
//   civ7lab mock serve --root . \
//     --renderer tools/mock/tooltips-render.js \
//     --fixtures tools/mock/tooltips-fixtures.js
//
// The game's own stylesheet is linked from `reference`, a gitignored link to
// the game folder, for the frame and the text classes. Sprites are blp:
// images the browser cannot load; discs stand in for icons, and the frame
// gets a flat background.
import { CAPTURED } from "./captured.js";

document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "/reference/Base/modules/core/ui/themes/default/default.css" }));
const MOCK = `
html { font-size: 18px; }
html, body { overflow: auto !important; height: auto !important; background: #3a3d44; }
.hud-overhaul-mock-tips { display: flex; flex-direction: row; align-items: flex-start; gap: 24px; }
.hud-overhaul-mock-frame, .hud-overhaul-tip-pinned {
	position: relative;
	visibility: visible;
	background: #17191f !important;
	border: 1px solid #53565d;
	color: #e5e5e5;
}
/* Icons are blp: sprites the browser cannot load; discs stand in. */
.hud-overhaul-mock-tips img[src^="blp:"], .hud-overhaul-mock-tips [style*="blp:"] {
	background-color: rgba(200, 185, 140, 0.55) !important;
	border-radius: 50%;
}
`;
document.head.append(Object.assign(document.createElement("style"), { textContent: MOCK + CAPTURED.styles["hud-overhaul-tooltips"] }));

// "hud-overhaul-tip-yield-gold" reads "Gold".
function title(tag) {
	const name = tag.replace("hud-overhaul-tip-", "").replace("yield-", "").replace("diplomacy", "influence").replace("greatworks", "great works").replace("levels", "happiness levels");
	return name.charAt(0).toUpperCase() + name.slice(1);
}

export const FIXTURES = CAPTURED.tooltips.map((tip) => ({
	label: `${title(tip.tag)}${tip.armyOpen ? ", an army open" : ""}`,
	hovered: tip.hovered,
	locked: tip.locked,
}));
