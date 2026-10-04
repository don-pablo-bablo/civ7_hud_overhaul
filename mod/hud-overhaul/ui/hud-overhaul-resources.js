// Resources in the top bar: a pill with the green resources icon, then how
// many resources of each class the empire has, each after the class's own
// icon: empire, city and bonus, and treasure and factory when it has any.
// Treasure is split: those in the homeland, then those in the Distant
// Lands, which make convoys, under the badge the map gives them.
// Its tooltip, in hud-overhaul-tooltips.js, lists them.
//
// The resources are the commerce screen's (commerce-screen-model.js):
// player.Resources.getResources(), each with its class from the game's
// Resources table. A settlement's assigned ones are its
// Resources.getAssignedResources().
//
// Clicked, it opens the commerce screen, through hud-overhaul-commerce.js.
//
// It goes in the slot the top bar keeps for mods, through ModdingRegistry,
// as hud-overhaul-treasure.js does. It is the game's yield-bar-entry, so it is
// styled as the other pills, but the entry's own icon is hidden and the pill
// draws its own.
//
// An option in Options > Add-ons turns it off.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { COMMERCE_TABS, openCommerce } from "./hud-overhaul-commerce.js";
import { addOptions, onTextSize, OPTION_GROUPS, readSettings, setStyle, textOffset, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "10";
const COMPONENT = "hud-overhaul-resources";
const ENTRY = "hud-overhaul-resources-entry";
const COUNTS = "hud-overhaul-resources-counts";
const COUNT = "hud-overhaul-resources-count";
const LEAD = "blp:radial_resources"; // the green resources icon, as policy cards show it
// The pill's data-icon, which hud-overhaul-tooltips.js finds it by.
export const ICON = "HUD_OVERHAUL_RESOURCES";

// [class, its name, always shown] in the order shown. Treasure and factory
// resources belong to one age each, so they show only when the empire has
// some. RESOURCECLASS_TREASURE_FLEET is not a class of the game's Resources
// table but its icon for treasure in the Distant Lands; here it holds those,
// and RESOURCECLASS_TREASURE the rest.
export const CLASSES = [
	["RESOURCECLASS_EMPIRE", "LOC_RESOURCECLASS_EMPIRE_NAME", true],
	["RESOURCECLASS_CITY", "LOC_RESOURCECLASS_CITY_NAME", true],
	["RESOURCECLASS_BONUS", "LOC_RESOURCECLASS_BONUS_NAME", true],
	["RESOURCECLASS_TREASURE", "LOC_HUD_OVERHAUL_TREASURE_HOMELAND", false],
	["RESOURCECLASS_TREASURE_FLEET", "LOC_HUD_OVERHAUL_TREASURE_DISTANT", false],
	["RESOURCECLASS_FACTORY", "LOC_RESOURCECLASS_FACTORY_NAME", false],
];

// The empire's resources by class: { [class]: [{ definition, settlement }] },
// settlement being the name of the one it is assigned to, or null.
export function holdings(player) {
	const assigned = new Map();
	for (const city of player.Cities?.getCities() ?? []) {
		for (const resource of city.Resources?.getAssignedResources() ?? []) assigned.set(resource.value, Locale.compose(city.name));
	}
	const byClass = {};
	for (const resource of player.Resources?.getResources() ?? []) {
		const definition = GameInfo.Resources.lookup(resource.uniqueResource.resource);
		if (!definition) continue;
		let type = definition.ResourceClassType;
		// A resource on the map has its plot's index for its value.
		if (type == "RESOURCECLASS_TREASURE" && !resource.isOffMap && player.isDistantLands(GameplayMap.getLocationFromIndex(resource.value))) type = "RESOURCECLASS_TREASURE_FLEET";
		(byClass[type] ??= []).push({ definition, settlement: assigned.get(resource.value) ?? null });
	}
	return byClass;
}

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// The icons grow with the player's text size.
const styles = () => `
${COMPONENT} { display: flex; }
${COMPONENT}.hud-overhaul-off { display: none; }
.${ENTRY} { color: rgb(220, 205, 175); }
.${ENTRY} > img { display: none; }
.${COUNTS} { display: flex; flex-direction: row; align-items: center; white-space: nowrap; }
.${COUNT} { display: flex; flex-direction: row; align-items: center; margin-right: ${rem(6)}; }
.${COUNT}:last-child { margin-right: 0; }
panel-yield-banner .panel-yield__top-bar-content .${COUNTS} img {
	width: ${rem(19 + textOffset())};
	height: ${rem(19 + textOffset())};
	margin-right: ${rem(2)};
}
panel-yield-banner .panel-yield__top-bar-content .${COUNTS} img.hud-overhaul-resources-lead {
	width: ${rem(18 + textOffset())};
	height: ${rem(18 + textOffset())};
	margin-right: ${rem(4)};
}
`;

// Each one on screen, for the option to update at once.
const attached = new Set();

class Resources extends Component {
	entry = null;
	counts = null;
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} resources: ${error}`);
		}
	};

	onAttach() {
		super.onAttach();
		// hud-overhaul-rows.js moves the pill into its place, which attaches it
		// again; it keeps the entry it has.
		if (!this.entry) {
			this.entry = document.createElement("yield-bar-entry");
			this.entry.dataset.icon = ICON;
			this.entry.classList.add(ENTRY);
			this.entry.addEventListener("action-activate", () => openCommerce(COMMERCE_TABS.resources));
			this.counts = document.createElement("div");
			this.counts.classList.add(COUNTS);
			this.entry.appendChild(this.counts);
			this.Root.appendChild(this.entry);
		}
		attached.add(this);
		this.onUpdate();
		// In case the game draws the entry after this frame.
		requestAnimationFrame(this.onUpdate);
		engine.on("PlayerTurnActivated", this.onUpdate);
		engine.on("ResourceAssigned", this.onUpdate);
		engine.on("ResourceUnassigned", this.onUpdate);
		engine.on("ResourceCapChanged", this.onUpdate);
		engine.on("ConstructibleAddedToMap", this.onUpdate);
		engine.on("CityAddedToMap", this.onUpdate);
	}

	onDetach() {
		engine.off("PlayerTurnActivated", this.onUpdate);
		engine.off("ResourceAssigned", this.onUpdate);
		engine.off("ResourceUnassigned", this.onUpdate);
		engine.off("ResourceCapChanged", this.onUpdate);
		engine.off("ConstructibleAddedToMap", this.onUpdate);
		engine.off("CityAddedToMap", this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}

	update() {
		// The game's entry adds its icon's colour class from a list that
		// lacks this one, so it adds the class "undefined".
		this.entry.classList.remove("undefined");
		// The game draws the entry's icon and its own empty text after this
		// adds the counts, so the counts are moved back to the end.
		if (this.entry.lastChild !== this.counts) this.entry.appendChild(this.counts);
		const player = Players.get(GameContext.localObserverID);
		const on = enabled() && !!player?.Resources;
		this.Root.classList.toggle("hud-overhaul-off", !on);
		if (!on) return;
		const byClass = holdings(player);
		this.counts.innerHTML = "";
		const lead = document.createElement("img");
		lead.src = LEAD;
		lead.classList.add("hud-overhaul-resources-lead");
		this.counts.appendChild(lead);
		for (const [type, , always] of CLASSES) {
			const list = byClass[type] ?? [];
			if (!always && !list.length) continue;
			const count = document.createElement("div");
			count.classList.add(COUNT);
			const img = document.createElement("img");
			img.src = UI.getIconURL(type);
			const text = document.createElement("span");
			text.textContent = String(list.length);
			count.append(img, text);
			this.counts.appendChild(count);
		}
		// Text the game's tooltip can fall back on; hud-overhaul-tooltips.js
		// draws the detailed one.
		this.entry.dataset.tooltipContent = Locale.compose("LOC_HUD_OVERHAUL_TIP_RESOURCES");
	}
}

function enabled() {
	return readSettings().resources !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-resources",
			label: "LOC_HUD_OVERHAUL_OPTION_RESOURCES",
			description: "LOC_HUD_OVERHAUL_OPTION_RESOURCES_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("resources", !!value);
				} catch (error) {
					console.error(`${TAG} resources: cannot save setting: ${error}`);
				}
				for (const pill of attached) pill.onUpdate();
			},
		},
	], "resources");
}

try {
	const restyle = () => setStyle("hud-overhaul-resources", styles());
	restyle();
	onTextSize(restyle);
	Controls.define(COMPONENT, { createInstance: Resources });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} resources: option not added: ${error}`));
	console.error(`${TAG} resources loaded, civ7lab:build resources ${BUILD}`);
} catch (error) {
	console.error(`${TAG} resources: ${error}`);
}
