// Read only. Where each HUD component sits in the running game, and which
// slot holds it. Run with: civ7lab live eval --file tools/live/measure.js
(() => {
	const TAGS = [
		"panel-yield-banner", "panel-system-bar", "panel-diplo-ribbon",
		"panel-sub-system-dock", "quest-list", "panel-mini-map",
		"unit-actions", "army-panel", "panel-action", "panel-notification-train",
	];
	const box = (node) => {
		const r = node.getBoundingClientRect();
		return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
	};
	const harness = document.querySelector(".harness");
	const out = {
		window: [window.innerWidth, window.innerHeight],
		rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
		harness: harness ? box(harness) : null,
		harnessClass: harness ? harness.className : null,
		components: {},
	};
	for (const tag of TAGS) {
		const found = document.querySelectorAll(tag);
		if (!found.length) {
			out.components[tag] = "missing";
			continue;
		}
		const node = found[0];
		const slot = node.closest("fxs-slot");
		const style = getComputedStyle(node);
		out.components[tag] = {
			count: found.length,
			rect: box(node),
			slot: slot ? slot.getAttribute("name") : null,
			margin: style.margin,
			display: style.display,
		};
	}
	return out;
})();
