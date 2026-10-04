// Opens the commerce screen on one of its tabs, for the resources, trade
// and treasure pills and their tooltips. The screen takes no tab to open on,
// so its tab button is sent the left click the game's own input sends.
//
// It is its own file so that no pill script imports another: a pill
// registers when its script first runs, and the top bar shows the mod pills
// in that order, which is the modinfo's.
//
// Its imports are relative (../../core/...), so it must stay one folder
// below the mod root.

import { ContextManager } from "../../core/ui/context-manager/context-manager.js";

const TAG = "[hud-overhaul]";
// Bump on every edit to this file. UI.log then shows which build ran.
const BUILD = "1";
const SCREEN = "screen-resource-allocation";

// The commerce screen's tabs, by their title.
export const COMMERCE_TABS = {
	resources: "LOC_UI_RESOURCE_ALLOCATION_TITLE",
	trade: "LOC_COMMERCE_TRADE_ROUTE_TAB",
	treasure: "LOC_RESOURCECLASS_TREASURE_NAME",
};

// Opens the commerce screen on a tab from COMMERCE_TABS. The screen draws
// its tabs a few frames after it opens, so this looks for them each frame
// for up to half a second.
export function openCommerce(tab) {
	ContextManager.push(SCREEN, { singleton: true, createMouseGuard: true });
	if (!tab || tab == COMMERCE_TABS.resources) return;
	const title = Locale.compose(tab);
	let frames = 30;
	const find = () => {
		try {
			const screen = document.querySelector(SCREEN);
			const button = [...(screen?.querySelectorAll('[data-activatable][name="TabListItem"]') ?? [])].find(
				(el) => el.textContent.includes(tab) || el.textContent.includes(title),
			);
			if (button) {
				const detail = { name: "mousebutton-left", status: InputActionStatuses.FINISH, x: 0, y: 0 };
				button.dispatchEvent(new CustomEvent("engine-input", { bubbles: true, cancelable: true, detail }));
				return;
			}
			if (--frames > 0) requestAnimationFrame(find);
		} catch (error) {
			console.error(`${TAG} commerce: cannot open the ${tab} tab: ${error}`);
		}
	};
	requestAnimationFrame(find);
}

console.error(`${TAG} commerce loaded, civ7lab:build commerce ${BUILD}`);
