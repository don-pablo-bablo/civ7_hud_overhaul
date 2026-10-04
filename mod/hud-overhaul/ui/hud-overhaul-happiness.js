// Settlements by happiness in the top bar: a pill with the number of
// settlements at each of the game's happiness levels, best first, each after
// that level's icon. Its tooltip names the settlements at each level.
//
// The levels are the game's HappinessStages for the age, with the icons and
// names the city banners use (city-banners.js): a settlement is at a level
// when its happiness yield is from the level's minimum to its maximum.
//
// It goes in the slot the top bar keeps for mods, through ModdingRegistry,
// as hud-overhaul-treasure.js does. It is the game's yield-bar-entry, so it is
// styled as the other pills, but the entry's own icon is hidden, since each
// level has one. Its icon is not the happiness yield's:
// hud-overhaul-celebration.js finds the happiness pill by that.
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
const BUILD = "9";
const COMPONENT = "hud-overhaul-happiness";
const ENTRY = "hud-overhaul-happiness-entry";
const LEVELS = "hud-overhaul-happiness-levels";
const LEVEL = "hud-overhaul-happiness-level";

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// The level icons grow with the player's text size.
const styles = () => `
${COMPONENT} { display: flex; }
${COMPONENT}.hud-overhaul-off { display: none; }
.${ENTRY} { color: rgb(255, 214, 160); }
.${ENTRY} > img { display: none; }
.${LEVELS} { display: flex; flex-direction: row; align-items: center; white-space: nowrap; }
.${LEVEL} { display: flex; flex-direction: row; align-items: center; margin-right: ${rem(5)}; }
.${LEVEL}:last-child { margin-right: 0; }
panel-yield-banner .panel-yield__top-bar-content .${LEVEL} img { width: ${rem(20 + textOffset())}; height: ${rem(20 + textOffset())}; margin-right: ${rem(2)}; }
`;

// [stage type, name, icon, min, max], best first.
let stages = null;
function readStages() {
	if (!stages) {
		stages = [...GameInfo.HappinessStages]
			.map((row) => [
				row.HappinessStageType,
				row.HappinessStageType.replace("HAPPINESS_STAGE_", "LOC_UI_CITY_DETAILS_"),
				UI.getIconURL(row.HappinessStageType.replace("HAPPINESS_STAGE_", "YIELD_"), "YIELD"),
				row.StageMinThreshold ?? -Infinity,
				row.StageMaxThreshold ?? Infinity,
			])
			.sort((a, b) => b[3] - a[3]);
	}
	return stages;
}

// For each level, best first, the names of the settlements at it.
function byLevel(player) {
	const levels = readStages().map(() => []);
	for (const city of player.Cities?.getCities() ?? []) {
		const happiness = city.Yields?.getYield(YieldTypes.YIELD_HAPPINESS);
		if (happiness == null) continue;
		const index = readStages().findIndex(([, , , min, max]) => happiness >= min && happiness <= max);
		if (index >= 0) levels[index].push(Locale.compose(city.name));
	}
	return levels;
}

// Each one on screen, for the option to update at once.
const attached = new Set();

class Happiness extends Component {
	entry = null;
	levels = null;
	counts = [];
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} happiness: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		// hud-overhaul-rows.js moves the pill into its place, which attaches it
		// again; it keeps the entry it has.
		if (!this.entry) {
			this.entry = document.createElement("yield-bar-entry");
			this.entry.dataset.icon = "YIELD_HAPPY";
			this.entry.classList.add(ENTRY);
			this.levels = document.createElement("div");
			this.levels.classList.add(LEVELS);
			for (const [, , icon] of readStages()) {
				const level = document.createElement("div");
				level.classList.add(LEVEL);
				const img = document.createElement("img");
				img.src = icon;
				const count = document.createElement("span");
				level.append(img, count);
				this.levels.appendChild(level);
				this.counts.push(count);
			}
			this.entry.appendChild(this.levels);
			// Clicked, it opens the yields report, as the game's pills do.
			this.entry.addEventListener("action-activate", () =>
				ContextManager.push("player-yields-report-screen", { singleton: true, createMouseGuard: true }),
			);
			this.Root.appendChild(this.entry);
		}
		attached.add(this);
		this.onUpdate();
		// In case the game draws the entry after this frame.
		requestAnimationFrame(this.onUpdate);
		engine.on("PlayerTurnActivated", this.onUpdate);
		engine.on("CityYieldChanged", this.onUpdate);
		engine.on("CityAddedToMap", this.onUpdate);
		engine.on("CityRemovedFromMap", this.onUpdate);
	}

	onDetach() {
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("CityYieldChanged", this.onUpdate);
		engine.off("CityAddedToMap", this.onUpdate);
		engine.off("CityRemovedFromMap", this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}

	update() {
		// The game's entry adds its icon's colour class from a list that
		// lacks this one, so it adds the class "undefined".
		this.entry.classList.remove("undefined");
		// The game draws the entry's icon and its own empty text after this
		// adds the levels, so the levels are moved back to the end.
		if (this.entry.lastChild !== this.levels) this.entry.appendChild(this.levels);
		const player = Players.get(GameContext.localObserverID);
		const on = enabled() && !!player;
		this.Root.classList.toggle("hud-overhaul-off", !on);
		if (!on) return;
		const levels = byLevel(player);
		levels.forEach((names, i) => (this.counts[i].textContent = names.length));
		const lines = readStages().map(([, name], i) =>
			Locale.compose("LOC_HUD_OVERHAUL_HAPPINESS_LINE", Locale.compose(name), levels[i].length ? levels[i].join(", ") : Locale.compose("LOC_HUD_OVERHAUL_HAPPINESS_NONE")),
		);
		this.entry.dataset.tooltipContent = [Locale.compose("LOC_HUD_OVERHAUL_HAPPINESS_TITLE"), ...lines].join("[N]");
	}
}

function enabled() {
	return readSettings().happinessLevels !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-happiness",
			label: "LOC_HUD_OVERHAUL_OPTION_HAPPINESS",
			description: "LOC_HUD_OVERHAUL_OPTION_HAPPINESS_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("happinessLevels", !!value);
				} catch (error) {
					console.error(`${TAG} happiness: cannot save setting: ${error}`);
				}
				for (const pill of attached) pill.onUpdate();
			},
		},
	], "happiness");
}

try {
	const restyle = () => setStyle("hud-overhaul-happiness", styles());
	restyle();
	onTextSize(restyle);
	Controls.define(COMPONENT, { createInstance: Happiness });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} happiness: option not added: ${error}`));
	console.error(`${TAG} happiness loaded, civ7lab:build happiness ${BUILD}`);
} catch (error) {
	console.error(`${TAG} happiness: ${error}`);
}
