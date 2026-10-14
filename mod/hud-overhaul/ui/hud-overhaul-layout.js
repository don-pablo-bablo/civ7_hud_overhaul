// HUD Overhaul: lays out the world view more like Civ VI, and adds the
// option that turns the whole mod off, to show the game's own HUD, and on
// again. The switch itself is in hud-overhaul-settings.js.
//
// Every change is a rule in one stylesheet in <head>. The game rebuilds the
// HUD from <template class="world"> on every view change
// (ViewManager.loadViewTemplate in core/ui/views/view-manager.js), but <head>
// is not rebuilt, so the rules keep applying.
//
// Sizes are px at 1080p converted to rem (1rem = 18px there), so they scale
// with the game's UI. They were measured in game with tools/live/measure.js.
// Text sizes are px at the game's Small text size, and move with the
// player's text size; the stylesheet is rebuilt when it changes. Each part
// is drawn at the size the player picks against these, with size() from
// hud-overhaul-settings.js, and rebuilt when that changes too.
//
// Log and bail, never throw: a throw during load takes other scripts with it.

import { addOptions, enabled, onPart, onSize, onTextSize, OPTION_GROUPS, partOn, setEnabled, setStyle, size, textOffset } from "./hud-overhaul-settings.js";

(() => {
	const TAG = "[hud-overhaul]";
	// Bump on every edit to this file. UI.log then shows which build ran.
	const BUILD = "20";
	const rem = (px) => `${(px / 18).toFixed(4)}rem`;
	// Text: px at the game's Small text size, moved by the player's.
	const text = (px) => rem(px + textOffset());
	// Each against stock, at the player's 100%.
	const DIAL = 0.8; // the turn dial
	const MAP = 0.8; // the minimap
	const NOTIFICATIONS = 0.75; // the notifications

	// The dock row: the age, tech and civic rings and the screen buttons share
	// one centre line, with the same gap between the bright rims of every
	// circle.
	//
	// Unscaled, a ring is a 128px box with its visible circle centred in it
	// and the rest of its art transparent. The age ring's progress arc makes
	// its circle bigger. A button is a 52px box whose bright rim is 50px
	// across, inside a dark edge. Sizes were measured from screenshots.
	// The rings' parts have fixed sizes, so a ring is scaled as a whole and
	// margins set the space it takes.
	//
	// The button inside each ring carries the ring's class too (ring-tech
	// and so on), so the rules name the ring by .ssb__element. Rules on the
	// bare class scaled the button a second time and pushed its art off
	// centre with the ring's margins.
	//
	// At the player's dock size, k, everything here grows by k.
	function dockRules(k) {
		const SCALE = 0.75 * k; // ring size against stock
		const BUTTON = 0.85 * k; // button size against stock
		const GOV = (48 / 54) * k; // BZ Ready or Not's policies ring: its icon at the rings' 48px
		const CIRCLE = { age: 83, tech: 75.5, culture: 75.5 }; // visible, unscaled
		const GAP = 4 * k; // between rims
		const RIM = 1; // from a button's box to its rim, unscaled
		const LEFT = 12.6 * SCALE; // from the screen edge to the first circle: its art reaches past it
		const MARKERS = 8 * SCALE; // the age ring's crisis markers reach past its circle
		const TOP = 12 * k; // from the top bar to the top of the biggest circle
		const COUNTER = 18 * k; // room under the rings for their turn counters

		const half = 64 * SCALE; // from a ring box's corner to its centre
		const biggest = Math.max(...Object.values(CIRCLE)) * SCALE;
		const centre = TOP + biggest / 2;
		const top = centre - half;
		const bottom = centre + biggest / 2 + COUNTER - top - 128;
		const buttonTop = centre - 26 * BUTTON; // a button's 52px box on the same line
		// A button is scaled from its top left corner but laid out at 52px,
		// so its right margin takes back the space it no longer fills.
		const buttonLead = GAP / 2 - RIM * BUTTON;
		const buttonTrail = GAP / 2 + (50 + RIM) * BUTTON - 52;

		// A ring's slot in the row is its circle plus one gap. The box is laid
		// out unscaled, so lead and trail margins trim it down to the slot.
		const rings = Object.keys(CIRCLE).map((ring, index, list) => {
			const circle = CIRCLE[ring] * SCALE;
			let lead = circle / 2 - half;
			let trail = circle + GAP - (circle / 2 - half) - 128;
			if (index === 0) {
				lead += LEFT;
				trail += MARKERS;
			}
			// The first button's circle starts half a gap into its slot.
			if (index === list.length - 1) trail -= GAP / 2;
			return `.harness panel-sub-system-dock .ssb__element.ring-${ring} {
				margin: ${rem(top)} ${rem(trail)} ${rem(bottom)} ${rem(lead)};
			}`;
		});

		return `
			.harness panel-sub-system-dock .ssb__element.ring-age,
			.harness panel-sub-system-dock .ssb__element.ring-tech,
			.harness panel-sub-system-dock .ssb__element.ring-culture {
				transform: scale(${SCALE});
				transform-origin: 0 0;
			}
			${rings.join("\n")}
			.harness panel-sub-system-dock .sub-system-dock--button-container {
				padding-bottom: ${rem(4)};
			}
			.harness panel-sub-system-dock .ssb__button.ssb__element {
				transform: scale(${BUTTON});
				transform-origin: 0 0;
				margin: ${rem(buttonTop)} ${rem(buttonTrail)} 0 ${rem(buttonLead)};
			}
			/* BZ Ready or Not makes the policies button a ring of its own: a
			   52px box with a 54px icon, and its counter in a smaller font
			   lower down. It is drawn at the rings' icon size, on their centre
			   line and spaced as they are, and its counter is sized and set
			   as theirs. Measured in game. */
			.harness panel-sub-system-dock .ssb__element.ring-gov {
				transform: scale(${GOV});
				transform-origin: 50% 50%;
				margin: ${rem(18 * k)} ${rem(11 * k)} ${rem(6 * k)} ${rem(4 * k)};
			}
			.harness panel-sub-system-dock .ssb__element.ring-gov .ssb-button__turn-counter-content {
				font-size: ${rem(((18 + textOffset()) * SCALE) / GOV)};
				margin-top: ${rem(7.875)};
			}
			/* The rings and buttons are scaled, and their counters with them.
			   The buttons' counters are sized to match the rings'. */
			.harness panel-sub-system-dock .ssb__button .ssb-button__turn-counter-content {
				font-size: ${rem(((18 + textOffset()) * SCALE) / BUTTON)};
			}
		`;
	}

	const styles = () => {
		const round = (value) => Math.round(value * 10000) / 10000;
		const dial = round(DIAL * size("dial"));
		const map = round(MAP * size("minimap"));
		const notifications = round(NOTIFICATIONS * size("notifications"));
		const column = size("tracker");
		// Each part's rules, while it is on (partOn in hud-overhaul-settings.js).
		const dockCss = `
		/* Plates behind the dock and the column, as Civ VI has behind its
		   launch bar and World Tracker. The column is the Journal's row with
		   the World Tracker put first in it (hud-overhaul-tracker.js), so the
		   two share one plate. Their colour, and the top bar's, is
		   hud-overhaul-theme.js's. */
		.harness panel-sub-system-dock,
		.harness .hud-overhaul-column {
			border-bottom-right-radius: ${rem(12)};
			/* No shadow: through see-through plates, one plate's shadow shows
			   as a dark band across the top of the plate below. */
		}
		.harness panel-sub-system-dock { padding-right: ${rem(4)}; }
		/* Lens legends, in the dock's row, over the column. */
		.harness .hud-overhaul-dock-row { z-index: 1; }
		.harness .hud-overhaul-column {
			flex-direction: column;
			align-self: flex-start;
			align-items: flex-start;
		}
		/* At the player's size for the World Tracker and the Journal, from
		   its top left corner. Nothing is laid out below it. */
		${column === 1 ? "" : `.harness .hud-overhaul-column { transform: scale(${column}); transform-origin: 0 0; }`}
		/* The Journal: the World Tracker's width and padding, flush under it. */
		.harness quest-list {
			position: relative;
			width: ${rem(199 + 4 * textOffset())};
			margin-top: 0;
			padding: ${rem(5)} ${rem(10)} ${rem(8)} ${rem(10)};
		}
		/* The +/- toggle moves from a strip on the left into the heading's
		   right end. The strip's art goes. */
		.harness quest-list .quest-list__expand-container {
			position: absolute;
			top: ${rem(5)};
			right: ${rem(8)};
			width: auto;
			margin: 0;
		}
		.harness quest-list .quest-list__img-questext { display: none; }
		.harness quest-list fxs-minus-plus { top: 0; }
		/* Stock hides the +/- with one quest; here collapsed hides that one
		   too, so the button is wanted. With none the Journal is gone. */
		.harness quest-list fxs-minus-plus.invisible { visibility: visible; }
		.harness quest-list .quest-item-container { flex: auto; min-width: 0; }
		/* The quest list shrinks to fit under the heading. Stock gives it
		   the whole Journal's height, so it ran past the bottom. */
		.harness quest-list .quest-item-container > fxs-scrollable {
			max-height: none;
			min-height: 0;
			flex-shrink: 1;
		}
		/* Headed as the World Tracker is. */
		.harness quest-list .quest-item-container > .font-title-lg {
			font-size: ${text(11)};
			line-height: ${rem(18)};
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: #a8936a;
			margin-bottom: ${rem(2)};
		}
		.harness quest-list .quest-item-list { padding-right: 0; }
		/* Rows ruled off as the tracker's are. */
		.harness quest-list quest-item {
			padding: ${rem(5)} ${rem(3)};
			border-top: ${rem(1)} solid rgba(255, 255, 255, 0.06);
		}
		/* No quests, no Journal: the World Tracker ends the column. */
		.harness quest-list.hud-overhaul-empty { display: none; }
		/* Collapsed hides every quest. The game keeps the selected one. */
		.harness quest-list.hud-overhaul-collapsed quest-item { display: none; }
		.harness quest-list .quest-item-info-text {
			/* Wraps inside the plate rather than running past it. */
			flex: 1 1 0;
			min-width: 0;
			max-width: 100%;
			font-size: ${text(12)};
		}
		/* Each quest's title, 16px in stock. */
		.harness quest-list quest-item .text-sm {
			font-size: ${text(13)};
			margin-bottom: ${rem(2)};
		}

		/* The numbers under the rings and the government button sit straight
		   on the plate, as the age ring's does. Stock gives the tech and
		   civic rings a dark tab, drawn into the bottom fifth of their art,
		   and the celebration counter a banner and 50% grey; on a coloured
		   plate both read as smudges. The tab is clipped off. */
		.harness panel-sub-system-dock fxs-ring-meter .ssb__button-iconbg {
			clip-path: inset(0 0 21% 0);
		}
		.harness panel-sub-system-dock .sub-system-dock--golden-age-timer-bg {
			background-color: transparent;
		}
		/* Stock hangs the celebration counter lower than the others. Placed
		   as the rings' counters are, its number sits level with theirs. */
		.harness panel-sub-system-dock .ssb-button__turn-counter_policies-celebration {
			top: ${rem(38)};
			width: ${rem(25)};
			height: ${rem(18)};
			border-image-source: none;
		}
		.harness panel-sub-system-dock .ssb-button__turn-counter_policies-celebration .ssb-button__turn-counter-content {
			position: relative;
			top: ${rem(4.5)};
		}

		/* Flush to the screen edges and the top bar. */
		.harness panel-sub-system-dock { margin-top: 0; }
		.harness quest-list { margin-left: 0; }
		${dockRules(size("dock"))}
	`;
		const minimapCss = `
		/* The minimap is drawn at MAP of its size, times the player's, from its bottom left
		   corner. Its frame art starts 12px inside its box, so the box goes
		   past the left and bottom edges by that, scaled. */
		.harness panel-mini-map {
			transform: scale(${map});
			transform-origin: 0 100%;
			margin-left: ${rem(-12 * map)};
			margin-bottom: ${rem(-12 * map)};
		}
	`;
		const dialCss = `
		/* Flush to the screen edge, beside the dial. */
		.harness unit-actions { margin-bottom: 0; }
		/* The turn dial is drawn at DIAL of its size, times the player's, from its bottom right
		   corner. Its ring is about 218px across, centred in a 256px box, so
		   the box goes past the right and bottom edges by 18px, scaled. The
		   box is still laid out at 256px, so its left margin takes back the
		   space it no longer fills, and the unit panel beside it moves along. */
		.harness panel-action {
			transform: scale(${dial});
			transform-origin: 100% 100%;
			margin-right: ${rem(-18 * dial)};
			margin-bottom: ${rem(-18 * dial)};
			margin-left: ${rem(-256 * (1 - dial))};
		}
		/* The notifications' gold bracket meets the dial's gold line, so they
		   move 18px right with the dial, and 3.5px more, measured at 4K:
		   stock holds them 32px in. They sit on top of the dial's row, and
		   the dial's top now comes down by the space it no longer fills,
		   less the 18px its row still keeps, so they come down by that from
		   stock's 8px. They are drawn at NOTIFICATIONS of their size, times
		   the player's, from their bottom right corner. */
		.harness panel-notification-train {
			margin-right: ${rem(10.5)};
			margin-bottom: ${rem(8 - (256 - 18) * (1 - dial))};
			transform: scale(${notifications});
			transform-origin: 100% 100%;
		}
	`;
		return `
		/* The top bar's text is 15px, not the game's 18px. The entries
		   carry the game's text-base class, so the rule names the bar's
		   content to outrank it. */
		panel-yield-banner .panel-yield__top-bar-content yield-bar-entry {
			font-size: ${text(15)};
		}
		/* Top right: the turn, date, age and clock sit close to the help
		   and menu buttons, with a bar either side of the clock as between
		   the turn and the date. The Legends button goes: the main menu has it. */
		panel-system-bar .ps-content-wrapper > .font-title {
			font-size: ${text(15)};
			margin-right: 0;
		}
		panel-system-bar .ps-content-wrapper > .font-title > .mx-2 {
			margin-left: ${rem(6)};
			margin-right: ${rem(6)};
		}
		panel-system-bar .ps-turn-age-icon {
			width: ${rem(24)};
			height: ${rem(24)};
			margin-left: ${rem(4)};
		}
		panel-system-bar #ps-clock {
			display: flex;
			font-size: ${text(15)};
		}
		panel-system-bar #ps-clock::before,
		panel-system-bar #ps-clock::after {
			content: "|";
			margin: 0 ${rem(6)};
		}
		/* The buttons' icons sit inside wider boxes. */
		panel-system-bar #ps-icons .ps-btn { margin-left: ${rem(-6)}; }
		/* The menu's three lines look bigger than the help book beside it. */
		panel-system-bar .ps-bar-pause .ps-btn-icon { transform: scale(0.85); }
		panel-system-bar #metaprogression { display: none; }

		${partOn("dock") ? dockCss : ""}
		${partOn("minimap") ? minimapCss : ""}
		${partOn("dial") ? dialCss : ""}
	`;
	};

	function addOption() {
		return addOptions(OPTION_GROUPS.GENERAL, (OptionType) => [
			{
				type: OptionType.Checkbox,
				id: "hud-overhaul-option-enabled",
				label: "LOC_HUD_OVERHAUL_OPTION_ENABLED",
				description: "LOC_HUD_OVERHAUL_OPTION_ENABLED_DESCRIPTION",
				initListener: (info) => {
					info.currentValue = enabled();
				},
				updateListener: (info, value) => {
					info.currentValue = !!value;
					try {
						setEnabled(!!value);
					} catch (error) {
						console.error(`${TAG} cannot save setting: ${error}`);
					}
				},
			},
		]);
	}

	// The Journal's +/- button shows "plus" while collapsed. Mirror that onto
	// the Journal, so the styles can hide the one quest the game leaves out.
	// The game sets the button's type on every Journal update, and in the
	// same pass marks its side strip invisible when there are no quests, so
	// that is read here too. Only "type" attributes are watched, so this
	// stays cheap.
	function watchJournal() {
		const sync = (button) => {
			const list = button.closest("quest-list");
			if (!list) return;
			list.classList.toggle("hud-overhaul-collapsed", button.getAttribute("type") === "plus");
			const strip = list.querySelector(".quest-list__img-questext");
			const empty = !!strip && strip.classList.contains("invisible");
			list.classList.toggle("hud-overhaul-empty", empty);
		};
		new MutationObserver((records) => {
			for (const record of records) {
				if (record.target.tagName === "FXS-MINUS-PLUS") sync(record.target);
			}
		}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["type"] });
		for (const button of document.querySelectorAll("quest-list fxs-minus-plus")) sync(button);
	}

	// Stock caps the Journal at 600px. It may instead reach down to the
	// minimap's lens button, the highest part of the minimap, so it scrolls
	// only when that room is full. The room changes with the World Tracker
	// above it, so it is measured twice a second. It is set on the element,
	// as max-height here does not take var(). The room is measured on screen,
	// and the column is drawn at the player's size, so it is divided by that.
	const JOURNAL_GAP = 10; // px at 1080p: the plate's bottom padding and a gap
	function fitJournal() {
		const list = document.querySelector(".harness quest-list .quest-item-container");
		if (!list) return;
		const map = document.querySelector(".harness panel-mini-map .mini-map__lens-button");
		if (!enabled() || !partOn("dock") || !map) {
			list.style.maxHeight = "";
			return;
		}
		const gap = (JOURNAL_GAP * window.innerHeight) / 1080;
		const room = (map.getBoundingClientRect().top - list.getBoundingClientRect().top - gap) / size("tracker");
		list.style.maxHeight = `${Math.max(200, Math.floor(room))}px`;
	}

	try {
		const restyle = () => setStyle("hud-overhaul-styles", styles());
		restyle();
		onTextSize(restyle);
		onSize(["dial", "minimap", "notifications", "tracker", "dock"], restyle);
		onPart(["dock", "minimap", "dial"], restyle);
		watchJournal();
		setInterval(() => {
			try {
				fitJournal();
			} catch (error) {
				console.error(`${TAG} journal: ${error}`);
			}
		}, 500);
		addOption().catch((error) => console.error(`${TAG} option not added: ${error}`));
		console.error(`${TAG} loaded, civ7lab:build layout ${BUILD}`);
	} catch (error) {
		console.error(`${TAG} ${error}`);
	}
})();
