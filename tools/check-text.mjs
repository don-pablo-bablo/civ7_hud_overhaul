// Checks the mods' text keys. Run from the repo root:
//
//   node tools/check-text.mjs                 the checks CI runs
//   node tools/check-text.mjs --game <path>   and the checks against the game
//   node tools/check-text.mjs --game <path> --write
//
// Every key the scripts use must have text: the mods' own, in their text
// files, or the game's, listed by name in tools/game-keys.txt. Every key of
// the mods' own must be used.
//
// With the game (its resources folder, or ./reference when it links there),
// also:
//
// - each game key the scripts use must still be in the game, and
//   tools/game-keys.txt must list exactly those (--write rewrites it);
// - text of the mods' own that the game has too must be switched to the
//   game's key, which the game translates, or kept on purpose in
//   tools/own-text.txt;
// - the game's yield labels that have no text are listed. The tooltips show
//   them as Other.

import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEXT = ["mod/hud-overhaul/text/en_us/InGameText.xml", "mod/top-bar-tooltips/text/en_us/TopBarText.xml"];
const CODE = ["mod/hud-overhaul", "mod/top-bar-tooltips"];
const GAME_KEYS = "tools/game-keys.txt";
const OWN_TEXT = "tools/own-text.txt";

const args = process.argv.slice(2);
const write = args.includes("--write");
const at = args.indexOf("--game");
const gamePath = at >= 0 ? args[at + 1] : existsSync("reference/Base") ? "reference" : null;

const errors = [];
const fail = (message) => errors.push(message);

function files(dir, test, list = []) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) files(path, test, list);
		else if (test(path)) list.push(path);
	}
	return list;
}

// Lines of a list file, without comments and blank lines; the first word
// of each.
function listFile(path) {
	if (!existsSync(path)) return [];
	return readFileSync(path, "utf8")
		.split("\n")
		.map((line) => line.replace(/#.*/, "").trim().split(/\s+/)[0])
		.filter(Boolean);
}

// The mods' own text: key to English text.
const own = new Map();
for (const file of TEXT) {
	for (const [, key, language, text] of readFileSync(file, "utf8").matchAll(/<Replace Tag="(LOC_[A-Za-z0-9_]+)" Language="([^"]+)">\s*<Text>([\s\S]*?)<\/Text>/g)) {
		if (language != "en_US") fail(`${file}: ${key} is in ${language}; the mods have English text only`);
		// Top Bar and Tooltips' file replaces some of HUD Overhaul's.
		if (own.has(key) && file == TEXT[0]) fail(`${file}: ${key} is there twice`);
		own.set(key, text);
	}
}

// The keys the scripts use, by file. A key the script finishes, such as
// `LOC_UI_CITY_DETAILS_${stage}` or "LOC_UI_CITY_DETAILS_" + stage, counts
// as its start with a *. The modinfos' titles are the game's module names,
// which it does not look up as text.
const used = new Map();
const use = (key, file) => used.set(key, used.get(key) ?? file);
for (const file of CODE.flatMap((dir) => files(dir, (path) => path.endsWith(".js")))) {
	const source = readFileSync(file, "utf8");
	for (const [, key] of source.matchAll(/["'`](LOC_[A-Za-z0-9_]+)["'`]/g)) use(key.endsWith("_") ? `${key}*` : key, file);
	for (const [, start] of source.matchAll(/`(LOC_[A-Za-z0-9_]*)\$\{/g)) use(`${start}*`, file);
	// The game names an option group's heading LOC_OPTIONS_GROUP_ and the
	// group in capitals.
	const groups = source.match(/OPTION_GROUPS = \{([^}]*)\}/)?.[1] ?? "";
	for (const [, group] of groups.matchAll(/"([a-z0-9_]+)"/g)) use(`LOC_OPTIONS_GROUP_${group.toUpperCase()}`, file);
}

let gameKeys = new Set(listFile(GAME_KEYS));
const fromGame = [...used.keys()].filter((key) => !own.has(key)).sort();
for (const key of own.keys()) {
	// A game key the mods give text, such as one the game leaves without.
	if (!key.includes("HUD_OVERHAUL")) continue;
	if (!used.has(key)) fail(`${key} has text but no script uses it`);
}

if (gamePath) checkGame(realpathSync(gamePath));
for (const key of fromGame) {
	if (!gameKeys.has(key)) fail(`${used.get(key)}: ${key} has no text in the mods, and ${GAME_KEYS} does not list it as the game's`);
}

for (const message of errors) console.error(message);
console.log(`${used.size} keys used, ${own.size} of the mods' own, ${fromGame.length} the game's${gamePath ? `; checked against ${gamePath}` : ""}`);
if (errors.length) process.exit(1);

function checkGame(root) {
	// The English text a game loads: what each module's modinfo lists for
	// scope="game". The main menu's, such as the Hall of Fame's, is missing
	// in a game.
	const textFiles = [];
	for (const modinfo of files(root, (path) => path.endsWith(".modinfo"))) {
		for (const [, group] of readFileSync(modinfo, "utf8").matchAll(/<ActionGroup [^>]*scope="game"[^>]*>([\s\S]*?)<\/ActionGroup>/g)) {
			for (const [, block] of group.matchAll(/<UpdateText>([\s\S]*?)<\/UpdateText>/g)) {
				for (const [, item] of block.matchAll(/<Item>([^<]+)<\/Item>/g)) {
					const path = join(modinfo, "..", item.trim());
					if (!path.includes("/l10n/") && existsSync(path)) textFiles.push(path);
				}
			}
		}
	}
	const translated = files(root, (path) => path.endsWith(".xml") && path.includes("/l10n/"));
	// The game's English text, key to text.
	const game = new Map();
	for (const file of textFiles) {
		for (const [, key, text] of readFileSync(file, "utf8").matchAll(/<(?:Row|Replace)\s+Tag=["'](LOC_[A-Za-z0-9_]+)["'][^>]*>\s*<Text>([\s\S]*?)<\/Text>/g)) {
			if (!game.has(key)) game.set(key, text);
		}
	}
	// Keys with a translation in any language.
	const inOther = new Set();
	for (const file of translated) for (const [, key] of readFileSync(file, "utf8").matchAll(/Tag=["'](LOC_[A-Za-z0-9_]+)["']/g)) inOther.add(key);

	const has = (key) => (key.endsWith("*") ? [...game.keys()].some((k) => k.startsWith(key.slice(0, -1))) : game.has(key));
	for (const key of fromGame) if (!has(key)) fail(`${used.get(key)}: ${key} is not in the game`);
	const list = fromGame.filter(has);
	const stale = list.join("\n") != [...gameKeys].sort().join("\n");
	if (write) {
		writeFileSync(GAME_KEYS, `# The game's text keys the scripts use, written by tools/check-text.mjs --write.\n${list.join("\n")}\n`);
		console.log(`${GAME_KEYS}: ${list.length} keys`);
		gameKeys = new Set(list);
	} else if (stale) {
		fail(`${GAME_KEYS} is out of date: run node tools/check-text.mjs --game ${gamePath} --write`);
	}

	// Our text that the game has as well, by its words alone: icons, bold and
	// a full stop at the end do not count.
	const words = (text) => text.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim().replace(/[.:]$/, "").toLowerCase();
	const byWords = new Map();
	for (const [key, text] of game) {
		const w = words(text);
		if (w) byWords.set(w, [...(byWords.get(w) ?? []), key]);
	}
	const kept = new Set(listFile(OWN_TEXT));
	for (const [key, text] of own) {
		if (!key.includes("HUD_OVERHAUL") || kept.has(key)) continue;
		const matches = (byWords.get(words(text)) ?? []).filter((k) => inOther.has(k));
		if (!matches.length) continue;
		// Same case first, then the game's own screens before its
		// Civilopedia and tutorials.
		const rank = (k) => (game.get(k).trim() == text.trim() ? 0 : 2) + (/^LOC_(PEDIA|TUTORIAL|ADVICE|HOF|CARD|LEADER_CHAIN)/.test(k) ? 1 : 0);
		matches.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
		const shown = matches.slice(0, 3).map((k) => `${k} "${game.get(k).trim()}"`).join(", ");
		fail(`${key} "${text.trim()}" is the game's text too: use ${shown}${matches.length > 3 ? ` or ${matches.length - 3} more` : ""}, or keep it in ${OWN_TEXT}`);
	}
	for (const key of kept) if (!own.has(key)) fail(`${OWN_TEXT}: ${key} is not one of the mods' keys`);

	// The game's yield labels with no text.
	const labels = new Set();
	for (const file of files(root, (path) => path.endsWith(".xml") && path.includes("/data/"))) {
		for (const [, key] of readFileSync(file, "utf8").matchAll(/<Argument name="Tooltip">(LOC_[A-Za-z0-9_]+)</g)) labels.add(key);
	}
	const missing = [...labels].filter((key) => !game.has(key)).sort();
	if (missing.length) {
		console.log(`The game's labels with no text, shown as Other unless the mods give them text (${missing.length}):`);
		for (const key of missing) console.log(`  ${key}${own.has(key) ? ": the mods give it text" : ""}`);
	}
}
