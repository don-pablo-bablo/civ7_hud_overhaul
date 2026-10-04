// Food and production for the whole empire, as two more pills in the top
// bar. Each is the player's net yield summed over every settlement, from
// player.Stats.getNetYield, the call the top bar makes for its own yields.
//
// They go in the slot the top bar keeps for mods (#yield-banner-mod-slot),
// through ModdingRegistry, so the top bar adds them again each time it is
// rebuilt. Each is the game's own yield-bar-entry, so it looks and behaves
// as the stock pills do: its tooltip names the yield and clicking it opens
// the yields report.
//
// The game has no text colour for food or production in the top bar, so
// this adds pale tints in the manner of the others. hud-overhaul-pills.js
// colours their pills.
//
// An option in Options > Add-ons turns them off. The element stays in the
// mod slot, since the registry cannot take it back, but draws nothing.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ContextManager } from "../../core/ui/context-manager/context-manager.js";
import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { addOptions, OPTION_GROUPS, readSettings, setStyle, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "4";
const COMPONENT = "hud-overhaul-yield-totals";

// [yield type, icon, tooltip, class, text colour]
const TOTALS = [
	["YIELD_FOOD", "YIELD_FOOD", "LOC_YIELD_FOOD", "hud-overhaul-yield-food", "rgb(186, 217, 152)"],
	["YIELD_PRODUCTION", "YIELD_PRODUCTION", "LOC_YIELD_PRODUCTION", "hud-overhaul-yield-production", "rgb(217, 182, 152)"],
];

const STYLES = `
${COMPONENT} { display: flex; }
${COMPONENT}.hud-overhaul-off { display: none; }
${TOTALS.map(([, , , cls, colour]) => `.${cls} { color: ${colour}; }`).join("\n")}
`;

class YieldTotals extends Component {
	entries = [];
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} yields: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		// hud-overhaul-rows.js moves the pills into its place, which attaches it
		// again; it keeps the entries it has.
		if (!this.entries.length) {
			const open = () => ContextManager.push("player-yields-report-screen", { singleton: true, createMouseGuard: true });
			for (const [type, icon, tooltip, cls] of TOTALS) {
				const entry = document.createElement("yield-bar-entry");
				entry.dataset.icon = icon;
				entry.dataset.tooltipContent = tooltip;
				entry.classList.add(cls);
				entry.addEventListener("action-activate", open);
				this.Root.appendChild(entry);
				this.entries.push([type, entry]);
			}
		}
		this.onUpdate();
		engine.on("CityYieldChanged", this.onUpdate);
		engine.on("PlayerTurnActivated", this.onUpdate);
		engine.on("CityAddedToMap", this.onUpdate);
		engine.on("CityRemovedFromMap", this.onUpdate);
	}

	onDetach() {
		engine.off("CityYieldChanged", this.onUpdate);
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("CityAddedToMap", this.onUpdate);
		engine.off("CityRemovedFromMap", this.onUpdate);
		super.onDetach();
	}

	update() {
		this.Root.classList.toggle("hud-overhaul-off", !enabled());
		const stats = Players.get(GameContext.localObserverID)?.Stats;
		if (!stats) return;
		for (const [type, entry] of this.entries) {
			// The game's entry adds its yield's colour class from a list that
			// lacks these two, so it adds the class "undefined".
			entry.classList.remove("undefined");
			const value = stats.getNetYield(YieldTypes[type]);
			// One decimal, as the leader ribbon shows yields.
			entry.dataset.value = (Math.round(value * 10) / 10).toString();
		}
	}
}

function enabled() {
	return readSettings().yieldTotals !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-yield-totals",
			label: "LOC_HUD_OVERHAUL_OPTION_YIELD_TOTALS",
			description: "LOC_HUD_OVERHAUL_OPTION_YIELD_TOTALS_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("yieldTotals", !!value);
				} catch (error) {
					console.error(`${TAG} yields: cannot save setting: ${error}`);
				}
				for (const totals of document.querySelectorAll(COMPONENT)) {
					totals.classList.toggle("hud-overhaul-off", !value);
				}
			},
		},
	], "yields");
}

try {
	setStyle("hud-overhaul-yields", STYLES);
	Controls.define(COMPONENT, { createInstance: YieldTotals });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets them now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} yields: option not added: ${error}`));
	console.error(`${TAG} yields loaded, civ7lab:build yields ${BUILD}`);
} catch (error) {
	console.error(`${TAG} yields: ${error}`);
}
