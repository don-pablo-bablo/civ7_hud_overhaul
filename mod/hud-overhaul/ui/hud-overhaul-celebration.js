// Celebrations in the top bar's happiness pill: "+212 ([C] in 3)" for the
// turns to the next one, "+212 ([C] 1 left)" while one runs, and
// "+212 ([C] -)" when happiness is not rising. [C] is the game's celebration
// icon. The pill's tooltip says the same in words.
//
// The sums are the dock's own (panel-sub-system-dock.js,
// updatePoliciesStructure): happiness gathered over the game against the
// next threshold, at this turn's net happiness.
//
// The pill is the game's yield-bar-entry. This adds a span after its text,
// which the game leaves alone when it rewrites the "+212". A hidden element
// in the top bar's mod slot, put there through ModdingRegistry, finds the
// pill each time the top bar is rebuilt.
//
// An option in Options > Add-ons turns it off.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { addOptions, enabled as modEnabled, OPTION_GROUPS, readSettings, setStyle, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "4";
const COMPONENT = "hud-overhaul-celebration";
const SPAN = "hud-overhaul-celebration-text";
const TOOLTIP = "LOC_YIELD_HAPPINESS";

const STYLES = `
${COMPONENT} { display: none; }
.${SPAN} { white-space: nowrap; margin-left: 0.2222rem; }
`;

// [pill text, tooltip line, turns]: the two LOC keys and the turns for both.
// Null without the game's happiness. hud-overhaul-tooltips.js shows the line.
export function celebration(player) {
	const happiness = player?.Happiness;
	const stats = player?.Stats;
	if (!happiness || !stats) return null;
	if (happiness.isInGoldenAge()) {
		return ["LOC_HUD_OVERHAUL_CELEBRATING", "LOC_HUD_OVERHAUL_CELEBRATING_TOOLTIP", happiness.getGoldenAgeTurnsLeft()];
	}
	const perTurn = stats.getNetYield(YieldTypes.YIELD_HAPPINESS) ?? 0;
	const have = Math.ceil(stats.getLifetimeYield(YieldTypes.YIELD_HAPPINESS));
	const need = happiness.nextGoldenAgeThreshold;
	if (perTurn > 0) {
		return ["LOC_HUD_OVERHAUL_CELEBRATION_TURNS", "LOC_HUD_OVERHAUL_CELEBRATION_TURNS_TOOLTIP", Math.max(1, Math.ceil((need - have) / perTurn))];
	}
	return ["LOC_HUD_OVERHAUL_CELEBRATION_STALLED", "LOC_HUD_OVERHAUL_CELEBRATION_STALLED_TOOLTIP", 0];
}

// Each one on screen, for the option to update at once.
const attached = new Set();

class Celebration extends Component {
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} celebration: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		attached.add(this);
		this.onUpdate();
		engine.on("PlayerTurnActivated", this.onUpdate);
		engine.on("PlayerYieldChanged", this.onUpdate);
		engine.on("CityYieldChanged", this.onUpdate);
	}

	onDetach() {
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("PlayerYieldChanged", this.onUpdate);
		engine.off("CityYieldChanged", this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}

	update() {
		const pill = this.Root.closest("panel-yield-banner")?.querySelector('yield-bar-entry[data-icon="YIELD_HAPPINESS"]');
		if (!pill) return;
		const player = Players.get(GameContext.localObserverID);
		const happiness = player?.Happiness;
		const stats = player?.Stats;
		if (!enabled() || !happiness || !stats) {
			pill.querySelector(`.${SPAN}`)?.remove();
			pill.dataset.tooltipContent = TOOLTIP;
			return;
		}
		let span = pill.querySelector(`.${SPAN}`);
		if (!span) {
			span = document.createElement("span");
			span.classList.add(SPAN);
			pill.appendChild(span);
		}
		const [pillKey, tooltipKey, turns] = celebration(player);
		const text = Locale.stylize(pillKey, turns);
		if (span.innerHTML !== text) span.innerHTML = text;
		pill.dataset.tooltipContent = `${Locale.compose(TOOLTIP)}[N]${Locale.compose(tooltipKey, turns)}`;
	}
}

// Off with the whole mod, or with its own option.
function enabled() {
	return modEnabled() && readSettings().celebration !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-celebration",
			label: "LOC_HUD_OVERHAUL_OPTION_CELEBRATION",
			description: "LOC_HUD_OVERHAUL_OPTION_CELEBRATION_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = readSettings().celebration !== false;
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("celebration", !!value);
				} catch (error) {
					console.error(`${TAG} celebration: cannot save setting: ${error}`);
				}
				for (const pill of attached) pill.onUpdate();
			},
		},
	], "celebration");
}

try {
	setStyle("hud-overhaul-celebration", STYLES);
	Controls.define(COMPONENT, { createInstance: Celebration });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} celebration: option not added: ${error}`));
	console.error(`${TAG} celebration loaded, civ7lab:build celebration ${BUILD}`);
} catch (error) {
	console.error(`${TAG} celebration: ${error}`);
}
