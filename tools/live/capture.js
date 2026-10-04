// Captures the browser mocks' cases from a running game, as the game draws
// them: this mod's stylesheets, the top bar with every pill, the local
// player's ribbon entry, and each pill's tooltip hovered and locked.
//
//   civ7lab live eval --file tools/live/capture.js > capture.json
//   node tools/mock/write-fixtures.mjs capture.json
//
// Hovered, a tooltip is the pill's own component drawn off screen. Locked,
// it is opened as a click on its pill opens it, then closed again. The
// units tooltip is also captured with its first army open.

(async () => {
	const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	// Each of this mod's stylesheets by its id, as setStyle names them.
	const styles = Object.fromEntries([...document.querySelectorAll('style[id^="hud-overhaul"]')].map((el) => [el.id, el.textContent]));
	const banner = document.querySelector("panel-yield-banner");
	const topBar = banner?.querySelector(".panel-yield__top-bar-content")?.outerHTML ?? "";
	const ribbon = document.querySelector("panel-diplo-ribbon .diplo-ribbon-outer.local-player")?.outerHTML ?? document.querySelector("panel-diplo-ribbon .diplo-ribbon-outer")?.outerHTML ?? "";

	const activate = (pill) => pill.dispatchEvent(new CustomEvent("action-activate", { bubbles: true }));
	const pinned = () => document.querySelector(".hud-overhaul-tip-pinned");
	const tooltips = [];
	const holder = document.createElement("div");
	holder.style.cssText = "position: absolute; left: -4000px; top: 0;";
	document.body.append(holder);
	for (const pill of banner?.querySelectorAll("yield-bar-entry[data-tooltip-component]") ?? []) {
		const tag = pill.getAttribute("data-tooltip-component");
		const label = pill.textContent.trim();
		const component = document.createElement(tag);
		holder.append(component);
		await frame();
		const hovered = component.innerHTML;
		component.remove();
		activate(pill);
		await frame();
		await frame();
		const locked = pinned()?.outerHTML ?? "";
		const cases = [{ tag, label, hovered, locked }];
		// An army open, for the units tooltip.
		// A group's heading has an arrow too, which closes the group.
		const armyToggle = () => [...(pinned()?.querySelectorAll(".hud-overhaul-tip-toggle") ?? [])].find((el) => !el.closest(".hud-overhaul-tip-group"));
		const toggle = armyToggle();
		if (toggle) {
			toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			await frame();
			cases.push({ tag, label, armyOpen: true, hovered: "", locked: pinned()?.outerHTML ?? "" });
			armyToggle()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			await frame();
		}
		if (pinned()) activate(pill);
		await frame();
		tooltips.push(...cases);
	}
	holder.remove();
	return { age: GameInfo.Ages.lookup(Game.age)?.AgeType ?? "", styles, topBar, ribbon, tooltips };
})()
