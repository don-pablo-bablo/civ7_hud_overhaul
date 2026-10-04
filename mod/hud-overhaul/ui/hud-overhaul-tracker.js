// The World Tracker in game: reads the current research and civic, and draws
// them with hud-overhaul-tracker-render.js in a slot under the sub-system dock.
// The Journal (quest-list) stays the game's own, underneath. Both sit in the
// Journal's row, which carries the plate, so the two are one panel.
//
// The data calls are the ones the dock makes for its rings
// (base-standard/ui/sub-system-dock/panel-sub-system-dock.js), and a row
// opens the same chooser the dock's ring does.
//
// The HUD is rebuilt from <template class="world"> on every view change, so
// the slot is added to the template, and an observer on the harness draws
// into each new copy. Engine events redraw the copy showing.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ContextManager } from "../../core/ui/context-manager/context-manager.js";
import { Icon } from "../../core/ui/utilities/utilities-image.js";
import { addOptions, onTextSize, OPTION_GROUPS, readSettings, setStyle, textOffset, writeSetting } from "./hud-overhaul-settings.js";
import { render, styles } from "./hud-overhaul-tracker-render.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "10";
const SLOT = "hud-overhaul-tracker-slot";

const CHOOSERS = {
	tech: "screen-tech-tree-chooser",
	civic: "screen-culture-tree-chooser",
};

// One tree's active node as the renderer's plain data, or null when nothing
// is being researched. `system` is player.Techs or player.Culture.
function current(playerID, system, treeType, iconFor) {
	if (!system) return null;
	const tree = Game.ProgressionTrees.getTree(playerID, treeType);
	if (!tree || tree.activeNodeIndex < 0) return null;
	const active = tree.nodes[tree.activeNodeIndex];
	const node = Game.ProgressionTrees.getNode(playerID, active.nodeType);
	if (!node) return null;
	const info = GameInfo.ProgressionTreeNodes.lookup(active.nodeType);
	if (!info) return null;
	let name = Locale.compose(info.Name ?? info.ProgressionTreeNodeType);
	if (node.depthUnlocked >= 1) {
		const numeral = Locale.toRomanNumeral(node.depthUnlocked + 1);
		if (numeral) name += " " + numeral;
	}
	const cost = system.getNodeCost(system.getResearching().type);
	const icon = iconFor(info);
	return {
		name,
		icon: icon ? `url('${icon}')` : null,
		turns: Locale.compose("LOC_HUD_OVERHAUL_TIP_TURNS", system.getTurnsLeft()),
		progress: cost ? node.progress / cost : 0,
	};
}

function read() {
	const playerID = GameContext.localPlayerID;
	const player = Players.get(playerID);
	if (!player) return null;
	const techs = player.Techs;
	const culture = player.Culture;
	return {
		labels: {
			title: Locale.compose("LOC_HUD_OVERHAUL_TRACKER_TITLE"),
			research: Locale.compose("LOC_HUD_OVERHAUL_TRACKER_RESEARCH"),
			civic: Locale.compose("LOC_HUD_OVERHAUL_TRACKER_CIVIC"),
			chooseResearch: Locale.compose("LOC_HUD_OVERHAUL_TRACKER_CHOOSE_RESEARCH"),
			chooseCivic: Locale.compose("LOC_HUD_OVERHAUL_TRACKER_CHOOSE_CIVIC"),
		},
		// The dock's own icons for its research and civic rings with nothing
		// chosen (panel-sub-system-dock.js).
		placeholders: { tech: "url('blp:sub_tech')", civic: "url('blp:sub_civics')" },
		research: techs
			? current(playerID, techs, techs.getTreeType(), (i) => Icon.getTechIconFromProgressionTreeNodeDefinition(i))
			: null,
		civic: culture
			? current(playerID, culture, culture.getActiveTree(), (i) => Icon.getCultureIconFromProgressionTreeNodeDefinition(i))
			: null,
	};
}

// The game's +/- button, as the Journal's, in the heading's right end. The
// choice is saved, so the tracker stays collapsed across games.
function addToggle(panel, collapsed) {
	const holder = panel.querySelector(".hud-overhaul-tracker__toggle");
	if (!holder) return;
	const toggle = document.createElement("fxs-minus-plus");
	toggle.setAttribute("type", collapsed ? "plus" : "minus");
	toggle.setAttribute("data-audio-group-ref", "journal");
	toggle.addEventListener("action-activate", () => {
		try {
			writeSetting("trackerCollapsed", !collapsed);
		} catch (error) {
			console.error(`${TAG} tracker: cannot save setting: ${error}`);
		}
		draw();
	});
	holder.append(toggle);
}

function draw() {
	try {
		const slot = document.querySelector(`.harness .${SLOT}`);
		if (!slot) return;
		const data = read();
		if (!data) return;
		data.collapsed = readSettings().trackerCollapsed === true;
		const panel = render(data);
		addToggle(panel, data.collapsed);
		for (const row of panel.querySelectorAll("[data-hud-overhaul-open]")) {
			const screen = CHOOSERS[row.getAttribute("data-hud-overhaul-open")];
			row.addEventListener("click", () => ContextManager.push(screen, { singleton: true }));
		}
		while (slot.firstChild) slot.firstChild.remove();
		slot.append(panel);
	} catch (error) {
		console.error(`${TAG} tracker: ${error}`);
	}
}

// Puts an empty slot for the tracker in the world template, first in the
// Journal's row. The row is marked as the column, so the styles stack the
// two and draw one plate behind both: a gradient then runs across the pair
// rather than starting again at the Journal. With no Journal, the slot gets a
// row of its own under the dock's.
//
// The dock's row also holds the lens legends (panel-continents and the
// like), drawn over the rows below it. DOCK_ROW puts that row above the
// column, so a legend covers the tracker rather than showing under it.
const COLUMN = "hud-overhaul-column";
const DOCK_ROW = "hud-overhaul-dock-row";
function addSlot(root) {
	if (root.querySelector(`.${SLOT}`)) return true;
	const slot = document.createElement("div");
	slot.className = SLOT;
	const dock = root.querySelector("panel-sub-system-dock");
	const dockRow = dock && dock.parentElement;
	dockRow?.classList.add(DOCK_ROW);
	const quests = root.querySelector("quest-list");
	const questRow = quests && quests.parentElement;
	if (questRow) {
		questRow.classList.add(COLUMN);
		questRow.insertBefore(slot, quests);
		return true;
	}
	if (!dockRow) return false;
	const row = document.createElement("fxs-hslot");
	row.classList.add(COLUMN);
	row.append(slot);
	dockRow.parentElement.insertBefore(row, dockRow.nextSibling);
	return true;
}

// Where research and civic show: "both", the World Tracker and the dock's
// rings as the game has them; "tracker", the World Tracker only, the rings
// hidden; or "rings", the rings only, the tracker hidden. The dock's other
// buttons move up into the rings' place.
const SHOW = [
	{ label: "LOC_HUD_OVERHAUL_OPTION_TRACKER_BOTH", value: "both" },
	{ label: "LOC_HUD_OVERHAUL_OPTION_TRACKER_ONLY", value: "tracker" },
	{ label: "LOC_HUD_OVERHAUL_OPTION_TRACKER_RINGS", value: "rings" },
];

function show() {
	const value = readSettings().trackerShow;
	return SHOW.some((choice) => choice.value === value) ? value : "both";
}

function applyShow() {
	const now = show();
	const css =
		now === "tracker"
			? "panel-sub-system-dock .ssb__element.ring-tech, panel-sub-system-dock .ssb__element.ring-culture { display: none; }"
			: now === "rings"
				? `.${SLOT} { display: none; }`
				: null;
	setStyle("hud-overhaul-tracker-show", css);
}

function addOption() {
	return addOptions(OPTION_GROUPS.GENERAL, (OptionType) => [
		{
			type: OptionType.Dropdown,
			id: "hud-overhaul-option-tracker-show",
			label: "LOC_HUD_OVERHAUL_OPTION_TRACKER",
			description: "LOC_HUD_OVERHAUL_OPTION_TRACKER_DESCRIPTION",
			dropdownItems: SHOW,
			initListener: (info) => {
				info.selectedItemIndex = SHOW.findIndex((choice) => choice.value === show());
			},
			updateListener: (info, index) => {
				try {
					writeSetting("trackerShow", SHOW[index]?.value ?? "both");
				} catch (error) {
					console.error(`${TAG} tracker: cannot save setting: ${error}`);
				}
				applyShow();
			},
		},
	]);
}

function start() {
	const template = document.querySelector("template.world");
	const harness = document.querySelector(".harness");
	if (!template || !harness) return false;
	if (!addSlot(template.content)) console.error(`${TAG} tracker: no dock in the world template`);
	if (harness.querySelector("panel-sub-system-dock")) addSlot(harness);

	const restyle = () => setStyle("hud-overhaul-tracker-styles", styles(textOffset()));
	restyle();
	onTextSize(restyle);
	applyShow();
	addOption().catch((error) => console.error(`${TAG} tracker: option not added: ${error}`));

	// A view change empties the harness and fills it from the template. The
	// game's engine has no :empty selector, so count the slot's children.
	new MutationObserver(() => {
		try {
			const slot = document.querySelector(`.harness .${SLOT}`);
			if (slot && slot.childElementCount === 0) draw();
		} catch (error) {
			console.error(`${TAG} tracker: ${error}`);
		}
	}).observe(harness, { childList: true });

	for (const name of [
		"PlayerTurnActivated",
		"ScienceYieldChanged",
		"TechTreeChanged",
		"TechTargetChanged",
		"TechNodeCompleted",
		"CultureYieldChanged",
		"CultureTreeChanged",
		"CultureTargetChanged",
		"CultureNodeCompleted",
	]) {
		engine.on(name, draw);
	}
	draw();
	return true;
}

try {
	if (!start()) {
		document.addEventListener("DOMContentLoaded", () => {
			try {
				if (!start()) console.error(`${TAG} tracker: no world template or harness`);
			} catch (error) {
				console.error(`${TAG} tracker: ${error}`);
			}
		});
	}
	console.error(`${TAG} tracker loaded, civ7lab:build tracker ${BUILD}`);
} catch (error) {
	console.error(`${TAG} tracker: ${error}`);
}
