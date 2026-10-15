// Which mod these scripts run in. The scripts are shared with Pablo's Top
// Bar and Tooltips, whose build puts its own copy of this file in their
// place (mod/top-bar-tooltips/ui/hud-overhaul-edition.js).

// True in the full HUD Overhaul. False in the top bar mod, which has only
// the top bar's pills and tooltips, and only their sizes as parts.
export const FULL = true;

// This mod's key in localStorage's "modSettings" entry.
export const SETTINGS_KEY = "hud-overhaul";

// Each part's size at 100% on its slider, by size, where it is not 1.
export const BASE_SIZES = {};
