// Religion in the top bar: a pill with the game's religion symbol, your
// religion's icon and the share of the world's settlements following it.
// Its tooltip, in hud-overhaul-tooltips.js, lists your beliefs, your
// settlements with the religion of their urban and rural people, and each
// religion's share of the world. The game shows little of this: the belief
// screen gives the share, and each city banner its people's religions.
//
// A settlement follows a religion when its majority does
// (city.Religion.majorityReligion). Its urban and rural people can each
// follow a different one, or none (urbanReligion, ruralReligion). Religions
// are hashes; -1 is none. The share is the belief screen's
// (calculateReligionPercentage in panel-belief-picker.js): settlements
// following, of every settlement in the world, city-states' too.
//
// It shows through the Exploration Age, "-" until you found a religion, and
// in any later age while you have one. Clicked, it opens the religion
// screen, as the dock's button does.
//
// It goes in the slot the top bar keeps for mods, through ModdingRegistry,
// as hud-overhaul-greatworks.js does, and is styled the same way.
//
// An option in Options > Add-ons turns it off.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root. Log and bail, never throw.

import { ModdingRegistry } from "../../core/ui/modding-registry-handler/modding-registry-handler.js";
import { addOptions, onTextSize, OPTION_GROUPS, readSettings, setStyle, textOffset, writeSetting } from "./hud-overhaul-settings.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "11";
const COMPONENT = "hud-overhaul-religion";
const ENTRY = "hud-overhaul-religion-entry";
const TEXT = "hud-overhaul-religion-text";
const DOVE = "hud-overhaul-religion-dove";
// The game's religion symbol, as its text shows it.
export const SYMBOL = "blp:fi_nar_rew_religion_64";
// The pill's data-icon, which hud-overhaul-tooltips.js finds it by.
export const ICON = "HUD_OVERHAUL_RELIGION";

const NONE = -1;

// { type, name, icon, owner, ownerName } for a religion's hash, or null for none.
// Custom religions carry the name their founder gave them.
function religionOf(hash, cache) {
	if (hash == null || hash == NONE) return null;
	if (cache.has(hash)) return cache.get(hash);
	const info = GameInfo.Religions.find((row) => row.$hash == hash);
	let found = null;
	if (info) {
		const founder = Players.get(Game.Religion.getPlayerFromReligion(info.ReligionType));
		found = {
			type: info.ReligionType,
			name: founder?.Religion ? Locale.compose(founder.Religion.getReligionName()) : Locale.compose(info.Name),
			icon: UI.getIconURL(info.ReligionType, "RELIGION"),
			owner: founder ? founder.id : -1,
			ownerName: founder ? Locale.compose(founder.name) : "",
		};
	}
	cache.set(hash, found);
	return found;
}

// Everything the pill and tooltip show, for `player`:
//   mine: the player's religion, or null.
//   beliefs: [{ name, kind, type, text }], type the belief's class, in the
//     order the game adopts them.
//   world: { total, none, religions: [{ ...religion, settlements, percent }] },
//     most followed first.
//   settlements: the player's own, [{ name, location, holy, urban, rural,
//     majority, urbanPop, ruralPop }], each religion as religionOf.
//   following: how many of the player's settlements follow their religion.
//   percent: the share of the world's settlements that do, as the game
//     rounds it.
//   canFound: whether the player may still found one.
export function religion(player) {
	const cache = new Map();
	const own = player.Religion;
	const mineHash = own?.hasCreatedReligion() ? own.getReligionType() : NONE;
	const mine = religionOf(mineHash, cache);

	const counts = new Map();
	let total = 0;
	let none = 0;
	const settlements = [];
	for (const other of Players.getAlive()) {
		for (const city of other.Cities?.getCities() ?? []) {
			total++;
			const hash = city.Religion?.majorityReligion ?? NONE;
			if (hash == NONE) none++;
			else counts.set(hash, (counts.get(hash) ?? 0) + 1);
			if (other.id != player.id) continue;
			settlements.push({
				name: Locale.compose(city.name),
				location: city.location,
				isCapital: city.isCapital,
				isTown: city.isTown,
				holy: !!city.Religion?.isHolyCity,
				urban: religionOf(city.Religion?.urbanReligion, cache),
				rural: religionOf(city.Religion?.ruralReligion, cache),
				majority: religionOf(hash, cache),
				urbanPop: city.urbanPopulation ?? 0,
				ruralPop: city.ruralPopulation ?? 0,
			});
		}
	}
	const share = (n) => (total ? Math.round((n / total) * 100) : 0);
	const religions = [...counts]
		.map(([hash, n]) => ({ ...religionOf(hash, cache), hash, settlements: n, percent: share(n) }))
		.filter((entry) => entry.type)
		.sort((a, b) => b.settlements - a.settlements);

	const beliefs = (own?.getBeliefs() ?? [])
		.map((hash) => GameInfo.Beliefs.lookup(hash))
		.filter((info) => info)
		.map((info) => {
			const kind = GameInfo.BeliefClasses.lookup(info.BeliefClassType);
			// Some classes' names have no text in the game, so are left out.
			const kindName = kind ? Locale.compose(kind.Name) : "";
			return {
				name: Locale.compose(info.Name),
				kind: kindName.startsWith("LOC_") ? "" : kindName,
				type: info.BeliefClassType,
				order: kind?.AdoptionOrder ?? 0,
				text: Locale.stylize(info.Description),
			};
		})
		.sort((a, b) => a.order - b.order);

	const following = mine ? settlements.filter((s) => s.majority?.type == mine.type).length : 0;
	return {
		mine,
		beliefs,
		world: { total, none, religions },
		settlements,
		following,
		percent: mine ? share(counts.get(mineHash) ?? 0) : 0,
		canFound: !!own?.canCreateReligion(),
	};
}

// Opens the religion screen, as the dock's button and hotkey do: the dock
// picks the screen for the age and the player's state.
export function openReligion() {
	window.dispatchEvent(new CustomEvent("hotkey-open-religion"));
}

// Whether the pill shows for `player`, and the leader ribbon's religion row
// (hud-overhaul-religion-row.js) with it.
export function shown(player) {
	if (!player?.Religion || !Game.hasCapability("CAPABILITY_RELIGION_UI")) return false;
	return Game.age == Game.getHash("AGE_EXPLORATION") || player.Religion.hasCreatedReligion();
}

const rem = (px) => `${(px / 18).toFixed(4)}rem`;

// The icons grow with the player's text size.
const styles = () => `
${COMPONENT} { display: flex; }
${COMPONENT}.hud-overhaul-off { display: none; }
.${ENTRY} { color: rgb(232, 222, 190); }
.${ENTRY} > img { display: none; }
.${TEXT} { display: flex; flex-direction: row; align-items: center; white-space: nowrap; }
panel-yield-banner .panel-yield__top-bar-content .${TEXT} img {
	width: ${rem(22 + textOffset())};
	height: ${rem(22 + textOffset())};
	margin-right: ${rem(4)};
}
/* The dove fills its whole square, where the yields' icons leave a margin:
   smaller, and further from the pill's edge, it reads as their size. */
panel-yield-banner .panel-yield__top-bar-content .${TEXT} img.${DOVE} {
	width: ${rem(16 + textOffset())};
	height: ${rem(16 + textOffset())};
	margin-left: ${rem(3)};
}
`;

// Each one on screen, for the option to update at once.
const attached = new Set();

const EVENTS = ["PlayerTurnActivated", "CityReligionChanged", "ReligionFounded", "BeliefAdded", "CityAddedToMap", "CityRemovedFromMap"];

class Religion extends Component {
	entry = null;
	text = null;
	lead = null;
	count = null;
	onUpdate = () => {
		try {
			this.update();
		} catch (error) {
			console.error(`${TAG} religion: ${error}`);
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
			this.entry.addEventListener("action-activate", openReligion);
			this.text = document.createElement("div");
			this.text.classList.add(TEXT);
			const symbol = document.createElement("img");
			symbol.src = SYMBOL;
			symbol.classList.add(DOVE);
			this.lead = document.createElement("img");
			this.count = document.createElement("span");
			this.text.append(symbol, this.lead, this.count);
			this.entry.appendChild(this.text);
			this.Root.appendChild(this.entry);
		}
		attached.add(this);
		this.onUpdate();
		// In case the game draws the entry after this frame.
		requestAnimationFrame(this.onUpdate);
		for (const name of EVENTS) engine.on(name, this.onUpdate);
	}

	onDetach() {
		for (const name of EVENTS) engine.off(name, this.onUpdate);
		attached.delete(this);
		super.onDetach();
	}

	update() {
		// The game's entry adds its icon's colour class from a list that
		// lacks this one, so it adds the class "undefined".
		this.entry.classList.remove("undefined");
		// The game draws the entry's icon and its own empty text after this
		// adds its text, so the text is moved back to the end.
		if (this.entry.lastChild !== this.text) this.entry.appendChild(this.text);
		const player = Players.get(GameContext.localObserverID);
		const on = enabled() && shown(player);
		this.Root.classList.toggle("hud-overhaul-off", !on);
		if (!on) return;
		const { mine, percent } = religion(player);
		this.lead.style.display = mine ? "" : "none";
		if (mine) this.lead.src = mine.icon;
		this.count.textContent = mine ? Locale.compose("LOC_HUD_OVERHAUL_RELIGION_PERCENT", percent) : "-";
		// Text the game's tooltip needs before it shows;
		// hud-overhaul-tooltips.js draws the detailed one.
		this.entry.dataset.tooltipContent = Locale.compose("LOC_DIPLOMACY_ACTIONS_SUBHEADER_RELIGION");
	}
}

function enabled() {
	return readSettings().religion !== false;
}

function addOption() {
	return addOptions(OPTION_GROUPS.TOP_BAR, (OptionType) => [
		{
			type: OptionType.Checkbox,
			id: "hud-overhaul-option-religion",
			label: "LOC_DIPLOMACY_ACTIONS_SUBHEADER_RELIGION",
			description: "LOC_HUD_OVERHAUL_OPTION_RELIGION_DESCRIPTION",
			initListener: (info) => {
				info.currentValue = enabled();
			},
			updateListener: (info, value) => {
				info.currentValue = !!value;
				try {
					writeSetting("religion", !!value);
				} catch (error) {
					console.error(`${TAG} religion: cannot save setting: ${error}`);
				}
				for (const pill of attached) pill.onUpdate();
			},
		},
	], "religion");
}

try {
	const restyle = () => setStyle("hud-overhaul-religion", styles());
	restyle();
	onTextSize(restyle);
	Controls.define(COMPONENT, { createInstance: Religion });
	ModdingRegistry.add({ parentID: "panel-yield-banner", componentTag: COMPONENT, modSlot: "yield-banner-mod-slot" });
	// A top bar already on screen has asked for its mod elements before this
	// loaded, so it gets one now. Later ones ask for themselves.
	const slot = document.getElementById("yield-banner-mod-slot");
	if (slot && !slot.querySelector(COMPONENT)) slot.appendChild(document.createElement(COMPONENT));
	addOption().catch((error) => console.error(`${TAG} religion: option not added: ${error}`));
	console.error(`${TAG} religion loaded, civ7lab:build religion ${BUILD}`);
} catch (error) {
	console.error(`${TAG} religion: ${error}`);
}
