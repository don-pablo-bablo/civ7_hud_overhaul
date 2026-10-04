// Draws a whole HUD layout as a wireframe screen, for `civ7lab mock serve`.
// Imports nothing from the game: it takes a fixture of plain data and returns
// a DOM node. Each box is named after the real component it stands for.

import { COMPONENTS, LAYOUTS, moves } from "./hud-layouts.js";
import { render as renderTracker, STYLES as TRACKER_STYLES } from "../../mod/hud-overhaul/ui/hud-overhaul-tracker-render.js";

const SCREEN = { w: 1920, h: 1080 };

const STYLE = `
.hud-screen { position: relative; overflow: hidden; border-radius: 4px;
  background:
    radial-gradient(ellipse at 30% 40%, #3d5a3a 0, transparent 45%),
    radial-gradient(ellipse at 70% 65%, #4f5a35 0, transparent 40%),
    radial-gradient(ellipse at 85% 20%, #2a4a63 0, transparent 35%),
    #24402f; }
.hud-stage { position: absolute; left: 0; top: 0; transform-origin: 0 0;
  font: 18px/1.25 system-ui, "Segoe UI", sans-serif; color: #e8dcc0; }
.hud-topbar { position: absolute; left: 0; right: 0; top: 0; height: 32px;
  background: linear-gradient(#1a1610, #11100c); border-bottom: 2px solid #8a6d3b; }
.hud-box { position: absolute; display: flex; gap: 8px; padding: 8px; }
.hud-flush .hud-box { padding: 0; gap: 0; }
.hud-flush .hud-c { border-radius: 0; }
.hud-c { position: relative; box-sizing: border-box; flex: none;
  background: rgba(16, 14, 11, .88); border: 1px solid #8a6d3b; border-radius: 6px;
  padding: 6px 10px; overflow: hidden; }
.hud-c > .tag { position: absolute; right: 6px; bottom: 3px; font: 11px ui-monospace, monospace;
  color: #c8a45c; opacity: .75; }
.hud-c.flat { border-radius: 0; border-width: 0 0 0 0; background: transparent; }
.hud-yields { display: flex; gap: 18px; align-items: center; height: 100%; font-weight: 600; }
.hud-dot { display: inline-block; width: 18px; height: 18px; border-radius: 50%;
  vertical-align: -3px; margin-right: 5px; }
.hud-ring { width: 104px; height: 104px; border-radius: 50%; display: grid; place-items: center;
  text-align: center; font-size: 13px; flex: none; }
.hud-ring > div { width: 84px; height: 84px; border-radius: 50%; background: #15120e;
  display: grid; place-items: center; padding: 4px; box-sizing: border-box; }
.hud-btn { width: 52px; height: 52px; border-radius: 50%; border: 1px solid #8a6d3b;
  background: #2a231a; display: grid; place-items: center; font-size: 12px; flex: none; }
.hud-leader { width: 72px; height: 72px; border-radius: 50%; border: 2px solid; background: #2a231a;
  display: grid; place-items: center; font-size: 12px; text-align: center; flex: none; }
.hud-next { width: 100%; height: 100%; border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(#5b4a2a, #2a2117); border: 3px solid #c8a45c; text-align: center;
  font-size: 22px; font-weight: 700; padding: 30px; box-sizing: border-box; }
.hud-map { position: absolute; inset: 6px 6px 50px 6px; border-radius: 3px;
  background: linear-gradient(135deg, #2a4a63 0 30%, #3d5a3a 30% 60%, #6b6a45 60% 75%, #2a4a63 75%); }
.hud-lenses { position: absolute; left: 6px; right: 6px; bottom: 6px; display: flex; gap: 6px; }
.hud-lenses > span { width: 38px; height: 38px; border-radius: 50%; background: #2a231a;
  border: 1px solid #8a6d3b; }
.hud-note { position: absolute; width: 38px; height: 38px; border-radius: 50%;
  border: 2px solid #c8a45c; left: 3px; }
.hud-c.plate { border: 0; border-radius: 0 0 12px 0; background: linear-gradient(180deg, #11100c, #1c1a14);
  border-right: 1px solid rgba(255,255,255,.08); border-bottom: 1px solid rgba(255,255,255,.08); }
.hud-moves { margin: 8px 0 0; padding-left: 18px; color: #b9a988; font-size: 13px; }
`;

const YIELD_COLOURS = {
	gold: "#e8c04a", science: "#5aa6e0", culture: "#b06ad6",
	happiness: "#f0a03c", influence: "#8fb3d6", food: "#7cc35a", production: "#d0763c",
};

function el(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function ring(colour, pct, label) {
	const outer = el("div", "hud-ring");
	outer.style.background = `conic-gradient(${colour} ${pct * 360}deg, #3a3026 0)`;
	const inner = el("div");
	inner.textContent = label;
	outer.append(inner);
	return outer;
}

// The contents of each component, from the fixture's state.
const DRAW = {
	"panel-yield-banner"(s, box) {
		box.classList.add("flat");
		const row = el("div", "hud-yields");
		for (const y of s.yields) {
			const item = el("span");
			const dot = el("span", "hud-dot");
			dot.style.background = YIELD_COLOURS[y.type] || "#999";
			item.append(dot, `${y.amount}${y.per ? ` (${y.per})` : ""}`);
			row.append(item);
		}
		box.append(row);
	},
	"panel-system-bar"(s, box) {
		box.classList.add("flat");
		const row = el("div", "hud-yields");
		row.style.justifyContent = "flex-end";
		row.append(el("span", "", `Turn ${s.turn}`), el("span", "", s.date), el("span", "", "☰"));
		box.append(row);
	},
	"panel-diplo-ribbon"(s, box) {
		box.style.display = "flex";
		box.style.gap = "10px";
		box.style.justifyContent = "flex-end";
		for (const leader of s.leaders) {
			const face = el("div", "hud-leader", leader.name);
			face.style.borderColor = leader.colour;
			box.append(face);
		}
	},
	"panel-sub-system-dock"(s, box, variant) {
		box.style.display = "flex";
		box.style.gap = "10px";
		box.style.alignItems = "center";
		if (variant === "classic") {
			// As tuned in game: circles 5px apart on one centre line, 5px in
			// from the edge and 12px below the top bar, on a plate.
			box.classList.add("plate");
			box.style.gap = "5px";
			box.style.padding = "12px 5px 0 5px";
			box.style.alignItems = "flex-start";
			box.style.alignContent = "flex-start";
			const small = (colour, pct, size, label) => {
				const r = ring(colour, pct, label);
				r.style.width = r.style.height = `${size}px`;
				r.firstChild.style.width = r.firstChild.style.height = `${size - 12}px`;
				r.firstChild.style.fontSize = "11px";
				r.style.marginTop = `${(73 - size) / 2}px`;
				return r;
			};
			box.append(
				small("#c8a45c", 0.19, 73, "19%"),
				small("#5aa6e0", s.research.pct, 62, String(s.research.turns)),
				small("#b06ad6", s.civic.pct, 62, String(s.civic.turns)),
			);
			for (const name of s.screens) {
				const b = el("div", "hud-btn", name);
				b.style.width = b.style.height = "52px";
				b.style.marginTop = "10.5px";
				box.append(b);
			}
			return;
		}
		box.append(
			ring("#5aa6e0", s.research.pct, `${s.research.name}\n${s.research.turns} turns`),
			ring("#b06ad6", s.civic.pct, `${s.civic.name}\n${s.civic.turns} turns`),
		);
		for (const name of s.screens) box.append(el("div", "hud-btn", name));
		box.querySelectorAll(".hud-ring > div").forEach((d) => (d.style.whiteSpace = "pre-line"));
	},
	"quest-list"(s, box) {
		box.style.fontSize = "15px";
		for (const quest of s.quests) box.append(el("div", "", `• ${quest}`));
	},
	"world-tracker"(s, box) {
		// The real renderer draws its own plate.
		box.style.cssText += ";border:0;background:transparent;padding:0;margin-top:4px;overflow:visible";
		const item = (x) => x && { name: x.name, icon: null, turns: `${x.turns} turns`, progress: x.pct };
		box.append(renderTracker({ research: item(s.research), civic: item(s.civic), quests: s.quests }));
	},
	"panel-mini-map"(s, box) {
		box.append(el("div", "hud-map"));
		const lenses = el("div", "hud-lenses");
		for (let i = 0; i < 6; i++) lenses.append(el("span"));
		box.append(lenses);
	},
	"unit-actions"(s, box) {
		const u = s.unit;
		const head = el("div");
		head.style.cssText = "font-weight:700;font-size:20px";
		head.textContent = u.name;
		const stats = el("div", "", `HP ${u.hp} · Moves ${u.moves}`);
		stats.style.cssText = "color:#b9a988;font-size:15px;margin-bottom:8px";
		const actions = el("div");
		actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
		for (const a of u.actions) actions.append(el("div", "hud-btn", a));
		box.append(head, stats, actions);
	},
	"panel-action"(s, box) {
		box.style.cssText += ";border:0;background:transparent;padding:0";
		box.append(el("div", "hud-next", s.nextTurn));
	},
	"panel-notification-train"(s, box) {
		box.style.cssText += ";padding:0";
		s.notifications.forEach((n, i) => {
			const note = el("div", "hud-note");
			note.title = n.text;
			note.style.top = `${4 + i * 44}px`;
			note.style.background = n.colour;
			box.append(note);
		});
	},
};

function component(tag, state, layout) {
	const spec = { ...COMPONENTS[tag], ...layout.variants?.[tag] };
	const box = el("div", "hud-c");
	box.style.width = `${spec.w}px`;
	if (spec.h !== "auto") box.style.height = `${spec.h}px`;
	if (spec.added) box.style.borderStyle = "dashed";
	DRAW[tag]?.(state, box, spec.variant);
	box.append(el("span", "tag", spec.added ? `${tag} (new)` : tag));
	return box;
}

function place(layout, state, stage) {
	if (layout.topBar) stage.append(el("div", "hud-topbar"));
	for (const spec of layout.boxes) {
		const box = el("div", "hud-box");
		for (const [side, px] of Object.entries(spec.at)) box.style[side] = `${px}px`;
		box.style.flexDirection = spec.flow || "row";
		box.style.alignItems = spec.align === "end" ? "flex-end" : "flex-start";
		for (const item of spec.items) {
			const row = layout.rows?.[item];
			if (!row) {
				box.append(component(item, state, layout));
				continue;
			}
			const line = el("div");
			line.style.cssText = `display:flex;gap:${layout.flush ? 0 : 8}px;align-items:flex-end`;
			if (row.includes("spacer")) line.style.width = `${SCREEN.w - (layout.flush ? 0 : 16)}px`;
			for (const tag of row) {
				if (tag === "spacer") {
					line.append(Object.assign(el("div"), { style: "flex:1" }));
				} else {
					line.append(component(tag, state, layout));
				}
			}
			box.append(line);
		}
		stage.append(box);
	}
}

let styled = false;

export function render(fixture) {
	if (!styled) {
		document.head.append(Object.assign(el("style"), { textContent: STYLE + TRACKER_STYLES }));
		// The tracker sizes itself in rem; 18px is the game's at 1080p.
		document.documentElement.style.fontSize = "18px";
		styled = true;
	}
	const layout = LAYOUTS[fixture.layout];
	if (!layout) throw new Error(`no layout "${fixture.layout}"; have ${Object.keys(LAYOUTS).join(", ")}`);
	const scale = fixture.scale ?? 0.6;
	const wrap = el("div");
	const screen = el("div", "hud-screen");
	screen.style.width = `${SCREEN.w * scale}px`;
	screen.style.height = `${SCREEN.h * scale}px`;
	const stage = el("div", "hud-stage");
	stage.style.width = `${SCREEN.w}px`;
	stage.style.height = `${SCREEN.h}px`;
	stage.style.transform = `scale(${scale})`;
	if (layout.flush) stage.classList.add("hud-flush");
	place(layout, fixture.state, stage);
	screen.append(stage);
	wrap.append(screen);
	if (fixture.layout !== "vanilla") {
		const list = el("ul", "hud-moves");
		for (const line of moves(LAYOUTS.vanilla, layout)) list.append(el("li", "", line));
		wrap.append(list);
	}
	return wrap;
}
