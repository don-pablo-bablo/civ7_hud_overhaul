// Which mod these scripts run in: this is Pablo's Top Bar and Tooltips. The
// full HUD Overhaul has its own copy of this file
// (mod/hud-overhaul/ui/hud-overhaul-edition.js).

// False here: only the top bar's pills and tooltips, and only their sizes
// as parts.
export const FULL = false;

// This mod's key in localStorage's "modSettings" entry, apart from the full
// mod's, so that its off switch and parts do not carry over.
export const SETTINGS_KEY = "top-bar-tooltips";

// Each part's size at 100% on its slider, by size, where it is not 1. The
// tooltips start at what is 125% in HUD Overhaul, to sit with the game's own
// top bar.
export const BASE_SIZES = { tooltips: 1.25 };
