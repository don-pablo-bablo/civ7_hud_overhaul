// The tooltips mock: each pill's tooltip as the game drew it, from
// tools/mock/captured.js, hovered beside locked. Browser only.
//
// Hovered, it sits in a copy of the game's tooltip frame, as wide as the
// frame the tooltips script widens for a wide panel. Locked, it is the
// locked tooltip as captured, taken out of the place it had on screen.

const FRAME = "new-tooltip--root max-w-96 p-3 img-tooltip-border img-tooltip-bg hud-overhaul-mock-frame";
const rem = (px) => `${(px / 18).toFixed(4)}rem`;

export function render(fixture) {
	const row = document.createElement("div");
	row.className = "hud-overhaul-mock-tips";
	if (fixture.hovered) {
		const frame = document.createElement("div");
		frame.className = FRAME;
		frame.innerHTML = fixture.hovered;
		// As hud-overhaul-tooltips.js widens the game's frame: the panel
		// and the frame's padding on each side.
		if (frame.querySelector(".hud-overhaul-tip-wide")) frame.style.maxWidth = rem(380 + 12 * 2);
		row.append(frame);
	}
	if (fixture.locked) {
		const holder = document.createElement("div");
		holder.innerHTML = fixture.locked;
		const locked = holder.firstElementChild;
		locked.style.position = "relative";
		locked.style.left = "";
		locked.style.top = "";
		row.append(locked);
	}
	return row;
}
